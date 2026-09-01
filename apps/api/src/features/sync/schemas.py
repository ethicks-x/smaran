"""The sync wire format.

Every field here is a fact the device already wrote to its own SQLite store and has been
holding since (`apps/mobile/src/db/schema.ts`). The device is the source of truth until a
row lands, so nothing in this module is a request for the server to compute something —
it is a report of things that already happened.

Two conversions live on the wire and only on the wire. Timestamps are ISO 8601 UTC here
and epoch milliseconds on the device (`data-model.md` §3 rule 4); the client does that
conversion as it drains its queue, so this side never sees a millisecond count and cannot
misread one as seconds. And ids are the device's own uuid4s (rule 5), so a row arrives
already identified and the server never mints an id for anything a phone wrote.

`extra="ignore"` on the inbound models is deliberate. A phone updates on its own schedule
and a build newer than this server will send columns this server has never heard of; the
rows it sends are still true, and dropping the whole batch over a field we do not want is
the one outcome the ingest contract forbids (`api-contract.md` §2).
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# One batch is one HTTP request on a phone that may be on a village 2G connection. Large
# enough that a month of backlog drains in a handful of round trips, small enough that a
# failed one is cheap to repeat.
MAX_BATCH = 200

# How many rounds a reinstalled phone gets back. Comfortably more than the window the
# adaptive engine reads (fifty, `lib/game-history.ts`), so the restored history is deeper
# than anything that reads it — and bounded, because a patient with two years of play must
# not turn one reinstall into a multi-megabyte response over a 2G connection.
RESTORE_LIMIT = 200


class _Inbound(BaseModel):
    model_config = ConfigDict(extra="ignore")


class SessionIn(_Inbound):
    """One round of one game, as the device measured it.

    `SessionStats` in `apps/mobile/src/lib/game-stats.ts`, field for field, plus the two
    columns storage adds: the row's id and the device sequence number that makes it
    idempotent. There is no score and no benchmark — a row is only ever read against the
    same patient's other rows (`AGENTS.md` §2.4).
    """

    id: UUID
    # From the device's monotonic counter, shared with reminder events so the two streams
    # cannot collide on `(device_id, seq)`.
    seq: int = Field(ge=0)
    game_id: str = Field(max_length=50)
    difficulty: int = Field(ge=0)
    started_at: datetime
    ended_at: datetime
    duration_ms: int = Field(ge=0)
    time_on_task_ms: int = Field(ge=0)
    attempts: int = Field(ge=0)
    correct: int = Field(ge=0)
    total: int = Field(ge=0)
    # False for a board that was put down. Stored the same way, never penalised.
    completed: bool
    accuracy: float
    # Null when the game has no floor on attempts to measure against.
    precision: float | None = None
    completion: float
    avg_response_ms: int = Field(ge=0)
    median_response_ms: int = Field(ge=0)
    # Null under two attempts, where there is no spread to measure.
    consistency: float | None = None
    longest_streak: int = Field(ge=0)


class ReminderEventIn(_Inbound):
    """What happened when a reminder came due. Adherence is computed from these."""

    id: UUID
    seq: int = Field(ge=0)
    # A real uuid, but not necessarily one this server has a `reminders` row for: every
    # reminder is device-created today (D-25) and an event is evidence that has to land
    # whether or not its definition ever synced up.
    reminder_id: UUID
    due_at: datetime
    # Null for `missed` — a missed reminder was never acknowledged, which is what missed
    # means.
    acknowledged_at: datetime | None = None
    outcome: Literal["done", "snoozed", "missed"]


class _BatchIn(_Inbound):
    # The device's own id, generated once at first launch and never regenerated
    # (`src/db/client.ts`). The `device_id` half of the idempotency key.
    device_id: UUID
    # Diagnostic only, and the one thing here that is about the software rather than the
    # reader: it is how a caregiver-side oddity gets traced to a build.
    app_version: str | None = Field(default=None, max_length=32)


class SessionBatchIn(_BatchIn):
    sessions: list[SessionIn] = Field(max_length=MAX_BATCH)


class ReminderEventBatchIn(_BatchIn):
    events: list[ReminderEventIn] = Field(max_length=MAX_BATCH)


class ReminderPull(_Inbound):
    """A reminder definition on its way **down** to a phone.

    Server-authoritative, so there is nothing to merge and no conflict to resolve
    (`data-model.md` §3 rule 2): the device replaces what it has with this and moves on.

    `deleted` is the whole reason this endpoint takes a watermark. A caregiver retiring a
    reminder has to reach a phone that was switched off when they did it, and a row that
    simply stopped existing is invisible to "what changed since Tuesday" — so the row stays,
    carries a `deleted_at`, and arrives here as an instruction to forget it.

    `title` and `detail` are already in the reader's language. The device shows them as they
    are and never translates them (D-12 is about the app's own copy, not a caregiver's).
    """

    id: UUID
    kind: str
    title: str
    detail: str | None = None
    # `HH:MM|1111111`. A string the phone cannot parse is skipped rather than guessed at.
    schedule: str
    active: bool
    # When true, every other field is the last thing we knew about a row that is now gone.
    deleted: bool = False


class SessionPull(_Inbound):
    """One historical round on its way back down to a phone that lost its history.

    `SessionIn` without `seq` — and the omission is the point. A sequence number belongs to
    the device that issued it, and a phone reading this list has either never had that
    number or has forgotten it along with everything else. These rows come back as somebody
    else's facts about this reader: kept, read by the adaptive engine, and never re-sent.
    """

    id: UUID
    game_id: str
    difficulty: int
    started_at: datetime
    ended_at: datetime
    duration_ms: int
    time_on_task_ms: int
    attempts: int
    correct: int
    total: int
    completed: bool
    accuracy: float
    precision: float | None = None
    completion: float
    avg_response_ms: int
    median_response_ms: int
    consistency: float | None = None
    longest_streak: int


class PullOut(BaseModel):
    """Everything that changed since the device last asked.

    One endpoint rather than three, because a phone gets one unreliable moment of
    connectivity and should spend it on a single round trip. Collections are named, so a
    device that has never heard of a future one simply ignores it and a server that has
    nothing to say sends an empty list — neither is a version negotiation.
    """

    # The server's own clock at the moment of the read, and the value the device sends back
    # as `since` next time. Never the device's clock: a phone whose date is wrong by hours
    # would otherwise skip a window of changes or ask for the same ones forever.
    synced_at: datetime
    reminders: list[ReminderPull] = Field(default_factory=list)
    # Only ever populated when the device asked to be restored. An established phone gets an
    # empty list, because it already holds every round it has played.
    sessions: list[SessionPull] = Field(default_factory=list)
    # True when the restore hit `RESTORE_LIMIT` and older rounds exist that were not sent.
    # The engine reads a recent window (`DEFAULT_LIMIT` in `lib/game-history.ts`), so this
    # is an honesty flag rather than a paging cursor — nothing yet asks for the rest.
    sessions_truncated: bool = False


class RejectedItem(BaseModel):
    """A row this server will never be able to store, and why.

    Named rather than silently dropped, and named rather than fatal to the batch: the
    client deletes exactly these from its queue and keeps everything else. `reason` is a
    plain-language string about the *row*, never about the person — nothing patient-
    identifying goes in a response the way it goes in no log line (`AGENTS.md` §2.5).
    """

    id: UUID
    reason: str


class SyncAckOut(BaseModel):
    """What the server did with a batch.

    A client advances only on this response. `duplicates` is a success, not a warning —
    it is what a retried batch is supposed to produce, and a batch that is entirely
    duplicates means the previous attempt landed and the acknowledgement was what got
    lost.
    """

    accepted: int
    duplicates: int
    rejected: list[RejectedItem] = Field(default_factory=list)
    # The highest sequence number this server holds for the device, across both streams.
    # Diagnostic: the client decides what is still owed from its own queue, never from
    # this number, because the two streams share one counter and a batch of one of them
    # says nothing about the other.
    last_seq: int


__all__ = [
    "MAX_BATCH",
    "RESTORE_LIMIT",
    "PullOut",
    "ReminderPull",
    "SessionPull",
    "ReminderEventBatchIn",
    "ReminderEventIn",
    "RejectedItem",
    "SessionBatchIn",
    "SessionIn",
    "SyncAckOut",
]
