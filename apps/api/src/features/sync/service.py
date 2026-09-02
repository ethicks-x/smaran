"""Ingest for the two streams that sync **up**.

The rule that shapes everything here: a phone must never be given a reason to drop a row
it has not managed to send. Sessions and reminder events are append-only facts about a
real afternoon (`data-model.md` §3 rule 1), the device is holding the only copy, and a
5xx or a refused batch means the reader's evidence sits in `sync_queue` until the next
attempt. So the failure modes are deliberately narrow:

* A row that is already here is a **duplicate**, not an error. That is what a retry is
  supposed to produce, and a batch that is entirely duplicates means the last attempt
  landed and only the acknowledgement was lost.
* A row this server will never be able to store is **rejected by id**, and the rest of
  the batch still lands (`api-contract.md` §2). It is named so the client can stop
  carrying it; a row that is merely refused today would be retried forever.
* Anything else — the device is not enrolled yet, the batch belongs to somebody else —
  fails the whole request, because in those cases nothing in it can be attributed and
  keeping it queued is the correct outcome.

Idempotency is `(device_id, seq)` (`decisions.md` D-09), which the device guarantees by
handing out `seq` from a counter it never resets and by queueing the JSON snapshot it
sends, so a retry carries the same key it carried the first time.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import DataError, IntegrityError

from core.storage import view_url
from features.database.models import (
    Device,
    MemoryAsset,
    MemorySubject,
    Patient,
    Reminder,
    ReminderEvent,
    SessionEvent,
)
from features.sync.schemas import (
    RESTORE_LIMIT,
    MemorySubjectPull,
    PullOut,
    RejectedItem,
    ReminderPull,
    SessionPull,
    SyncAckOut,
)


if TYPE_CHECKING:
    from collections.abc import Sequence
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession

    from features.sync.schemas import ReminderEventIn, ReminderIn, SessionIn


# Plain language, and about the row rather than the person. Nothing patient-identifying
# reaches a response body any more than it reaches a log line (`AGENTS.md` §2.5), which
# rules out echoing the driver's own message — those quote the values that failed.
_REJECT_REASONS = {
    IntegrityError: "The row points at something this server does not have.",
    DataError: "A value in the row is outside the range this server can store.",
}


async def resolve_patient(session: AsyncSession, user_id: str) -> Patient:
    """The patient record this device is signed in as.

    A 409 rather than a 404, and the distinction matters to the client: "there is nobody
    to attribute these rows to *yet*" is a state enrollment will fix, so the device keeps
    its queue and tries again after somebody has linked it. A 404 would read as "this
    will never work" and the queue is the only copy of the data.
    """
    patient = await session.scalar(select(Patient).where(Patient.user_id == user_id))

    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This device is signed in but not enrolled to a patient yet.",
        )

    return patient


async def ensure_device(
    session: AsyncSession, patient: Patient, device_id: UUID, app_version: str | None
) -> Device:
    """Register the device on its first sync, or greet one we have already met.

    The id is the device's own — generated once at first launch and never regenerated —
    so this is a registration, not an allocation. A reinstalled app is genuinely a new
    device with a fresh sequence, which is exactly what `(device_id, seq)` needs it to
    mean.
    """
    device = await session.get(Device, device_id)

    if device is None:
        device = Device(id=device_id, patient_id=patient.id, app_version=app_version)
        session.add(device)
        await session.flush()
        return device

    if device.patient_id != patient.id:
        # Two accounts on one phone. Refusing is the safe half: attributing one reader's
        # rounds to another is worse than a batch that stays queued.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This device is enrolled to a different patient.",
        )

    if app_version is not None:
        device.app_version = app_version

    return device


async def ingest_sessions(
    session: AsyncSession,
    user_id: str,
    device_id: UUID,
    app_version: str | None,
    items: Sequence[SessionIn],
) -> SyncAckOut:
    """Store a batch of finished — or abandoned — rounds."""
    patient = await resolve_patient(session, user_id)
    device = await ensure_device(session, patient, device_id, app_version)

    rows = [
        {
            **item.model_dump(),
            "patient_id": patient.id,
            "device_id": device.id,
        }
        for item in items
    ]

    return await _write(session, device, SessionEvent, rows)


async def ingest_reminder_events(
    session: AsyncSession,
    user_id: str,
    device_id: UUID,
    app_version: str | None,
    items: Sequence[ReminderEventIn],
) -> SyncAckOut:
    """Store a batch of reminder outcomes."""
    patient = await resolve_patient(session, user_id)
    device = await ensure_device(session, patient, device_id, app_version)

    rows = [
        {
            **item.model_dump(),
            "patient_id": patient.id,
            "device_id": device.id,
        }
        for item in items
    ]

    return await _write(session, device, ReminderEvent, rows)


async def ingest_reminders(
    session: AsyncSession,
    user_id: str,
    device_id: UUID,
    app_version: str | None,
    items: Sequence[ReminderIn],
) -> SyncAckOut:
    """Store reminders the reader created on the phone.

    **The only definition the device authors, and it authors it once.** On conflict this
    does nothing, and that is the whole design rather than an optimisation: the row's id is
    the device's own uuid, so a retried batch finds its own earlier row — but so does a
    batch that arrives after a caregiver has edited the reminder. Upserting the payload
    would quietly revert their change, and a device retry is not a reason to overturn a
    person's decision. Creation comes from the phone; everything after it comes from the
    dashboard (`data-model.md` §3 rule 2).

    So there is no `(device_id, seq)` key here and no need for one. The id is generated on
    the device and is already unique, which makes the insert idempotent on its own — `seq`
    rides along to order the outbox and nothing more.
    """
    patient = await resolve_patient(session, user_id)
    device = await ensure_device(session, patient, device_id, app_version)

    rows = [
        {
            "id": item.id,
            "patient_id": patient.id,
            "kind": item.kind,
            "title": item.title,
            "detail": item.detail,
            "schedule": item.schedule,
            "active": item.active,
            # Factually who created it: the reader, on their own phone. A person-shaped
            # column holds a Clerk id and nothing else (D-20).
            "created_by": user_id,
        }
        for item in items
    ]

    return await _write(session, device, Reminder, rows)


async def _write(
    session: AsyncSession,
    device: Device,
    model: type[SessionEvent] | type[ReminderEvent] | type[Reminder],
    rows: list[dict[str, Any]],
) -> SyncAckOut:
    """Insert the rows one at a time, counting what happened to each.

    One statement per row rather than one for the batch, and that is the trade this whole
    file is built around: a multi-row insert cannot say *which* row it choked on, and the
    contract requires naming the rejects. A batch is capped at `MAX_BATCH` rows of a few
    dozen bytes each, so the cost is a handful of round trips inside one transaction on a
    stream that arrives a few times a day.

    Each row gets its own savepoint. Without one, a single failed statement poisons the
    surrounding transaction in Postgres and takes down every row that had already
    succeeded — the all-or-nothing outcome the contract exists to prevent.
    """
    accepted = 0
    duplicates = 0
    rejected: list[RejectedItem] = []

    for row in rows:
        # DO NOTHING with no conflict target on purpose: the primary key and the
        # `(device_id, seq)` unique constraint are two different ways of saying "we
        # already have this round", and both are a duplicate rather than a problem.
        statement = insert(model).values(row).on_conflict_do_nothing().returning(model.id)

        try:
            async with session.begin_nested():
                result = await session.execute(statement)
        except (IntegrityError, DataError) as error:
            rejected.append(
                RejectedItem(
                    id=row["id"],
                    reason=_REJECT_REASONS.get(type(error), "This server cannot store the row."),
                )
            )
            continue

        if result.scalar_one_or_none() is None:
            duplicates += 1
        else:
            accepted += 1

    last_seq = await _watermark(session, device.id)

    # Never backwards. A batch that was entirely duplicates carries no new sequence
    # numbers, and a slow response arriving after a newer one must not un-acknowledge
    # work that is already done.
    device.last_synced_seq = max(device.last_synced_seq, last_seq)
    device.last_seen_at = datetime.now(UTC)

    await session.commit()

    return SyncAckOut(
        accepted=accepted, duplicates=duplicates, rejected=rejected, last_seq=last_seq
    )


async def _watermark(session: AsyncSession, device_id: UUID) -> int:
    """The highest sequence number this server holds for a device, across both streams.

    Both streams, because they share one counter on the device: a watermark taken from
    sessions alone would sit below a reminder event that arrived after it and read as
    though that event were still owed.
    """
    sessions = await session.scalar(
        select(func.max(SessionEvent.seq)).where(SessionEvent.device_id == device_id)
    )
    reminders = await session.scalar(
        select(func.max(ReminderEvent.seq)).where(ReminderEvent.device_id == device_id)
    )

    return max(sessions or 0, reminders or 0)


__all__ = [
    "ensure_device",
    "ingest_reminder_events",
    "ingest_reminders",
    "ingest_sessions",
    "pull",
    "resolve_patient",
]


async def pull(
    session: AsyncSession, user_id: str, since: datetime | None, *, restore: bool
) -> PullOut:
    """Everything the device needs to take **down**, in one round trip.

    The mirror of ingest, and a different problem. Going up, the device holds the only copy
    and the server must never cost it a row. Coming down, the server holds the only copy of
    what a caregiver decided, and the device must end up agreeing with it — reminders are
    server-authoritative and there is nothing to merge (`data-model.md` §3 rule 2).

    `since` is a watermark the server itself issued (`PullOut.synced_at`), so the comparison
    is between two readings of one clock. A phone's own clock is not trusted with this: it
    can be wrong by hours, and the cost of that is either a window of changes silently
    skipped or the same ones re-sent forever.

    `restore` is the reinstall case and is asked for **once**. A phone whose storage was
    wiped still belongs to a reader with a history, and an adaptive engine reading an empty
    table would put an experienced player back on the first rung and call it a measurement
    (`AGENTS.md` §2.4 — the comparison is always against this person's own past, and after a
    reinstall that past is only here).
    """
    patient = await resolve_patient(session, user_id)

    # Read the clock before the queries, never after. A row written while this function runs
    # would otherwise carry an `updated_at` below the watermark we hand back, and the next
    # pull would skip it — a reminder that was edited at the wrong moment and never arrived.
    synced_at = datetime.now(UTC)

    reminders = await _changed_reminders(session, patient.id, since)
    subjects = await _memory_subjects(session, patient.id)
    sessions = await _history(session, patient.id) if restore else []

    return PullOut(
        synced_at=synced_at,
        reminders=reminders,
        subjects=subjects,
        sessions=sessions,
        sessions_truncated=len(sessions) >= RESTORE_LIMIT,
    )


async def _changed_reminders(
    session: AsyncSession, patient_id: UUID, since: datetime | None
) -> list[ReminderPull]:
    """Reminder definitions touched since the watermark, retired ones included.

    No `deleted_at IS NULL` filter, deliberately. A retired reminder is exactly what a phone
    that has been off needs to hear about, and it is the one row a naive "what is in force"
    query would drop.
    """
    query = select(Reminder).where(Reminder.patient_id == patient_id)

    if since is not None:
        query = query.where(Reminder.updated_at > since)

    rows = (await session.scalars(query.order_by(Reminder.updated_at))).all()

    return [
        ReminderPull(
            id=row.id,
            kind=row.kind,
            title=row.title,
            detail=row.detail,
            schedule=row.schedule,
            active=row.active,
            deleted=row.deleted_at is not None,
        )
        for row in rows
    ]


async def _memory_subjects(session: AsyncSession, patient_id: UUID) -> list[MemorySubjectPull]:
    """Every active person, place and object for this patient — the whole set, not a delta.

    `since` is deliberately not consulted. `memory_subjects` has no `updated_at` and is
    deleted outright rather than retired, so there is no column a watermark could compare
    and no tombstone a removal could arrive as. Filtering by "changed since" would send a
    rename never and a deletion never, and the phone would keep drawing a subject the
    family took down months ago.

    A full snapshot instead, which the phone replaces wholesale. That is affordable because
    a family keeps a handful of these, and it is the only shape that is *correct* — a
    replace gets edits, additions and removals right without any of them needing to be
    modelled.

    Each subject is paired with its newest ready upload, the same way the caregiver's own
    list is: a re-upload wins by being newer, and nothing has to delete the row it
    replaced. A subject with no upload keeps whatever `photo_url` was typed onto it, which
    is how an externally hosted picture still reaches the phone.
    """
    subjects = (
        await session.scalars(
            select(MemorySubject)
            .where(
                MemorySubject.patient_id == patient_id,
                MemorySubject.is_active.is_(True),
            )
            .order_by(MemorySubject.created_at.desc())
        )
    ).all()

    if not subjects:
        return []

    assets = (
        await session.scalars(
            select(MemoryAsset)
            .where(
                MemoryAsset.subject_id.in_([subject.id for subject in subjects]),
                MemoryAsset.status == "ready",
                MemoryAsset.is_active.is_(True),
            )
            .order_by(MemoryAsset.created_at.desc())
        )
    ).all()

    # Newest first, so the first one seen for a subject is the one that wins.
    newest: dict[UUID, MemoryAsset] = {}
    for asset in assets:
        if asset.subject_id is not None:
            newest.setdefault(asset.subject_id, asset)

    pulled = []
    for subject in subjects:
        asset = newest.get(subject.id)

        if asset is not None:
            # The object key is the stable half and the signed URL the perishable one. Both
            # go down: the phone fetches with the second and caches under the first.
            photo_url, photo_key = view_url(asset.object_key), asset.object_key
        else:
            # No upload, so the caregiver's own URL is both — it is stable precisely
            # because nothing here is signing it.
            photo_url = photo_key = subject.photo_url

        pulled.append(
            MemorySubjectPull(
                id=subject.id,
                kind=subject.kind,
                name=subject.name,
                relation=subject.relation,
                photo_url=photo_url,
                photo_key=photo_key,
                created_at=subject.created_at,
            )
        )

    return pulled


async def _history(session: AsyncSession, patient_id: UUID) -> list[SessionPull]:
    """This patient's most recent rounds, across every device they have ever used.

    Every device, because the history belongs to the reader and not to the phone — a
    replaced handset is the same person continuing, and the engine should read it that way.
    Newest first and capped: what reads these is a trailing window, never a lifetime.
    """
    rows = (
        await session.scalars(
            select(SessionEvent)
            .where(SessionEvent.patient_id == patient_id)
            .order_by(SessionEvent.ended_at.desc())
            .limit(RESTORE_LIMIT)
        )
    ).all()

    return [SessionPull.model_validate(row, from_attributes=True) for row in rows]
