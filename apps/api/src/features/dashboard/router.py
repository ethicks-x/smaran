from __future__ import annotations

from datetime import datetime  # noqa: TC003
from typing import TYPE_CHECKING, Annotated
from uuid import UUID  # noqa: TC003

from fastapi import APIRouter, Query

from features.auth.decorators import caregiver_required
from features.dashboard.schemas import (  # noqa: TC001
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
    TrendPointOut,
)
from features.dashboard.service import (
    create_casual_play,
    create_memory_subject,
    create_patient,
    delete_memory_subject,
    delete_patient,
    get_activity_feed,
    get_attention_flags,
    get_dashboard_summary,
    get_notifications,
    get_patient_detail,
    get_patient_progress,
    get_patient_trends,
    list_casual_play,
    list_memory_subjects,
    list_patients,
    update_memory_subject,
    update_patient,
)

# Runtime import, not TYPE_CHECKING: FastAPI resolves annotations against module globals.
from features.database.db import DbSession  # noqa: TC001


if TYPE_CHECKING:
    from features.auth.schemas import AuthContext


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"feature": "dashboard", "status": "ok"}


# --- Summary & Overview ---


@router.get("/summary")
@caregiver_required
async def read_dashboard_summary(db: DbSession, auth: AuthContext) -> DashboardSummaryOut:
    """Dashboard homepage statistics and patient overview cards."""
    return await get_dashboard_summary(db, auth.user_id)


# --- Patients Management ---


@router.get("/patients")
@caregiver_required
async def read_patients(db: DbSession, auth: AuthContext) -> list[PatientCardOut]:
    """List all patients linked to the authenticated caregiver."""
    return await list_patients(db, auth.user_id)


@router.post("/patients", status_code=201)
@caregiver_required
async def create_new_patient(
    db: DbSession,
    auth: AuthContext,
    payload: PatientCreateIn,
) -> PatientCardOut:
    """Register a new patient and link them to the current caregiver."""
    return await create_patient(db, auth.user_id, payload)


@router.get("/patients/{patient_id}")
@caregiver_required
async def read_patient_detail(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
) -> PatientDetailOut:
    """Fetch complete patient profile, stats, and caregiver relationship."""
    return await get_patient_detail(db, auth.user_id, patient_id)


@router.patch("/patients/{patient_id}")
@caregiver_required
async def update_patient_profile(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
    payload: PatientUpdateIn,
) -> PatientDetailOut:
    """Update patient information or relationship metadata."""
    return await update_patient(db, auth.user_id, patient_id, payload)


@router.delete("/patients/{patient_id}")
@caregiver_required
async def remove_patient(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
) -> dict[str, str]:
    """Remove a patient linkage and their records."""
    await delete_patient(db, auth.user_id, patient_id)
    return {"status": "deleted"}


# --- Memory Subjects ---


@router.get("/patients/{patient_id}/memories")
@caregiver_required
async def read_patient_memories(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
    kind: Annotated[str | None, Query(description="person, place, or object")] = None,
) -> list[MemorySubjectOut]:
    """List memory subjects for a patient, optionally filtered by kind."""
    return await list_memory_subjects(db, auth.user_id, patient_id, kind=kind)


@router.post("/patients/{patient_id}/memories", status_code=201)
@caregiver_required
async def add_memory_subject(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
    payload: MemorySubjectCreateIn,
) -> MemorySubjectOut:
    """Create a new person, place, or object memory subject for cognitive games."""
    return await create_memory_subject(db, auth.user_id, patient_id, payload)


@router.patch("/patients/{patient_id}/memories/{subject_id}")
@caregiver_required
async def modify_memory_subject(
    patient_id: UUID,
    subject_id: UUID,
    db: DbSession,
    auth: AuthContext,
    payload: MemorySubjectUpdateIn,
) -> MemorySubjectOut:
    """Update details or toggle active status of a memory subject."""
    return await update_memory_subject(db, auth.user_id, patient_id, subject_id, payload)


@router.delete("/patients/{patient_id}/memories/{subject_id}")
@caregiver_required
async def remove_memory_subject(
    patient_id: UUID,
    subject_id: UUID,
    db: DbSession,
    auth: AuthContext,
) -> dict[str, str]:
    """Remove a memory subject."""
    await delete_memory_subject(db, auth.user_id, patient_id, subject_id)
    return {"status": "deleted"}


# --- Progress, Sessions & Analytics ---


@router.get("/patients/{patient_id}/progress")
@caregiver_required
async def read_patient_progress(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
) -> PatientProgressOut:
    """Fetch session history, accuracy rollups, and breakdown by activity type."""
    return await get_patient_progress(db, auth.user_id, patient_id)


@router.get("/patients/{patient_id}/trends")
@caregiver_required
async def read_patient_trends(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
    from_date: Annotated[datetime | None, Query(alias="from")] = None,
    to_date: Annotated[datetime | None, Query(alias="to")] = None,
) -> list[TrendPointOut]:
    """Daily rolled up accuracy and response time points for trend charts."""
    return await get_patient_trends(db, auth.user_id, patient_id, from_date, to_date)


# --- Casual Play Logs ---


@router.get("/patients/{patient_id}/casual-play")
@caregiver_required
async def read_casual_play_logs(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
) -> list[CasualPlayOut]:
    """List non-scored casual games played by the patient (chess, sudoku, etc.)."""
    return await list_casual_play(db, auth.user_id, patient_id)


@router.post("/patients/{patient_id}/casual-play", status_code=201)
@caregiver_required
async def record_casual_play(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
    payload: CasualPlayCreateIn,
) -> CasualPlayOut:
    """Record a casual play session."""
    return await create_casual_play(db, auth.user_id, patient_id, payload)


# --- Activity Feed ---


@router.get("/activity")
@caregiver_required
async def read_activity_feed(
    db: DbSession,
    auth: AuthContext,
    patient_id: Annotated[UUID | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> ActivityFeedOut:
    """Activity feed of question attempts across all linked patients or filtered by patient."""
    return await get_activity_feed(
        db, auth.user_id, patient_id=patient_id, limit=limit, offset=offset
    )


# --- Notifications & Flags ---


@router.get("/notifications")
@caregiver_required
async def read_notifications(db: DbSession, auth: AuthContext) -> list[NotificationOut]:
    """Recent session completions, new memory subjects, and attention alerts."""
    return await get_notifications(db, auth.user_id)


@router.get("/patients/{patient_id}/flags")
@caregiver_required
async def read_patient_flags(
    patient_id: UUID,
    db: DbSession,
    auth: AuthContext,
) -> list[AttentionFlagOut]:
    """Advisory attention flags computed against a patient's own history baseline."""
    return await get_attention_flags(db, auth.user_id, patient_id=patient_id)
