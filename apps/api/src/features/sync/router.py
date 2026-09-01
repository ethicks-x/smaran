"""The routes a patient device calls. Thin — every decision is in `service.py`.

Both POSTs are idempotent by contract: they upsert on `(device_id, seq)`, so a client that
sent a batch and never saw the response can send it again and change nothing
(`decisions.md` D-09).

These are the only endpoints the patient app ever *needs* to reach, and it needs to reach
them at no particular time. Nothing the reader can see waits on one (`AGENTS.md` §2.1) —
the phone plays, reminds and records exactly the same whether these have been called today
or not at all this month.
"""

from __future__ import annotations

from datetime import datetime  # noqa: TC003
from typing import TYPE_CHECKING, Annotated

from fastapi import APIRouter, Query

from features.auth.decorators import auth_required

# Runtime import, not TYPE_CHECKING: FastAPI resolves annotations against module globals.
from features.database.db import DbSession  # noqa: TC001
from features.sync.schemas import (  # noqa: TC001
    PullOut,
    ReminderBatchIn,
    ReminderEventBatchIn,
    SessionBatchIn,
    SyncAckOut,
)
from features.sync.service import (
    ingest_reminder_events,
    ingest_reminders,
    ingest_sessions,
    pull,
)


if TYPE_CHECKING:
    from features.auth.schemas import AuthContext


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"feature": "sync", "status": "ok"}


@router.post("/sessions", response_model=SyncAckOut)
@auth_required
async def sync_sessions(batch: SessionBatchIn, db: DbSession, auth: AuthContext) -> SyncAckOut:
    """Ingest a batch of finished game rounds from one device.

    The rows are the device's own `game_session` table, which is `SessionStats` field for
    field — raw counts beside the ratios, because what "accuracy" means will change and
    the facts underneath it cannot be collected a second time.
    """
    return await ingest_sessions(
        db, auth.user_id, batch.device_id, batch.app_version, batch.sessions
    )


@router.post("/reminder-events", response_model=SyncAckOut)
@auth_required
async def sync_reminder_events(
    batch: ReminderEventBatchIn, db: DbSession, auth: AuthContext
) -> SyncAckOut:
    """Ingest a batch of reminder outcomes from one device.

    This is the half of reminders the caregiver dashboard is waiting for: adherence is
    computed from these rows, against this patient's own history and nobody else's
    (`AGENTS.md` §2.4). A `missed` outcome is an observation, never a failure, and
    whatever reads these has to word it that way.
    """
    return await ingest_reminder_events(
        db, auth.user_id, batch.device_id, batch.app_version, batch.events
    )


@router.post("/reminders", response_model=SyncAckOut)
@auth_required
async def sync_reminders(batch: ReminderBatchIn, db: DbSession, auth: AuthContext) -> SyncAckOut:
    """Ingest reminders the reader created on the phone.

    The phone can **add** a reminder; it cannot change or retire one. A row that is already
    here is left exactly as it is, so a device retry can never revert an edit the caregiver
    made in between — creation comes from the phone, everything after it from the dashboard
    (`data-model.md` §3 rule 2).

    This is what makes a reminder added on the phone visible to the family. Without it the
    reader's own reminders were the one thing the dashboard could not see.
    """
    return await ingest_reminders(
        db, auth.user_id, batch.device_id, batch.app_version, batch.reminders
    )


@router.get("/pull", response_model=PullOut)
@auth_required
async def sync_pull(
    db: DbSession,
    auth: AuthContext,
    since: Annotated[
        datetime | None,
        Query(description="The `synced_at` from this device's last pull. Omit on the first."),
    ] = None,
    restore: Annotated[
        bool,
        Query(
            description=(
                "Ask for this patient's game history as well. For a phone that has just been "
                "reinstalled or reset and has no local sessions left."
            )
        ),
    ] = False,
) -> PullOut:
    """Everything the device needs to take down: changed reminders, and optionally history.

    **Reminders are server-authoritative** — whatever comes back replaces what the phone
    holds, retirements included (`data-model.md` §3 rule 2). Rows the caregiver has retired
    arrive with `deleted: true` rather than by absence, so a phone that was switched off for
    a week still learns they are gone.

    **`restore=true` is the reinstall case.** A phone that lost its storage still belongs to
    a reader with a history, and the adaptive engine reading an empty table would put an
    experienced player back on the first rung. Restored rounds come back without a `seq`:
    they are not this device's facts and are never sent up again.

    Like everything else in this feature, calling it is optional. A device that never
    reaches this endpoint keeps working from what it already has (§2.1) — it just will not
    hear about a reminder the caregiver added this morning.
    """
    return await pull(db, auth.user_id, since, restore=restore)
