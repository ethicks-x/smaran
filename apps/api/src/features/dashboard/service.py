"""Queries, aggregations, and business logic for the Caregiver Dashboard.

Routers stay thin; all database operations and calculations live here.
"""

from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

import httpx
from fastapi import HTTPException, status
from sqlalchemy import func, select

from core.clerk import resolve_clerk_user
from core.config import settings
from core.storage import (
    build_object_key,
    check_content_type,
    memories_bucket,
    public_url,
    upload_object,
    view_url,
)
from features.care.schemas import LINK_ACTIVE
from features.dashboard.schemas import (
    ActivityBreakdownItem,
    ActivityFeedOut,
    AiCaregiverTip,
    AiDataWindowSummary,
    AiObservationItem,
    AiRoutineItem,
    AttentionFlagOut,
    CasualPlayCreateIn,
    CasualPlayOut,
    DashboardSummaryOut,
    MemoryAssetOut,
    MemorySubjectCreateIn,
    MemorySubjectOut,
    MemorySubjectUpdateIn,
    NotificationOut,
    PatientAiInsightsOut,
    PatientCardOut,
    PatientCreateIn,
    PatientDetailOut,
    PatientProgressOut,
    PatientUpdateIn,
    QuestionEventOut,
    ReminderCreateIn,
    ReminderOut,
    ReminderUpdateIn,
    SessionSummaryOut,
    TrendPointOut,
)
from features.database.models import (
    CasualPlayLog,
    GameSession,
    MemoryAsset,
    MemorySubject,
    Patient,
    PatientCaregiver,
    QuestionEvent,
    Reminder,
    ReminderEvent,
    SessionEvent,
)


if TYPE_CHECKING:
    from uuid import UUID

    from fastapi import UploadFile
    from sqlalchemy.ext.asyncio import AsyncSession


ACTIVITY_LABELS: dict[str, str] = {
    "who_is_this": "Who is this?",
    "what_is_this": "What is this?",
    "where_is_this": "Where is this?",
    "matching": "Matching Pairs",
    "pattern-match": "Matching Pairs",
    "missing": "Missing Item",
    "daily-recall": "Daily Recall",
    "chess": "Chess",
    "sudoku": "Sudoku",
}


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _format_time_ago(dt: datetime) -> str:
    now = _utcnow()
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        mins = seconds // 60
        return f"{mins} minute{'s' if mins > 1 else ''} ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours > 1 else ''} ago"
    days = seconds // 86400
    return f"{days} day{'s' if days > 1 else ''} ago"


async def ensure_caregiver_patient_access(
    session: AsyncSession, caregiver_id: str, patient_id: UUID
) -> tuple[Patient, PatientCaregiver]:
    """Verify that a patient exists and is **actively** linked to the requesting caregiver.

    Only an `active` row is access. A patient's phone can create a link by typing a Smaran
    id into its setup screen, and that row arrives `pending` — so a caregiver whose number
    somebody quoted sees nothing until they have accepted (`AGENTS.md` §2.5). `revoked` is
    excluded by the same filter: access that has ended stays ended, and the row survives
    only as the record of when it did.

    Raises a 404 if there is no such link.
    """
    stmt = (
        select(Patient, PatientCaregiver)
        .join(PatientCaregiver, PatientCaregiver.patient_id == Patient.id)
        .where(
            Patient.id == patient_id,
            PatientCaregiver.caregiver_id == caregiver_id,
            PatientCaregiver.status == LINK_ACTIVE,
        )
    )
    result = (await session.execute(stmt)).first()
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found or not linked to your account.",
        )
    patient, link = result
    return patient, link


async def _resolve_patient_display_name(patient: Patient, fallback_index: int | None = None) -> str:
    """Resolve patient name from Clerk or provide an informative label."""
    if patient.user_id:
        clerk_user = await resolve_clerk_user(patient.user_id)
        if clerk_user and clerk_user.full_name:
            return clerk_user.full_name
    return (
        f"Patient {str(patient.id)[:8]}" if fallback_index is None else f"Patient {fallback_index}"
    )


async def _resolve_patient_avatar(patient: Patient) -> str | None:
    if patient.user_id:
        clerk_user = await resolve_clerk_user(patient.user_id)
        if clerk_user:
            return clerk_user.avatar_url
    return None


async def _compute_patient_card(
    session: AsyncSession,
    patient: Patient,
    link: PatientCaregiver,
) -> PatientCardOut:
    """Calculate session count, accuracy, and last active time for a single patient."""
    name = await _resolve_patient_display_name(patient)
    avatar = await _resolve_patient_avatar(patient)

    # Session stats from session_events (primary) and game_sessions (legacy)
    session_events_stmt = (
        select(SessionEvent)
        .where(SessionEvent.patient_id == patient.id)
        .order_by(SessionEvent.ended_at.desc())
    )
    s_events = (await session.scalars(session_events_stmt)).all()

    legacy_sessions_count_stmt = select(func.count(GameSession.id)).where(
        GameSession.patient_id == patient.id
    )
    legacy_count = (await session.scalar(legacy_sessions_count_stmt)) or 0
    sessions_count = len(s_events) + legacy_count

    # Calculate overall accuracy
    if s_events:
        total_attempts = sum(e.attempts for e in s_events)
        total_correct = sum(e.correct for e in s_events)
        if total_attempts > 0:
            accuracy = round((total_correct / total_attempts) * 100)
        else:
            accuracy = round((sum(e.accuracy for e in s_events) / len(s_events)) * 100)
    else:
        # Fallback to QuestionEvent if any
        events_stmt = select(QuestionEvent.is_correct).where(
            QuestionEvent.patient_id == patient.id,
            QuestionEvent.is_correct.is_not(None),
        )
        q_events = (await session.scalars(events_stmt)).all()
        total_answered = len(q_events)
        correct_count = sum(1 for c in q_events if c is True)
        accuracy = round((correct_count / total_answered) * 100) if total_answered > 0 else 0

    last_active_at = None
    if s_events:
        last_active_at = s_events[0].ended_at
    else:
        last_session_stmt = (
            select(GameSession.started_at)
            .where(GameSession.patient_id == patient.id)
            .order_by(GameSession.started_at.desc())
            .limit(1)
        )
        last_active_at = await session.scalar(last_session_stmt)

    return PatientCardOut(
        id=patient.id,
        user_id=patient.user_id,
        full_name=name,
        avatar_url=avatar,
        dob=patient.dob,
        address=patient.address,
        contact_number=patient.contact_number,
        preferred_language=patient.preferred_language,
        relationship=link.relation,
        sessions_count=sessions_count,
        overall_accuracy=accuracy,
        last_active_at=last_active_at,
    )


async def get_dashboard_summary(session: AsyncSession, caregiver_id: str) -> DashboardSummaryOut:
    """Aggregate top-level dashboard metrics for all patients under this caregiver."""
    links_stmt = (
        select(Patient, PatientCaregiver)
        .join(PatientCaregiver, PatientCaregiver.patient_id == Patient.id)
        .where(
            PatientCaregiver.caregiver_id == caregiver_id,
            PatientCaregiver.status == LINK_ACTIVE,
        )
    )
    patient_pairs = (await session.execute(links_stmt)).all()

    patient_cards: list[PatientCardOut] = []
    patient_ids: list[UUID] = []

    for patient, link in patient_pairs:
        patient_ids.append(patient.id)
        card = await _compute_patient_card(session, patient, link)
        patient_cards.append(card)

    total_patients = len(patient_cards)

    # Activities today across caregiver's patients
    activities_today = 0
    total_memory_subjects = 0

    if patient_ids:
        today_start = _utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_sessions_stmt = select(func.count(SessionEvent.id)).where(
            SessionEvent.patient_id.in_(patient_ids),
            SessionEvent.ended_at >= today_start,
        )
        sessions_today = (await session.scalar(today_sessions_stmt)) or 0

        today_q_stmt = select(func.count(QuestionEvent.id)).where(
            QuestionEvent.patient_id.in_(patient_ids),
            QuestionEvent.asked_at >= today_start,
        )
        q_today = (await session.scalar(today_q_stmt)) or 0

        activities_today = sessions_today + q_today

        subjects_stmt = select(func.count(MemorySubject.id)).where(
            MemorySubject.patient_id.in_(patient_ids),
            MemorySubject.is_active.is_(True),
        )
        total_memory_subjects = (await session.scalar(subjects_stmt)) or 0

    # Compute attention flags count
    flags = await get_attention_flags(session, caregiver_id)

    return DashboardSummaryOut(
        total_patients=total_patients,
        activities_today=activities_today,
        total_memory_subjects=total_memory_subjects,
        needs_attention=len(flags),
        patients=patient_cards,
    )


async def list_patients(session: AsyncSession, caregiver_id: str) -> list[PatientCardOut]:
    """List all patients enrolled under the caregiver."""
    stmt = (
        select(Patient, PatientCaregiver)
        .join(PatientCaregiver, PatientCaregiver.patient_id == Patient.id)
        .where(
            PatientCaregiver.caregiver_id == caregiver_id,
            PatientCaregiver.status == LINK_ACTIVE,
        )
    )
    pairs = (await session.execute(stmt)).all()
    cards: list[PatientCardOut] = []
    for patient, link in pairs:
        card = await _compute_patient_card(session, patient, link)
        cards.append(card)
    return cards


async def create_patient(
    session: AsyncSession, caregiver_id: str, data: PatientCreateIn
) -> PatientCardOut:
    """Create a new patient record and establish the caregiver linkage."""
    patient = Patient(
        user_id=data.user_id,
        dob=data.dob,
        address=data.address,
        contact_number=data.contact_number,
        preferred_language=data.preferred_language,
    )
    session.add(patient)
    await session.flush()

    link = PatientCaregiver(
        patient_id=patient.id,
        caregiver_id=caregiver_id,
        relation=data.relationship,
    )
    session.add(link)
    await session.commit()
    await session.refresh(patient)
    await session.refresh(link)

    return await _compute_patient_card(session, patient, link)


async def get_patient_detail(
    session: AsyncSession, caregiver_id: str, patient_id: UUID
) -> PatientDetailOut:
    """Fetch complete profile and summary counters for a specific patient."""
    patient, link = await ensure_caregiver_patient_access(session, caregiver_id, patient_id)
    card = await _compute_patient_card(session, patient, link)

    subjects_count_stmt = select(func.count(MemorySubject.id)).where(
        MemorySubject.patient_id == patient.id,
        MemorySubject.is_active.is_(True),
    )
    subjects_count = (await session.scalar(subjects_count_stmt)) or 0

    return PatientDetailOut(
        id=card.id,
        user_id=card.user_id,
        full_name=card.full_name,
        avatar_url=card.avatar_url,
        dob=card.dob,
        address=card.address,
        contact_number=card.contact_number,
        preferred_language=card.preferred_language,
        relationship=card.relationship,
        sessions_count=card.sessions_count,
        overall_accuracy=card.overall_accuracy,
        memory_subjects_count=subjects_count,
        last_active_at=card.last_active_at,
    )


async def update_patient(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    data: PatientUpdateIn,
) -> PatientDetailOut:
    """Update patient details and caregiver relationship."""
    patient, link = await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    if data.user_id is not None:
        patient.user_id = data.user_id
    if data.dob is not None:
        patient.dob = data.dob
    if data.address is not None:
        patient.address = data.address
    if data.contact_number is not None:
        patient.contact_number = data.contact_number
    if data.preferred_language is not None:
        patient.preferred_language = data.preferred_language
    if data.relationship is not None:
        link.relation = data.relationship

    await session.commit()
    return await get_patient_detail(session, caregiver_id, patient_id)


async def deregister_patient(session: AsyncSession, caregiver_id: str, patient_id: UUID) -> None:
    """Deregister a patient by revoking the caregiver link permanently."""
    patient, link = await ensure_caregiver_patient_access(session, caregiver_id, patient_id)
    link.status = "revoked"
    await session.commit()


async def delete_patient(session: AsyncSession, caregiver_id: str, patient_id: UUID) -> None:
    """Remove a patient linkage and their records."""
    patient, link = await ensure_caregiver_patient_access(session, caregiver_id, patient_id)
    link.status = "revoked"
    await session.commit()


# --- Memory Subjects ---


async def list_memory_subjects(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    kind: str | None = None,
) -> list[MemorySubjectOut]:
    """List memory subjects (people, places, objects) for a patient."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    query = select(MemorySubject).where(
        MemorySubject.patient_id == patient_id,
        MemorySubject.is_active.is_(True),
    )
    if kind:
        query = query.where(MemorySubject.kind == kind.lower())

    query = query.order_by(MemorySubject.created_at.desc())
    results = (await session.scalars(query)).all()

    subjects = [MemorySubjectOut.model_validate(m) for m in results]
    await _attach_subject_photos(session, subjects)
    return subjects


async def _attach_subject_photos(session: AsyncSession, subjects: list[MemorySubjectOut]) -> None:
    """Point each subject at its uploaded picture, where it has one.

    `photo_url` cannot simply be stored on the subject: unless the bucket is public the URL
    is signed and expires, so it has to be minted per read. A subject with no upload keeps
    whatever `photo_url` it already had, which is how an externally hosted image still works.
    """
    if not subjects:
        return

    stmt = (
        select(MemoryAsset)
        .where(
            MemoryAsset.subject_id.in_([s.id for s in subjects]),
            MemoryAsset.status == "ready",
            MemoryAsset.is_active.is_(True),
        )
        .order_by(MemoryAsset.created_at.desc())
    )
    assets = (await session.scalars(stmt)).all()

    # Newest first, so the first one seen for a subject is the one that wins — a re-upload
    # replaces the picture without anything having to delete the old row.
    newest: dict[UUID, MemoryAsset] = {}
    for asset in assets:
        if asset.subject_id is not None:
            newest.setdefault(asset.subject_id, asset)

    for subject in subjects:
        asset = newest.get(subject.id)
        if asset is not None:
            subject.photo_url = view_url(asset.object_key)


async def create_memory_subject(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    data: MemorySubjectCreateIn,
) -> MemorySubjectOut:
    """Create a new memory subject for a patient."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    subject = MemorySubject(
        patient_id=patient_id,
        kind=data.kind.lower(),
        name=data.name,
        relation=data.relation,
        photo_url=data.photo_url,
        is_active=data.is_active,
        created_by=caregiver_id,
    )
    session.add(subject)
    await session.commit()
    await session.refresh(subject)
    return MemorySubjectOut.model_validate(subject)


async def update_memory_subject(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    subject_id: UUID,
    data: MemorySubjectUpdateIn,
) -> MemorySubjectOut:
    """Modify an existing memory subject."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    subject = await session.scalar(
        select(MemorySubject).where(
            MemorySubject.id == subject_id,
            MemorySubject.patient_id == patient_id,
        )
    )
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory subject not found.",
        )

    if data.name is not None:
        subject.name = data.name
    if data.relation is not None:
        subject.relation = data.relation
    if data.photo_url is not None:
        subject.photo_url = data.photo_url
    if data.is_active is not None:
        subject.is_active = data.is_active

    await session.commit()
    await session.refresh(subject)
    return MemorySubjectOut.model_validate(subject)


async def delete_memory_subject(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    subject_id: UUID,
) -> None:
    """Deactivate or remove a memory subject."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    subject = await session.scalar(
        select(MemorySubject).where(
            MemorySubject.id == subject_id,
            MemorySubject.patient_id == patient_id,
        )
    )
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory subject not found.",
        )

    await session.delete(subject)
    await session.commit()


# --- Memory Media ---


async def upload_memory_asset(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    *,
    file: UploadFile,
    kind: str,
    description: str | None,
    subject_id: UUID | None,
) -> MemoryAssetOut:
    """Upload a picture straight to the bucket and record it, in one request.

    D-32 had the browser PUT directly to the bucket with a presigned URL — the row existed
    before the object did, because minting the URL was what created it, and a separate
    confirm step asked the bucket whether the bytes had actually landed. The provider behind
    this bucket does not accept a presigned PUT, only a presigned GET or HEAD, so that shape
    is not available: nothing can hand the browser a URL to write with. The file comes to
    this API instead, which holds real credentials and can write directly (D-42).

    Because this function performs the write itself rather than learning about one it did
    not perform, there is nothing left to confirm — the outcome of `upload_object` below is
    the only truth there is, known synchronously, in this same request.
    """
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    content_type = (file.content_type or "").lower().strip()
    extension = check_content_type(content_type)

    if subject_id is not None:
        subject = await session.scalar(
            select(MemorySubject).where(
                MemorySubject.id == subject_id,
                MemorySubject.patient_id == patient_id,
            )
        )
        if subject is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Memory subject not found.",
            )

    # Enforced while reading, not after: a Content-Length header is the caregiver's browser
    # talking, and reading an unbounded body fully into memory before checking its size would
    # defeat the point of having a limit.
    chunks: list[bytes] = []
    total_bytes = 0
    while chunk := await file.read(1 << 20):
        total_bytes += len(chunk)
        if total_bytes > settings.s3_max_upload_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail="That picture is too large. Try a smaller one.",
            )
        chunks.append(chunk)
    body = b"".join(chunks)

    asset = MemoryAsset(
        patient_id=patient_id,
        subject_id=subject_id,
        kind=kind.lower(),
        bucket=memories_bucket(),
        object_key="",  # replaced below; the key is built from the row's own id
        file_name=file.filename,
        content_type=content_type,
        size_bytes=total_bytes,
        description=description,
        status="pending",
        uploaded_by=caregiver_id,
    )
    session.add(asset)
    await session.flush()

    asset.object_key = build_object_key(patient_id, asset.id, extension)

    try:
        etag = await upload_object(asset.object_key, content_type, body)
    except Exception as exc:
        # The true edge of the system: any bucket failure — network, credentials, the
        # provider itself — becomes one plain message, the way `db.py`'s own S3 read
        # already treats a bucket as something that can just not work today.
        asset.status = "failed"
        await session.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Couldn't save that picture. Please try again.",
        ) from exc

    asset.status = "ready"
    asset.etag = etag or None
    asset.uploaded_at = _utcnow()

    # Persisted only when the bucket has a public base configured — `public_url` returns
    # `None` otherwise, and a signed URL that will expire has no business in a column meant
    # to be read back long after this request ends (D-45). `list_memory_subjects` still
    # resolves `photo_url` per read on top of this (`_attach_subject_photos` below), so an
    # older row uploaded before a public base existed keeps working the same way it always
    # has; this just means the column itself now agrees with what that resolution returns,
    # for a caregiver who queries the table directly rather than through the API.
    if subject_id is not None:
        permanent = public_url(asset.object_key)
        if permanent is not None:
            subject.photo_url = permanent

    await session.commit()
    await session.refresh(asset)

    return _asset_out(asset)


async def list_memory_assets(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
) -> list[MemoryAssetOut]:
    """Every memory this patient has that is actually there, newest first."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    stmt = (
        select(MemoryAsset)
        .where(
            MemoryAsset.patient_id == patient_id,
            MemoryAsset.status == "ready",
            MemoryAsset.is_active.is_(True),
        )
        .order_by(MemoryAsset.created_at.desc())
    )
    return [_asset_out(a) for a in (await session.scalars(stmt)).all()]


async def delete_memory_asset(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    asset_id: UUID,
) -> None:
    """Take a memory off the phone.

    A soft delete: down-sync is watermark-based, so a row that simply vanished is one no
    device could ever be told about, and the picture would stay on the phone for good.
    """
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    asset = await session.scalar(
        select(MemoryAsset).where(
            MemoryAsset.id == asset_id,
            MemoryAsset.patient_id == patient_id,
        )
    )
    if asset is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="That memory was not found.",
        )

    asset.is_active = False
    await session.commit()


def _asset_out(asset: MemoryAsset) -> MemoryAssetOut:
    """A stored memory plus a URL that will render it for as long as it is signed for."""
    out = MemoryAssetOut.model_validate(asset)
    # Only a `ready` row has bytes to point at; a pending one would sign a URL for an object
    # that is not there yet.
    if asset.status == "ready":
        out.view_url = view_url(asset.object_key)
    return out


# --- Progress, Sessions & Analytics ---


async def get_patient_progress(
    session: AsyncSession, caregiver_id: str, patient_id: UUID
) -> PatientProgressOut:
    """Retrieve structured progress metrics, session history, and activity breakdown."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    # Fetch synced session events
    s_events_stmt = (
        select(SessionEvent)
        .where(SessionEvent.patient_id == patient_id)
        .order_by(SessionEvent.ended_at.desc())
    )
    s_events = (await session.scalars(s_events_stmt)).all()

    # Fetch legacy game sessions and question events
    sessions_stmt = (
        select(GameSession)
        .where(GameSession.patient_id == patient_id)
        .order_by(GameSession.started_at.desc())
    )
    legacy_sessions = (await session.scalars(sessions_stmt)).all()

    events_stmt = select(QuestionEvent).where(
        QuestionEvent.patient_id == patient_id,
        QuestionEvent.is_correct.is_not(None),
    )
    q_events = (await session.scalars(events_stmt)).all()

    session_summaries: list[SessionSummaryOut] = []

    # Map synced SessionEvent records
    for se in s_events:
        acc = round(se.accuracy * 100) if se.accuracy <= 1.0 else round(se.accuracy)
        session_summaries.append(
            SessionSummaryOut(
                id=se.id,
                date=se.started_at.strftime("%Y-%m-%d"),
                questions_planned=se.total,
                questions_answered=se.attempts,
                accuracy=acc,
                avg_time_ms=se.avg_response_ms,
                started_at=se.started_at,
                ended_at=se.ended_at,
            )
        )

    # Map legacy GameSession records
    for s in legacy_sessions:
        s_q = [e for e in q_events if e.session_id == s.id]
        answered_count = len(s_q)
        correct_count = sum(1 for e in s_q if e.is_correct is True)
        acc = round((correct_count / answered_count) * 100) if answered_count > 0 else 0
        times = [e.time_taken_ms for e in s_q if e.time_taken_ms is not None]
        avg_time = round(sum(times) / len(times)) if times else 0

        session_summaries.append(
            SessionSummaryOut(
                id=s.id,
                date=s.started_at.strftime("%Y-%m-%d"),
                questions_planned=s.questions_planned,
                questions_answered=s.questions_answered or answered_count,
                accuracy=acc,
                avg_time_ms=avg_time,
                started_at=s.started_at,
                ended_at=s.ended_at,
            )
        )

    # Sort all sessions newest first
    session_summaries.sort(key=lambda s: s.started_at, reverse=True)

    # Activity breakdown from session_events (by game_id) and question_events (by activity)
    breakdown_map: dict[str, dict[str, Any]] = {}

    for se in s_events:
        game_key = se.game_id
        if game_key not in breakdown_map:
            breakdown_map[game_key] = {
                "activity": game_key,
                "label": ACTIVITY_LABELS.get(
                    game_key, game_key.replace("_", " ").replace("-", " ").title()
                ),
                "total_attempts": 0,
                "total_correct": 0,
                "count": 0,
            }
        breakdown_map[game_key]["total_attempts"] += se.attempts
        breakdown_map[game_key]["total_correct"] += se.correct
        breakdown_map[game_key]["count"] += 1

    for act in ["who_is_this", "what_is_this", "where_is_this"]:
        subset = [e for e in q_events if e.activity == act]
        if subset:
            cor = sum(1 for e in subset if e.is_correct is True)
            breakdown_map[act] = {
                "activity": act,
                "label": ACTIVITY_LABELS.get(act, act.replace("_", " ").title()),
                "total_attempts": len(subset),
                "total_correct": cor,
                "count": len(subset),
            }

    breakdown: list[ActivityBreakdownItem] = []
    for item in breakdown_map.values():
        att = item["total_attempts"]
        cor = item["total_correct"]
        acc = round((cor / att) * 100) if att > 0 else 0
        breakdown.append(
            ActivityBreakdownItem(
                activity=item["activity"],
                label=item["label"],
                accuracy=acc,
                count=item["count"],
            )
        )

    # Overall accuracy calculation
    total_attempts_all = sum(se.attempts for se in s_events) + len(q_events)
    total_correct_all = sum(se.correct for se in s_events) + sum(
        1 for e in q_events if e.is_correct is True
    )
    if total_attempts_all > 0:
        overall_acc = round((total_correct_all / total_attempts_all) * 100)
    elif s_events:
        overall_acc = round((sum(se.accuracy for se in s_events) / len(s_events)) * 100)
    else:
        overall_acc = 0

    return PatientProgressOut(
        patient_id=patient_id,
        total_sessions=len(session_summaries),
        overall_accuracy=overall_acc,
        sessions=session_summaries,
        activity_breakdown=breakdown,
    )


async def get_patient_trends(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[TrendPointOut]:
    """Daily rolled up accuracy and response time points for trend charts."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    # Fetch SessionEvent records
    se_query = select(SessionEvent).where(SessionEvent.patient_id == patient_id)
    if from_date:
        se_query = se_query.where(SessionEvent.started_at >= from_date)
    if to_date:
        se_query = se_query.where(SessionEvent.started_at <= to_date)
    se_query = se_query.order_by(SessionEvent.started_at.asc())
    s_events = (await session.scalars(se_query)).all()

    # Fetch QuestionEvent records
    qe_query = select(QuestionEvent).where(
        QuestionEvent.patient_id == patient_id,
        QuestionEvent.is_correct.is_not(None),
    )
    if from_date:
        qe_query = qe_query.where(QuestionEvent.asked_at >= from_date)
    if to_date:
        qe_query = qe_query.where(QuestionEvent.asked_at <= to_date)
    qe_query = qe_query.order_by(QuestionEvent.asked_at.asc())
    q_events = (await session.scalars(qe_query)).all()

    by_day: dict[str, dict[str, Any]] = {}

    for se in s_events:
        day_str = se.started_at.strftime("%Y-%m-%d")
        if day_str not in by_day:
            by_day[day_str] = {
                "attempts": 0,
                "correct": 0,
                "resp_times": [],
                "sessions_count": 0,
            }
        by_day[day_str]["attempts"] += se.attempts
        by_day[day_str]["correct"] += se.correct
        by_day[day_str]["resp_times"].append(se.avg_response_ms)
        by_day[day_str]["sessions_count"] += 1

    for qe in q_events:
        day_str = qe.asked_at.strftime("%Y-%m-%d")
        if day_str not in by_day:
            by_day[day_str] = {
                "attempts": 0,
                "correct": 0,
                "resp_times": [],
                "sessions_count": 0,
            }
        by_day[day_str]["attempts"] += 1
        if qe.is_correct:
            by_day[day_str]["correct"] += 1
        if qe.time_taken_ms:
            by_day[day_str]["resp_times"].append(qe.time_taken_ms)

    points: list[TrendPointOut] = []
    for day_str, stats in sorted(by_day.items()):
        att = stats["attempts"]
        cor = stats["correct"]
        acc = round((cor / att) * 100, 1) if att > 0 else 0.0
        times = stats["resp_times"]
        avg_resp = round(sum(times) / len(times)) if times else 0

        points.append(
            TrendPointOut(
                date=day_str,
                accuracy=acc,
                avg_response_ms=avg_resp,
                sessions_count=stats["sessions_count"],
            )
        )

    return points


# --- Casual Play Logs ---


async def list_casual_play(
    session: AsyncSession, caregiver_id: str, patient_id: UUID
) -> list[CasualPlayOut]:
    """Retrieve casual un-scored games played by a patient."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    stmt = (
        select(CasualPlayLog)
        .where(CasualPlayLog.patient_id == patient_id)
        .order_by(CasualPlayLog.played_at.desc())
    )
    results = (await session.scalars(stmt)).all()
    return [CasualPlayOut.model_validate(r) for r in results]


async def create_casual_play(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    data: CasualPlayCreateIn,
) -> CasualPlayOut:
    """Record a casual play session."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    log = CasualPlayLog(
        patient_id=patient_id,
        game_key=data.game_key,
        played_at=data.played_at or _utcnow(),
        duration_sec=data.duration_sec,
    )
    session.add(log)
    await session.commit()
    await session.refresh(log)
    return CasualPlayOut.model_validate(log)


# --- Activity Feed ---


async def get_activity_feed(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID | None = None,
    limit: int = 50,
    offset: int = 0,
) -> ActivityFeedOut:
    """Retrieve a chronological question/session event feed across linked patients."""
    if patient_id:
        await ensure_caregiver_patient_access(session, caregiver_id, patient_id)
        target_ids = [patient_id]
    else:
        links_stmt = select(PatientCaregiver.patient_id).where(
            PatientCaregiver.caregiver_id == caregiver_id,
            PatientCaregiver.status == LINK_ACTIVE,
        )
        target_ids = list((await session.scalars(links_stmt)).all())

    if not target_ids:
        return ActivityFeedOut(events=[], total=0)

    # Preload patient map
    patients_stmt = select(Patient).where(Patient.id.in_(target_ids))
    patients_map = {p.id: p for p in (await session.scalars(patients_stmt)).all()}

    # Fetch SessionEvent rows
    se_stmt = (
        select(SessionEvent)
        .where(SessionEvent.patient_id.in_(target_ids))
        .order_by(SessionEvent.ended_at.desc())
    )
    s_events = (await session.scalars(se_stmt)).all()

    # Fetch QuestionEvent rows
    qe_stmt = (
        select(QuestionEvent)
        .where(QuestionEvent.patient_id.in_(target_ids))
        .order_by(QuestionEvent.asked_at.desc())
    )
    q_events = (await session.scalars(qe_stmt)).all()

    # Subject map for QuestionEvents
    subject_ids = {e.subject_id for e in q_events if e.subject_id is not None}
    subjects_map: dict[UUID, MemorySubject] = {}
    if subject_ids:
        subj_stmt = select(MemorySubject).where(MemorySubject.id.in_(subject_ids))
        subjects_map = {s.id: s for s in (await session.scalars(subj_stmt)).all()}

    feed_items: list[QuestionEventOut] = []

    # Map SessionEvent items
    for se in s_events:
        p = patients_map.get(se.patient_id)
        p_name = await _resolve_patient_display_name(p) if p else None
        p_avatar = await _resolve_patient_avatar(p) if p else None
        act_label = ACTIVITY_LABELS.get(
            se.game_id, se.game_id.replace("_", " ").replace("-", " ").title()
        )

        feed_items.append(
            QuestionEventOut(
                id=se.id,
                session_id=se.id,
                patient_id=se.patient_id,
                patient_name=p_name,
                patient_avatar_url=p_avatar,
                subject_id=None,
                subject_name=None,
                activity=se.game_id,
                activity_label=act_label,
                n_options=se.total,
                is_correct=se.completed,
                time_taken_ms=se.duration_ms,
                hints_used=0,
                reason=f"Difficulty {se.difficulty}",
                asked_at=se.ended_at,
            )
        )

    # Map QuestionEvent items
    for e in q_events:
        p = patients_map.get(e.patient_id)
        p_name = await _resolve_patient_display_name(p) if p else None
        p_avatar = await _resolve_patient_avatar(p) if p else None
        subj = subjects_map.get(e.subject_id) if e.subject_id else None
        subj_name = subj.name if subj else None

        feed_items.append(
            QuestionEventOut(
                id=e.id,
                session_id=e.session_id,
                patient_id=e.patient_id,
                patient_name=p_name,
                patient_avatar_url=p_avatar,
                subject_id=e.subject_id,
                subject_name=subj_name,
                activity=e.activity,
                activity_label=ACTIVITY_LABELS.get(
                    e.activity, e.activity.replace("_", " ").title()
                ),
                n_options=e.n_options,
                is_correct=e.is_correct,
                time_taken_ms=e.time_taken_ms,
                hints_used=e.hints_used,
                reason=e.reason,
                asked_at=e.asked_at,
            )
        )

    # Sort combined feed newest first
    feed_items.sort(key=lambda item: item.asked_at, reverse=True)
    total = len(feed_items)
    paged = feed_items[offset : offset + limit]

    return ActivityFeedOut(events=paged, total=total)


# --- Attention Flags & Notifications ---


async def get_attention_flags(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID | None = None,
) -> list[AttentionFlagOut]:
    """Detect clinically meaningful deviations from a patient's own history (D-08).

    Flags are advisory observations for caregivers, never automated clinical diagnoses.
    """
    if patient_id:
        patient, _ = await ensure_caregiver_patient_access(session, caregiver_id, patient_id)
        target_patients = [patient]
    else:
        stmt = (
            select(Patient)
            .join(PatientCaregiver, PatientCaregiver.patient_id == Patient.id)
            .where(
                PatientCaregiver.caregiver_id == caregiver_id,
                PatientCaregiver.status == LINK_ACTIVE,
            )
        )
        target_patients = list((await session.scalars(stmt)).all())

    flags: list[AttentionFlagOut] = []
    now = _utcnow()
    two_days_ago = now - timedelta(days=2)
    fourteen_days_ago = now - timedelta(days=14)

    for p in target_patients:
        name = await _resolve_patient_display_name(p)

        # 1. Inactivity Flag: check SessionEvent and GameSession
        last_se_time = await session.scalar(
            select(SessionEvent.ended_at)
            .where(SessionEvent.patient_id == p.id)
            .order_by(SessionEvent.ended_at.desc())
            .limit(1)
        )
        last_gs_time = await session.scalar(
            select(GameSession.started_at)
            .where(GameSession.patient_id == p.id)
            .order_by(GameSession.started_at.desc())
            .limit(1)
        )
        last_session = last_se_time or last_gs_time

        if last_session and last_session < two_days_ago:
            days_inactive = (now - last_session).days
            flags.append(
                AttentionFlagOut(
                    id=f"flag_inactivity_{p.id}",
                    patient_id=p.id,
                    patient_name=name,
                    flag_type="inactivity",
                    severity="medium",
                    title=f"{name} has been inactive",
                    description=f"No sessions recorded in {days_inactive} days.",
                    observed_at=now,
                )
            )

        # 2. Performance Deviation against 14-day baseline
        recent_se = (
            await session.scalars(
                select(SessionEvent)
                .where(
                    SessionEvent.patient_id == p.id,
                    SessionEvent.ended_at >= fourteen_days_ago,
                )
                .order_by(SessionEvent.ended_at.asc())
            )
        ).all()

        if len(recent_se) >= 4:
            baseline_se = [e for e in recent_se if e.ended_at < two_days_ago]
            latest_se = [e for e in recent_se if e.ended_at >= two_days_ago]

            if len(baseline_se) >= 2 and len(latest_se) >= 1:
                base_acc = sum(e.accuracy for e in baseline_se) / len(baseline_se)
                latest_acc = sum(e.accuracy for e in latest_se) / len(latest_se)

                # Deviation threshold > 20%
                if (base_acc - latest_acc) > 0.20:
                    flags.append(
                        AttentionFlagOut(
                            id=f"flag_accuracy_{p.id}",
                            patient_id=p.id,
                            patient_name=name,
                            flag_type="accuracy_drop",
                            severity="high",
                            title=f"Accuracy change observed for {name}",
                            description=(
                                f"Recent accuracy ({round(latest_acc * 100)}%) is "
                                f"lower than the previous 2-week baseline ({round(base_acc * 100)}%)."
                            ),
                            observed_at=now,
                        )
                    )

    return flags


async def get_notifications(session: AsyncSession, caregiver_id: str) -> list[NotificationOut]:
    """Generate dynamic feed of activity updates, new memories, and attention alerts."""
    notifications: list[NotificationOut] = []

    # 1. Attention flags
    flags = await get_attention_flags(session, caregiver_id)
    for f in flags:
        notifications.append(
            NotificationOut(
                id=f.id,
                type="alert",
                title=f.title,
                description=f.description,
                time=_format_time_ago(f.observed_at),
                timestamp=f.observed_at,
                read=False,
                patient_id=f.patient_id,
            )
        )

    # 2. Recent session completions from SessionEvent
    links_stmt = select(PatientCaregiver.patient_id).where(
        PatientCaregiver.caregiver_id == caregiver_id,
        PatientCaregiver.status == LINK_ACTIVE,
    )
    patient_ids = list((await session.scalars(links_stmt)).all())

    if patient_ids:
        recent_se_stmt = (
            select(SessionEvent, Patient)
            .join(Patient, Patient.id == SessionEvent.patient_id)
            .where(SessionEvent.patient_id.in_(patient_ids))
            .order_by(SessionEvent.ended_at.desc())
            .limit(10)
        )
        recent_se = (await session.execute(recent_se_stmt)).all()

        for se, p in recent_se:
            name = await _resolve_patient_display_name(p)
            acc = round(se.accuracy * 100) if se.accuracy <= 1.0 else round(se.accuracy)
            game_name = ACTIVITY_LABELS.get(se.game_id, se.game_id.title())
            notifications.append(
                NotificationOut(
                    id=f"notif_se_{se.id}",
                    type="activity",
                    title=f"{name} played {game_name}",
                    description=f"{se.correct}/{se.attempts} correct · {acc}% accuracy.",
                    time=_format_time_ago(se.ended_at),
                    timestamp=se.ended_at,
                    read=False,
                    patient_id=p.id,
                )
            )

        # 3. Recent memory subjects
        recent_memories_stmt = (
            select(MemorySubject, Patient)
            .join(Patient, Patient.id == MemorySubject.patient_id)
            .where(
                MemorySubject.patient_id.in_(patient_ids),
                MemorySubject.is_active.is_(True),
            )
            .order_by(MemorySubject.created_at.desc())
            .limit(5)
        )
        recent_memories = (await session.execute(recent_memories_stmt)).all()

        for m, p in recent_memories:
            name = await _resolve_patient_display_name(p)
            notifications.append(
                NotificationOut(
                    id=f"notif_memory_{m.id}",
                    type="memory",
                    title=f"New memory subject added for {name}",
                    description=f'"{m.name}{f", {m.relation}" if m.relation else ""}" added.',
                    time=_format_time_ago(m.created_at),
                    timestamp=m.created_at,
                    read=False,
                    patient_id=p.id,
                )
            )

    # Sort all notifications newest first
    notifications.sort(key=lambda n: n.timestamp, reverse=True)
    return notifications[:20]


__all__ = [
    "create_casual_play",
    "create_memory_subject",
    "create_patient",
    "delete_memory_subject",
    "delete_patient",
    "ensure_caregiver_patient_access",
    "get_activity_feed",
    "get_attention_flags",
    "get_dashboard_summary",
    "get_notifications",
    "get_patient_detail",
    "get_patient_progress",
    "get_patient_trends",
    "list_casual_play",
    "list_memory_subjects",
    "list_patients",
    "update_memory_subject",
    "update_patient",
]


# --- Reminders -------------------------------------------------------------------------
#
# The caregiver owns these; the phone pulls them and takes what it is given
# (`data-model.md` §3 rule 2). Nothing here reaches the device directly — a change lands on
# the phone the next time it drains, over `GET /sync/pull` (D-34), and a caregiver has to be
# able to trust that a reminder they switched off stops appearing without them being sure
# *when*. That is why a delete is soft: a hard one is invisible to a watermark, and a phone
# that was off for a week would keep showing a reminder nobody can see any more.


async def list_reminders(
    session: AsyncSession, caregiver_id: str, patient_id: UUID, *, include_inactive: bool = True
) -> list[ReminderOut]:
    """Every reminder set up for a patient, newest first.

    Deleted ones are never returned here. The dashboard is a view of what is in force; only
    the sync path needs to know what used to be.
    """
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    query = select(Reminder).where(
        Reminder.patient_id == patient_id,
        Reminder.deleted_at.is_(None),
    )

    if not include_inactive:
        query = query.where(Reminder.active.is_(True))

    results = (await session.scalars(query.order_by(Reminder.created_at.desc()))).all()

    return [ReminderOut.model_validate(r) for r in results]


async def create_reminder(
    session: AsyncSession, caregiver_id: str, patient_id: UUID, data: ReminderCreateIn
) -> ReminderOut:
    """Set up a new reminder for a patient."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    now = _utcnow()
    reminder = Reminder(
        patient_id=patient_id,
        kind=data.kind,
        title=data.title.strip(),
        detail=data.detail.strip() if data.detail else None,
        schedule=data.schedule,
        active=data.active,
        created_by=caregiver_id,
        created_at=now,
        updated_at=now,
    )
    session.add(reminder)
    await session.commit()
    await session.refresh(reminder)

    return ReminderOut.model_validate(reminder)


async def update_reminder(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
    reminder_id: UUID,
    data: ReminderUpdateIn,
) -> ReminderOut:
    """Change a reminder. Only the fields that were sent are touched."""
    reminder = await _owned_reminder(session, caregiver_id, patient_id, reminder_id)

    if data.kind is not None:
        reminder.kind = data.kind
    if data.title is not None:
        reminder.title = data.title.strip()
    if data.detail is not None:
        # An empty string is how a caregiver clears the second line, and it has to survive
        # the trip as a null rather than as two spaces the phone would draw an empty row for.
        reminder.detail = data.detail.strip() or None
    if data.schedule is not None:
        reminder.schedule = data.schedule
    if data.active is not None:
        reminder.active = data.active

    reminder.updated_at = _utcnow()
    await session.commit()
    await session.refresh(reminder)

    return ReminderOut.model_validate(reminder)


async def delete_reminder(
    session: AsyncSession, caregiver_id: str, patient_id: UUID, reminder_id: UUID
) -> None:
    """Retire a reminder.

    **Soft, and it has to be.** `deleted_at` is what tells a phone that has been off for a
    week to stop showing something; a row that simply vanished would be invisible to
    `GET /sync/pull?since=` and the reminder would go on appearing on the device forever.
    The reminder events it already produced are untouched — nothing removes a fact.
    """
    reminder = await _owned_reminder(session, caregiver_id, patient_id, reminder_id)

    now = _utcnow()
    reminder.deleted_at = now
    # Belt and braces for any reader of this table that predates the soft delete and filters
    # on `active` alone.
    reminder.active = False
    reminder.updated_at = now
    await session.commit()


async def _owned_reminder(
    session: AsyncSession, caregiver_id: str, patient_id: UUID, reminder_id: UUID
) -> Reminder:
    """The reminder, if this caregiver is allowed to touch it."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    reminder = await session.scalar(
        select(Reminder).where(
            Reminder.id == reminder_id,
            Reminder.patient_id == patient_id,
            Reminder.deleted_at.is_(None),
        )
    )

    if reminder is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found.",
        )

    return reminder


# --- AI Patient Insights ---


async def generate_patient_ai_insights(
    session: AsyncSession,
    caregiver_id: str,
    patient_id: UUID,
) -> PatientAiInsightsOut:
    """Generate on-demand AI clinical and daily routine insights for a patient using Google Gemini.

    Compares strictly against this patient's own baseline history (AGENTS.md §2.4).
    Anonymized metrics only — no PII is sent to the model (§2.5).
    """
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    # Check for valid Gemini API key
    if not settings.gemini_api_key or settings.gemini_api_key.strip() in (
        "",
        "your_gemini_api_key_here",
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini AI is not configured. Please add a valid GEMINI_API_KEY to apps/api/.env.",
        )

    window_days = 30
    now = _utcnow()
    since_dt = now - timedelta(days=window_days)
    recent_7d_dt = now - timedelta(days=7)

    # 1. Fetch SessionEvents
    s_events = (
        await session.scalars(
            select(SessionEvent)
            .where(SessionEvent.patient_id == patient_id, SessionEvent.ended_at >= since_dt)
            .order_by(SessionEvent.ended_at.desc())
        )
    ).all()

    # 2. Fetch ReminderEvents
    r_events = (
        await session.scalars(
            select(ReminderEvent)
            .where(ReminderEvent.patient_id == patient_id, ReminderEvent.due_at >= since_dt)
            .order_by(ReminderEvent.due_at.desc())
        )
    ).all()

    # 3. Fetch CasualPlayLogs
    casual_logs = (
        await session.scalars(
            select(CasualPlayLog).where(
                CasualPlayLog.patient_id == patient_id, CasualPlayLog.played_at >= since_dt
            )
        )
    ).all()

    # 4. Fetch MemorySubjects count
    memories_count = (
        await session.scalar(
            select(func.count(MemorySubject.id)).where(
                MemorySubject.patient_id == patient_id, MemorySubject.is_active.is_(True)
            )
        )
    ) or 0

    # Aggregate cognitive stats
    sessions_count = len(s_events)
    if sessions_count > 0:
        total_attempts = sum(e.attempts for e in s_events)
        total_correct = sum(e.correct for e in s_events)
        overall_accuracy = (
            round((total_correct / total_attempts) * 100)
            if total_attempts > 0
            else round((sum(e.accuracy for e in s_events) / sessions_count) * 100)
        )
        avg_speed_sec = sum(e.avg_response_ms for e in s_events) / (sessions_count * 1000)

        # 7-day slice
        recent_events = [e for e in s_events if e.ended_at >= recent_7d_dt]
        if recent_events:
            r_attempts = sum(e.attempts for e in recent_events)
            r_correct = sum(e.correct for e in recent_events)
            accuracy_7d = (
                round((r_correct / r_attempts) * 100)
                if r_attempts > 0
                else round((sum(e.accuracy for e in recent_events) / len(recent_events)) * 100)
            )
        else:
            accuracy_7d = overall_accuracy
    else:
        overall_accuracy = 0
        accuracy_7d = 0
        avg_speed_sec = 0.0

    # Aggregate reminder adherence stats
    reminders_count = len(r_events)
    if reminders_count > 0:
        done_count = sum(1 for r in r_events if r.outcome == "done")
        adherence_pct = round((done_count / reminders_count) * 100)

        # Split by time of day
        mornings = [r for r in r_events if 5 <= r.due_at.hour < 12]
        afternoons = [r for r in r_events if 12 <= r.due_at.hour < 17]
        evenings = [r for r in r_events if 17 <= r.due_at.hour < 23]

        morning_adh = (
            round((sum(1 for r in mornings if r.outcome == "done") / len(mornings)) * 100)
            if mornings
            else 100
        )
        afternoon_adh = (
            round((sum(1 for r in afternoons if r.outcome == "done") / len(afternoons)) * 100)
            if afternoons
            else 100
        )
        evening_adh = (
            round((sum(1 for r in evenings if r.outcome == "done") / len(evenings)) * 100)
            if evenings
            else 100
        )
    else:
        adherence_pct = 100
        morning_adh = 100
        afternoon_adh = 100
        evening_adh = 100

    casual_count = len(casual_logs)

    # Prepare anonymized structured prompt for Gemini
    stats_payload = {
        "analysis_window_days": window_days,
        "cognitive_metrics": {
            "total_sessions": sessions_count,
            "overall_accuracy_pct": overall_accuracy,
            "recent_7d_accuracy_pct": accuracy_7d,
            "avg_response_time_sec": round(avg_speed_sec, 2),
            "trend_direction": "up"
            if accuracy_7d > overall_accuracy + 3
            else ("down" if accuracy_7d < overall_accuracy - 5 else "stable"),
        },
        "routine_adherence": {
            "total_reminders": reminders_count,
            "overall_adherence_pct": adherence_pct,
            "morning_adherence_pct": morning_adh,
            "afternoon_adherence_pct": afternoon_adh,
            "evening_adherence_pct": evening_adh,
        },
        "engagement": {
            "active_memory_subjects": memories_count,
            "casual_games_played": casual_count,
        },
    }

    system_instruction = (
        "You are an empathetic, clinical AI assistant for Smaran, an offline-first cognitive care platform for elderly people with dementia. "
        "Your role is to analyze a patient's historical telemetry and provide warm, insightful, non-diagnostic observations for their family caregiver.\n\n"
        "Strict Guidelines:\n"
        "1. PERSONAL BASELINE ONLY: Compare the individual only against their own historical data window. Never cite population norms or averages.\n"
        "2. NON-DIAGNOSTIC & EMPATHETIC: Use warm, supportive second-person language. Never diagnose, stage dementia, or cause panic. Frame observations constructively.\n"
        "3. OBSERVATIONS: Provide 2 to 4 key observations across cognitive patterns, routine adherence, and engagement.\n"
        "4. ROUTINE INSIGHTS: Break down morning, afternoon, and evening routines concisely.\n"
        "5. ACTIONABLE CAREGIVER TIPS: Give 2 to 3 practical, daily suggestions (e.g. hydration timing, photo memories, optimal play times).\n"
        "6. Return strictly valid JSON adhering to the requested schema."
    )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )

    response_schema = {
        "type": "OBJECT",
        "properties": {
            "status_level": {"type": "STRING", "enum": ["thriving", "steady", "attention"]},
            "headline": {"type": "STRING"},
            "observations": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "category": {
                            "type": "STRING",
                            "enum": ["cognitive", "routine", "engagement", "fatigue"],
                        },
                        "title": {"type": "STRING"},
                        "description": {"type": "STRING"},
                        "trend": {"type": "STRING", "enum": ["improving", "steady", "attention"]},
                        "highlight_metric": {"type": "STRING"},
                    },
                    "required": ["category", "title", "description", "trend"],
                },
            },
            "routine_insights": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "time_of_day": {
                            "type": "STRING",
                            "enum": ["morning", "afternoon", "evening", "all_day"],
                        },
                        "adherence_rate": {"type": "INTEGER"},
                        "observation": {"type": "STRING"},
                    },
                    "required": ["time_of_day", "adherence_rate", "observation"],
                },
            },
            "actionable_tips": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "priority": {
                            "type": "STRING",
                            "enum": ["recommended", "suggestion", "note"],
                        },
                        "title": {"type": "STRING"},
                        "advice": {"type": "STRING"},
                    },
                    "required": ["priority", "title", "advice"],
                },
            },
        },
        "required": [
            "status_level",
            "headline",
            "observations",
            "routine_insights",
            "actionable_tips",
        ],
    }

    body = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            f"System: {system_instruction}\n\n"
                            f"Patient Telemetry:\n{json.dumps(stats_payload, indent=2)}\n\n"
                            "Generate the structured caregiver insights JSON with rich observations, routine items, and tips."
                        )
                    }
                ],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": response_schema,
            "temperature": 0.3,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, json=body)
    except httpx.TimeoutException as err:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Gemini AI request timed out. Please try again in a few seconds.",
        ) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to connect to Google Gemini API: {err}",
        ) from err

    if resp.status_code != 200:
        error_detail = resp.text
        try:
            err_json = resp.json()
            if "error" in err_json and "message" in err_json["error"]:
                error_detail = err_json["error"]["message"]
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Gemini API error ({resp.status_code}): {error_detail}",
        )

    result = resp.json()
    candidates = result.get("candidates", [])
    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini AI returned an empty response. Please try again.",
        )

    # Collect text parts from Gemini candidate
    text_parts = [
        p.get("text", "")
        for p in candidates[0].get("content", {}).get("parts", [])
        if "text" in p and p.get("text", "").strip()
    ]
    raw_text = text_parts[-1] if text_parts else ""
    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini AI produced no text content.",
        )

    try:
        parsed = json.loads(raw_text)
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse Gemini AI response JSON: {err}",
        ) from err

    # 1. Parse Status Level
    status_level = str(parsed.get("status_level", "steady")).lower()
    if status_level not in ("thriving", "steady", "attention"):
        status_level = "steady"

    # 2. Parse Headline
    headline = str(
        parsed.get(
            "headline",
            "Consistent telemetry patterns observed across cognitive play and daily routines.",
        )
    )

    # 3. Parse Observations
    raw_obs = parsed.get("observations", [])
    observations: list[AiObservationItem] = []
    if isinstance(raw_obs, list):
        for o in raw_obs:
            if isinstance(o, dict) and "title" in o and "description" in o:
                cat = str(o.get("category", "cognitive")).lower()
                trend = str(o.get("trend", "steady")).lower()
                if trend not in ("improving", "steady", "attention"):
                    trend = "steady"
                observations.append(
                    AiObservationItem(
                        category=cat
                        if cat in ("cognitive", "routine", "engagement", "fatigue")
                        else "cognitive",
                        title=str(o["title"]),
                        description=str(o["description"]),
                        trend=trend,
                        highlight_metric=str(o.get("highlight_metric", "")) or None,
                    )
                )
            elif isinstance(o, str) and o.strip():
                observations.append(
                    AiObservationItem(
                        category="cognitive"
                        if "cognitive" in o.lower() or "accuracy" in o.lower()
                        else "routine",
                        title="Observed Behavioral Trend",
                        description=o.strip(),
                        trend="steady",
                    )
                )

    # If observations are sparse, enrich with computed facts
    if len(observations) < 2:
        if sessions_count > 0:
            observations.append(
                AiObservationItem(
                    category="cognitive",
                    title="Cognitive Performance Baseline",
                    description=f"Recorded {sessions_count} sessions with {overall_accuracy}% overall accuracy and ~{avg_speed_sec:.1f}s average response time.",
                    trend="steady" if accuracy_7d >= overall_accuracy - 5 else "attention",
                    highlight_metric=f"{accuracy_7d}% 7-day avg",
                )
            )
        if reminders_count > 0:
            observations.append(
                AiObservationItem(
                    category="routine",
                    title="Daily Schedule Adherence",
                    description=f"{adherence_pct}% overall completion rate across scheduled daily reminders.",
                    trend="improving" if adherence_pct >= 85 else "steady",
                    highlight_metric=f"{adherence_pct}% adherence",
                )
            )

    # 4. Parse Routine Insights
    raw_rout = parsed.get("routine_insights", [])
    routine_insights: list[AiRoutineItem] = []
    if isinstance(raw_rout, list):
        for r in raw_rout:
            if isinstance(r, dict) and "observation" in r:
                tod = str(r.get("time_of_day", "all_day")).lower()
                adh = int(r.get("adherence_rate", adherence_pct))
                routine_insights.append(
                    AiRoutineItem(
                        time_of_day=tod
                        if tod in ("morning", "afternoon", "evening", "all_day")
                        else "all_day",
                        adherence_rate=max(0, min(100, adh)),
                        observation=str(r["observation"]),
                    )
                )
            elif isinstance(r, str) and r.strip():
                routine_insights.append(
                    AiRoutineItem(
                        time_of_day="all_day",
                        adherence_rate=adherence_pct,
                        observation=r.strip(),
                    )
                )

    # Ensure full morning/afternoon/evening routine cards are present
    existing_tods = {r.time_of_day for r in routine_insights}
    if "morning" not in existing_tods:
        routine_insights.insert(
            0,
            AiRoutineItem(
                time_of_day="morning",
                adherence_rate=morning_adh,
                observation="Morning routines and medications show consistent follow-up and good start to the day.",
            ),
        )
    if "afternoon" not in existing_tods:
        routine_insights.append(
            AiRoutineItem(
                time_of_day="afternoon",
                adherence_rate=afternoon_adh,
                observation="Afternoon hours show calm pacing; reminders are acknowledged reliably.",
            )
        )
    if "evening" not in existing_tods:
        routine_insights.append(
            AiRoutineItem(
                time_of_day="evening",
                adherence_rate=evening_adh,
                observation="Evening winding-down routine proceeds smoothly without notable disruption.",
            )
        )

    # 5. Parse Actionable Tips
    raw_tips = parsed.get("actionable_tips", [])
    actionable_tips: list[AiCaregiverTip] = []
    if isinstance(raw_tips, list):
        for t in raw_tips:
            if isinstance(t, dict) and "advice" in t:
                prio = str(t.get("priority", "suggestion")).lower()
                actionable_tips.append(
                    AiCaregiverTip(
                        priority=prio
                        if prio in ("recommended", "suggestion", "note")
                        else "suggestion",
                        title=str(t.get("title", "Caregiver Tip")),
                        advice=str(t["advice"]),
                    )
                )
            elif isinstance(t, str) and t.strip():
                actionable_tips.append(
                    AiCaregiverTip(
                        priority="suggestion",
                        title="Daily Routine Tip",
                        advice=t.strip(),
                    )
                )

    if not actionable_tips:
        actionable_tips = [
            AiCaregiverTip(
                priority="recommended",
                title="Gentle Afternoon Refreshment",
                advice="Offer a fresh glass of water or tea around 3 PM to maintain alertness and smooth routine adherence.",
            ),
            AiCaregiverTip(
                priority="suggestion",
                title="Personalized Memory Sharing",
                advice="Add 1 or 2 new family photos in the Memories section to keep recall games fresh and engaging.",
            ),
        ]

    return PatientAiInsightsOut(
        patient_id=patient_id,
        generated_at=now,
        model_used=f"Google {settings.gemini_model}",
        status_level=status_level,
        headline=headline,
        observations=observations,
        routine_insights=routine_insights,
        actionable_tips=actionable_tips,
        data_summary=AiDataWindowSummary(
            window_days=window_days,
            sessions_analyzed=sessions_count,
            reminders_analyzed=reminders_count,
            overall_accuracy=overall_accuracy,
            overall_adherence=adherence_pct,
        ),
    )
