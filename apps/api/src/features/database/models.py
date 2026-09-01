from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Sequence,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PgUuid
from sqlalchemy.orm import Mapped, MappedColumn, mapped_column, relationship

from features.database.db import Base


# Postgres generates the id server-side for raw inserts; the uuid4 default means an ORM
# insert already knows the id and does not need a RETURNING round trip to learn it.
def _pk() -> MappedColumn[UUID]:
    return mapped_column(
        PgUuid(as_uuid=True),
        primary_key=True,
        default=uuid4,
        server_default=text("gen_random_uuid()"),
    )


def _utcnow() -> datetime:
    return datetime.now(UTC)


# Clerk owns identity, so nothing here mirrors a user record — a column that points at a
# person holds Clerk's own id. Those ids are opaque strings ("user_2ab..."), never uuids,
# so the column has to be text; a uuid column would reject every real value.
def _clerk_id() -> String:
    return String(64)


# The Smaran id is what one person reads out to another — a patient gives theirs to the
# family member who is setting the phone up, and the caregiver types it in. So it is nine
# digits and nothing else: no letters to spell out, no case to get wrong, no hyphens to
# mistype, and short enough to say over a phone call in one breath. Postgres owns the
# counter because a sequence is the only way two concurrent sign-ups cannot be handed the
# same number, and it starts at 100,000,000 so the very first one is already nine digits
# wide and no id ever grows a digit.
#
# It is an identifier, not a secret: knowing one gets nobody access, because the link it
# starts arrives as `pending` and stays there until it is approved (see `PatientCaregiver`).
smaran_id_seq = Sequence("smaran_id_seq", start=100_000_000, metadata=Base.metadata)


class Role(Base):
    """A role granted to a Clerk user. `id` is the Clerk user id, not a generated uuid."""

    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(_clerk_id(), primary_key=True)
    # Not unique: a role is held by many people. Indexed because the only query is
    # "who are the caregivers", never "what role is this".
    role: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    # The sequence is passed positionally *and* as the server default for the same reason
    # `_pk()` sets both: the ORM then knows the number it just inserted, and a raw insert
    # that names no `smaran_id` still gets one. `Integer` is deliberate — the ceiling is
    # 2,147,483,647, which is a digit more headroom than a nine-digit id can ever use.
    smaran_id: Mapped[int] = mapped_column(
        Integer,
        smaran_id_seq,
        server_default=smaran_id_seq.next_value(),
        unique=True,
        nullable=False,
    )


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[UUID] = _pk()
    # No foreign key to `roles`: a patient may exist before anyone assigns them a role, and
    # an unenrolled patient has no Clerk account at all.
    user_id: Mapped[str | None] = mapped_column(_clerk_id(), unique=True, nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # Who provisioned the device, as a Clerk id — the caregiver, under the enrollment model
    # the problem statement describes. Nullable because a patient may be created before
    # anyone hands them a phone.
    enrolled_by: Mapped[str | None] = mapped_column(_clerk_id(), nullable=True)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    memory_subjects: Mapped[list[MemorySubject]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    game_sessions: Mapped[list[GameSession]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    casual_play_logs: Mapped[list[CasualPlayLog]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    question_events: Mapped[list[QuestionEvent]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    patient_caregivers: Mapped[list[PatientCaregiver]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    devices: Mapped[list[Device]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    session_events: Mapped[list[SessionEvent]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    reminders: Mapped[list[Reminder]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    reminder_events: Mapped[list[ReminderEvent]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    people: Mapped[list[Person]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    memory_items: Mapped[list[MemoryItem]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class PatientCaregiver(Base):
    __tablename__ = "patient_caregivers"

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    caregiver_id: Mapped[str] = mapped_column(_clerk_id(), index=True, nullable=False)
    # The attribute cannot be called `relationship` — that name is the imported ORM function
    # and shadowing it breaks every relationship() call below it in the class body.
    relation: Mapped[str | None] = mapped_column("relationship", String(100), nullable=True)
    # `pending` · `active` · `revoked`. A row typed in from a Smaran id starts `pending`,
    # so quoting somebody's id at this table grants nothing on its own — only an approval
    # moves it to `active`, and only an `active` row may read a patient's data (§2.5).
    # Revoking sets `revoked` rather than deleting the row, because who once had access and
    # when it ended is exactly the thing a family may need to ask about later.
    status: Mapped[str] = mapped_column(
        String(16), default="pending", server_default=text("'pending'"), nullable=False
    )

    patient: Mapped[Patient] = relationship(back_populates="patient_caregivers")


class MemorySubject(Base):
    __tablename__ = "memory_subjects"

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    relation: Mapped[str | None] = mapped_column("relationship", String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    created_by: Mapped[str | None] = mapped_column(_clerk_id(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    patient: Mapped[Patient] = relationship(back_populates="memory_subjects")
    question_events: Mapped[list[QuestionEvent]] = relationship(
        back_populates="subject", cascade="all, delete-orphan"
    )


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    questions_planned: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    questions_answered: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="game_sessions")
    question_events: Mapped[list[QuestionEvent]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class QuestionEvent(Base):
    __tablename__ = "question_events"

    id: Mapped[UUID] = _pk()
    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("game_sessions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Denormalised from the session so a patient's whole history is one indexed scan —
    # every analytic here is that patient against their own past, never a cohort.
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    subject_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("memory_subjects.id", ondelete="SET NULL"), index=True, nullable=True
    )
    activity: Mapped[str] = mapped_column(String(50), nullable=False)
    n_options: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    time_taken_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hints_used: Mapped[int] = mapped_column(
        SmallInteger, default=0, server_default=text("0"), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    asked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    session: Mapped[GameSession] = relationship(back_populates="question_events")
    patient: Mapped[Patient] = relationship(back_populates="question_events")
    subject: Mapped[MemorySubject | None] = relationship(back_populates="question_events")


class CasualPlayLog(Base):
    __tablename__ = "casual_play_log"

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    game_key: Mapped[str] = mapped_column(String(50), nullable=False)
    played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="casual_play_logs")


# --- The synced half of the schema ------------------------------------------------------
#
# Everything below mirrors a table the patient device already writes
# (`apps/mobile/src/db/schema.ts`, `data-model.md` §1). The two stores are deliberately
# different shapes: the device is denormalised and append-only because it must never block
# on a network call, and this side is normalised, patient-scoped and joined for the
# dashboard's read path.
#
# Three rules run through all of it, and each one is a bug if it is broken:
#
# * **Ids come from the device**, not from here. They are real uuid4s (`newId()` in
#   `src/db/client.ts`), so a row can exist and be pointed at with the radio off
#   (`data-model.md` §3 rule 5). The `_pk()` default only ever applies to a row the
#   server itself creates.
# * **Timestamps are `timestamptz`.** The device stores epoch milliseconds; the wire
#   format is ISO 8601 UTC and the conversion belongs in the sync layer, not here.
# * **Ingest is an upsert on `(device_id, seq)`** (`decisions.md` D-09). Batches will be
#   retried and duplicated, so the unique constraints that key those upserts are load-
#   bearing, not hygiene.
#
# Nothing here holds a name, a photo or an email for a person with a Clerk account —
# `patients` has no display name for the same reason `roles` is the only person-keyed
# table (D-20). The one exception is `people`, whose rows are the patient's family as the
# caregiver typed them in; those are not accounts.


class Device(Base):
    """A phone enrolled to a patient. The `device_id` half of the idempotency key.

    One row per install, created when the device first reaches the server. `id` is the
    uuid the device generated for itself at first launch and never regenerates, so a
    reinstalled app is a new device and starts a new sequence — which is exactly what the
    `(device_id, seq)` key needs it to mean.
    """

    __tablename__ = "devices"

    id: Mapped[UUID] = _pk()
    # Not nullable: the server only ever learns about a device through an authenticated
    # call that has already resolved to a patient. A device with no patient would be a row
    # nothing could ever scope a query by.
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    app_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # The watermark the ingest response reports back, so the client can advance safely.
    # Derivable as max(seq) across both synced streams, but kept as a column because every
    # ingest returns it and no ingest should have to scan a hypertable to answer.
    last_synced_seq: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    patient: Mapped[Patient] = relationship(back_populates="devices")
    session_events: Mapped[list[SessionEvent]] = relationship(
        back_populates="device", cascade="all, delete-orphan"
    )
    reminder_events: Mapped[list[ReminderEvent]] = relationship(
        back_populates="device", cascade="all, delete-orphan"
    )


class SessionEvent(Base):
    """One round of one game, as the device measured it. **Immutable once written.**

    **The name is `data-model.md` §2's and it is a trap worth reading twice.** This is the
    server's copy of the device's `game_session` table — one row per round — and it is
    *not* the device's `session_event` table, which is per-attempt detail that never
    leaves the phone unless a session is flagged for review (`AGENTS.md` §2.5). It is also
    not `game_sessions` above, which is the older caregiver-authored activity record the
    dashboard reads today.

    The columns are `SessionStats` in `apps/mobile/src/lib/game-stats.ts` field for field,
    plus the two the device does not need to store about itself — which patient and which
    device. Raw counts sit beside the ratios on purpose (`data-model.md` §3 rule 3): what
    "accuracy" means will change and the facts underneath it cannot be re-collected.

    There is no score here and no cohort (`AGENTS.md` §2.4). A row is only ever read
    against the same patient's other rows.
    """

    __tablename__ = "session_events"
    __table_args__ = (
        # The idempotency key. `ended_at` is in it only because Timescale requires every
        # unique index on a hypertable to include the partitioning column — a retry sends
        # the queued JSON snapshot byte for byte, so the third column is as deterministic
        # as the other two and the upsert stays exact.
        UniqueConstraint("device_id", "seq", "ended_at", name="session_events_device_seq_key"),
        # The dashboard's read path and the only shape it asks for: one patient, one game,
        # newest first.
        Index("session_events_patient_game_idx", "patient_id", "game_id", "ended_at"),
    )

    # Composite with `ended_at` for the same Timescale reason as above: a hypertable's
    # primary key must contain its time column. Doing it now costs a wider key; doing it
    # after the table has rows costs a rewrite.
    id: Mapped[UUID] = _pk()
    ended_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, nullable=False
    )
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    device_id: Mapped[UUID] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # From the device's own monotonic counter, shared with `reminder_events` so the two
    # streams cannot collide on the key.
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    game_id: Mapped[str] = mapped_column(String(50), nullable=False)
    # The rung of that game's own ladder, counting from one. Chosen by the on-device
    # adaptive engine, recorded here as a fact about the round rather than a setting.
    difficulty: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Wall clock, pauses included.
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    # The same round with the pauses taken out.
    time_on_task_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False)
    correct: Mapped[int] = mapped_column(Integer, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    # False for a board that was put down. Stored the same way, never penalised.
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    accuracy: Mapped[float] = mapped_column(Float, nullable=False)
    # Null when the game has no floor on attempts to measure against. Quoted by SQLAlchemy
    # because `precision` is a keyword in Postgres.
    precision: Mapped[float | None] = mapped_column(Float, nullable=True)
    completion: Mapped[float] = mapped_column(Float, nullable=False)
    avg_response_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    median_response_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    # Null under two attempts, where there is no spread to measure.
    consistency: Mapped[float | None] = mapped_column(Float, nullable=True)
    longest_streak: Mapped[int] = mapped_column(Integer, nullable=False)
    # When the row arrived, on the server's clock. Everything else here is the device's
    # clock, which may be wrong by hours; this is the only column that can say how late a
    # batch was without trusting the phone.
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    patient: Mapped[Patient] = relationship(back_populates="session_events")
    device: Mapped[Device] = relationship(back_populates="session_events")


class Reminder(Base):
    """A reminder definition. Server-authoritative — the device takes what it is given.

    `data-model.md` §3 rule 2: mutable records are owned here and pulled down, so there is
    no conflict to resolve. `updated_at` and `deleted_at` are what a `GET /sync/pull?since=`
    reads — a device that has been off for a week needs to learn about a reminder that was
    switched off as well as one that was added, and a hard delete would be silent.

    Copy is stored already translated, because it is shown *and* spoken to the reader in
    their own language and nothing on the device rewrites it.
    """

    __tablename__ = "reminders"

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # `medicine` · `hydration` · `activity` · `appointment` — the four kinds the device
    # knows how to draw and speak.
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    # `HH:MM|1111111` today — a 24-hour local time and a days mask, Sunday first
    # (`apps/mobile/src/lib/reminders.ts`). Wide enough for the rrule-ish string that
    # `data-model.md` §1 leaves room for.
    schedule: Mapped[str] = mapped_column(String(255), nullable=False)
    active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    created_by: Mapped[str | None] = mapped_column(_clerk_id(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        onupdate=_utcnow,
        index=True,
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="reminders")


class ReminderEvent(Base):
    """What happened when a reminder came due. Adherence is computed from these.

    Syncs up like a session and shares the device's `seq` counter, so the same
    `(device_id, seq)` upsert covers both streams.
    """

    __tablename__ = "reminder_events"
    __table_args__ = (
        UniqueConstraint("device_id", "seq", name="reminder_events_device_seq_key"),
        Index("reminder_events_patient_due_idx", "patient_id", "due_at"),
    )

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    device_id: Mapped[UUID] = mapped_column(
        ForeignKey("devices.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Deliberately not a foreign key. A reminder added on the phone has no row here yet —
    # today every reminder is device-created (D-25) — and an event is evidence that must
    # land whether or not its definition ever synced up. It is a real id all the same, so
    # a join finds the reminder once one exists.
    reminder_id: Mapped[UUID] = mapped_column(PgUuid(as_uuid=True), index=True, nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # `done` · `snoozed` · `missed`. A missed reminder is an observation, never a failure —
    # whatever reads these has to word it that way.
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    patient: Mapped[Patient] = relationship(back_populates="reminder_events")
    device: Mapped[Device] = relationship(back_populates="reminder_events")


class Person(Base):
    """Someone close to the patient. Synced **down**; read-only on the device.

    Backs the People tab and the one number the Help screen calls. Distinct from
    `memory_subjects`, which are the faces a recall game asks about: a person here is
    someone to reach, and the same human may well be both.

    `photo_url` is a URL because this side serves it; the device caches the file and keeps
    a filesystem path instead, so the tab draws with the radio off.
    """

    __tablename__ = "people"
    __table_args__ = (Index("people_patient_sort_idx", "patient_id", "sort"),)

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # "Your daughter", "Your neighbour" — shown to the reader as typed, so it is already
    # translated and already warm. Same column-name clash as `memory_subjects`.
    relation: Mapped[str] = mapped_column("relationship", String(255), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_primary_contact: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    # The order the family chose. Not alphabetical, not most-recent.
    sort: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"), nullable=False)
    created_by: Mapped[str | None] = mapped_column(_clerk_id(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        onupdate=_utcnow,
        index=True,
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="people")


class MemoryItem(Base):
    """A photo, a recording or a written memory the family shared. Synced **down**.

    Backs the Memories tab. `shared_by` is a Clerk id like every other person-shaped
    column (D-20); the *name* the reader sees is resolved through Clerk when the row is
    served, because the device stores a name to show rather than an id to look up.
    """

    __tablename__ = "memory_items"
    __table_args__ = (Index("memory_items_patient_created_idx", "patient_id", "created_at"),)

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # `photo` · `audio` · `story`.
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    caption: Mapped[str] = mapped_column(Text, nullable=False)
    # Null for a `story`, which is its caption and nothing else.
    media_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    shared_by: Mapped[str | None] = mapped_column(_clerk_id(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        onupdate=_utcnow,
        index=True,
        nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    patient: Mapped[Patient] = relationship(back_populates="memory_items")


__all__ = [
    "CasualPlayLog",
    "Device",
    "GameSession",
    "MemoryItem",
    "MemorySubject",
    "Patient",
    "PatientCaregiver",
    "Person",
    "QuestionEvent",
    "Reminder",
    "ReminderEvent",
    "Role",
    "SessionEvent",
    "smaran_id_seq",
]
