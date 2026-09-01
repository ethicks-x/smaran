"""Queries, aggregations, and business logic for the Caregiver Dashboard.

Routers stay thin; all database operations and calculations live here.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import func, select

from core.clerk import resolve_clerk_user
from features.care.schemas import LINK_ACTIVE
from features.dashboard.schemas import (
    ActivityBreakdownItem,
    ActivityFeedOut,
    AttentionFlagOut,
    CasualPlayCreateIn,
    CasualPlayOut,
    DashboardSummaryOut,
    MemorySubjectCreateIn,
    MemorySubjectOut,
    MemorySubjectUpdateIn,
    NotificationOut,
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
    MemorySubject,
    Patient,
    PatientCaregiver,
    QuestionEvent,
    Reminder,
)


if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


ACTIVITY_LABELS: dict[str, str] = {
    "who_is_this": "Who is this?",
    "what_is_this": "What is this?",
    "where_is_this": "Where is this?",
    "pattern-match": "Matching Pairs",
    "daily-recall": "Daily Recall",
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

    # Session stats
    sessions_count_stmt = select(func.count(GameSession.id)).where(
        GameSession.patient_id == patient.id
    )
    sessions_count = (await session.scalar(sessions_count_stmt)) or 0

    # Accuracy from question events
    events_stmt = select(QuestionEvent.is_correct, QuestionEvent.asked_at).where(
        QuestionEvent.patient_id == patient.id,
        QuestionEvent.is_correct.is_not(None),
    )
    events = (await session.execute(events_stmt)).all()

    total_answered = len(events)
    correct_count = sum(1 for e in events if e.is_correct is True)
    accuracy = round((correct_count / total_answered) * 100) if total_answered > 0 else 0

    last_active_at = None
    if events:
        last_active_at = max(e.asked_at for e in events)
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
        today_stmt = select(func.count(QuestionEvent.id)).where(
            QuestionEvent.patient_id.in_(patient_ids),
            QuestionEvent.asked_at >= today_start,
        )
        activities_today = (await session.scalar(today_stmt)) or 0

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


async def delete_patient(session: AsyncSession, caregiver_id: str, patient_id: UUID) -> None:
    """Remove a patient linkage and their records."""
    patient, link = await ensure_caregiver_patient_access(session, caregiver_id, patient_id)
    await session.delete(link)
    await session.delete(patient)
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

    return [MemorySubjectOut.model_validate(m) for m in results]


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


# --- Progress, Sessions & Analytics ---


async def get_patient_progress(
    session: AsyncSession, caregiver_id: str, patient_id: UUID
) -> PatientProgressOut:
    """Retrieve structured progress metrics, session history, and activity breakdown."""
    await ensure_caregiver_patient_access(session, caregiver_id, patient_id)

    # Fetch game sessions
    sessions_stmt = (
        select(GameSession)
        .where(GameSession.patient_id == patient_id)
        .order_by(GameSession.started_at.desc())
    )
    sessions = (await session.scalars(sessions_stmt)).all()

    # Fetch question events
    events_stmt = select(QuestionEvent).where(
        QuestionEvent.patient_id == patient_id,
        QuestionEvent.is_correct.is_not(None),
    )
    events = (await session.scalars(events_stmt)).all()

    # Session summaries
    session_summaries: list[SessionSummaryOut] = []
    for s in sessions:
        s_events = [e for e in events if e.session_id == s.id]
        answered_count = len(s_events)
        correct_count = sum(1 for e in s_events if e.is_correct is True)
        acc = round((correct_count / answered_count) * 100) if answered_count > 0 else 0
        times = [e.time_taken_ms for e in s_events if e.time_taken_ms is not None]
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

    # Activity breakdown
    activity_types = ["who_is_this", "what_is_this", "where_is_this"]
    breakdown: list[ActivityBreakdownItem] = []
    for act in activity_types:
        subset = [e for e in events if e.activity == act]
        if subset:
            cor = sum(1 for e in subset if e.is_correct is True)
            breakdown.append(
                ActivityBreakdownItem(
                    activity=act,
                    label=ACTIVITY_LABELS.get(act, act.replace("_", " ").title()),
                    accuracy=round((cor / len(subset)) * 100),
                    count=len(subset),
                )
            )

    total_answered = len(events)
    total_correct = sum(1 for e in events if e.is_correct is True)
    overall_acc = round((total_correct / total_answered) * 100) if total_answered > 0 else 0

    return PatientProgressOut(
        patient_id=patient_id,
        total_sessions=len(sessions),
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

    query = select(QuestionEvent).where(
        QuestionEvent.patient_id == patient_id,
        QuestionEvent.is_correct.is_not(None),
    )
    if from_date:
        query = query.where(QuestionEvent.asked_at >= from_date)
    if to_date:
        query = query.where(QuestionEvent.asked_at <= to_date)

    query = query.order_by(QuestionEvent.asked_at.asc())
    events = (await session.scalars(query)).all()

    # Group by day
    by_day: dict[str, list[QuestionEvent]] = {}
    for e in events:
        day_str = e.asked_at.strftime("%Y-%m-%d")
        by_day.setdefault(day_str, []).append(e)

    points: list[TrendPointOut] = []
    for day_str, day_events in sorted(by_day.items()):
        total = len(day_events)
        correct = sum(1 for e in day_events if e.is_correct is True)
        accuracy = round((correct / total) * 100, 1) if total > 0 else 0.0
        times = [e.time_taken_ms for e in day_events if e.time_taken_ms is not None]
        avg_resp = round(sum(times) / len(times)) if times else 0
        session_ids = {e.session_id for e in day_events}

        points.append(
            TrendPointOut(
                date=day_str,
                accuracy=accuracy,
                avg_response_ms=avg_resp,
                sessions_count=len(session_ids),
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
    """Retrieve a chronological question event feed across linked patients."""
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

    # Count total
    count_stmt = select(func.count(QuestionEvent.id)).where(
        QuestionEvent.patient_id.in_(target_ids)
    )
    total = (await session.scalar(count_stmt)) or 0

    # Query events
    events_stmt = (
        select(QuestionEvent)
        .where(QuestionEvent.patient_id.in_(target_ids))
        .order_by(QuestionEvent.asked_at.desc())
        .offset(offset)
        .limit(limit)
    )
    events = (await session.scalars(events_stmt)).all()

    # Preload patient and memory subjects maps
    patients_stmt = select(Patient).where(Patient.id.in_(target_ids))
    patients_map = {p.id: p for p in (await session.scalars(patients_stmt)).all()}

    subject_ids = {e.subject_id for e in events if e.subject_id is not None}
    subjects_map: dict[UUID, MemorySubject] = {}
    if subject_ids:
        subj_stmt = select(MemorySubject).where(MemorySubject.id.in_(subject_ids))
        subjects_map = {s.id: s for s in (await session.scalars(subj_stmt)).all()}

    feed_items: list[QuestionEventOut] = []
    for e in events:
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

    return ActivityFeedOut(events=feed_items, total=total)


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

        # 1. Inactivity Flag
        last_session = await session.scalar(
            select(GameSession.started_at)
            .where(GameSession.patient_id == p.id)
            .order_by(GameSession.started_at.desc())
            .limit(1)
        )
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
        events_stmt = select(QuestionEvent.is_correct, QuestionEvent.asked_at).where(
            QuestionEvent.patient_id == p.id,
            QuestionEvent.asked_at >= fourteen_days_ago,
            QuestionEvent.is_correct.is_not(None),
        )
        recent_events = (await session.execute(events_stmt)).all()

        if len(recent_events) >= 10:
            # Split into baseline (older than 2 days) and latest (last 2 days)
            baseline = [e for e in recent_events if e.asked_at < two_days_ago]
            latest = [e for e in recent_events if e.asked_at >= two_days_ago]

            if len(baseline) >= 5 and len(latest) >= 3:
                base_acc = sum(1 for e in baseline if e.is_correct) / len(baseline)
                latest_acc = sum(1 for e in latest if e.is_correct) / len(latest)

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

    # 2. Recent session completions
    links_stmt = select(PatientCaregiver.patient_id).where(
        PatientCaregiver.caregiver_id == caregiver_id,
        PatientCaregiver.status == LINK_ACTIVE,
    )
    patient_ids = list((await session.scalars(links_stmt)).all())

    if patient_ids:
        recent_sessions_stmt = (
            select(GameSession, Patient)
            .join(Patient, Patient.id == GameSession.patient_id)
            .where(GameSession.patient_id.in_(patient_ids))
            .order_by(GameSession.started_at.desc())
            .limit(5)
        )
        recent_sessions = (await session.execute(recent_sessions_stmt)).all()

        for s, p in recent_sessions:
            name = await _resolve_patient_display_name(p)
            questions_stmt = select(QuestionEvent.is_correct).where(
                QuestionEvent.session_id == s.id,
                QuestionEvent.is_correct.is_not(None),
            )
            s_events = list((await session.scalars(questions_stmt)).all())
            ans_count = len(s_events)
            cor_count = sum(1 for c in s_events if c is True)
            acc = round((cor_count / ans_count) * 100) if ans_count > 0 else 0

            notifications.append(
                NotificationOut(
                    id=f"notif_session_{s.id}",
                    type="activity",
                    title=f"{name} completed a session",
                    description=f"{ans_count} questions answered · {acc}% accuracy.",
                    time=_format_time_ago(s.started_at),
                    timestamp=s.started_at,
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

    reminder = Reminder(
        patient_id=patient_id,
        kind=data.kind,
        title=data.title.strip(),
        detail=data.detail.strip() if data.detail else None,
        schedule=data.schedule,
        active=data.active,
        created_by=caregiver_id,
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

    reminder.deleted_at = _utcnow()
    # Belt and braces for any reader of this table that predates the soft delete and filters
    # on `active` alone.
    reminder.active = False

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
