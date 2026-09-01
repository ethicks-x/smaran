from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PatientCardOut(BaseModel):
    """Overview card for a patient linked to the authenticated caregiver."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str | None = None
    full_name: str
    avatar_url: str | None = None
    dob: date | None = None
    address: str | None = None
    contact_number: str | None = None
    preferred_language: str | None = None
    relationship: str | None = None
    sessions_count: int = 0
    overall_accuracy: int = 0
    last_active_at: datetime | None = None


class PatientDetailOut(BaseModel):
    """Detailed profile and quick stats for a patient."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str | None = None
    full_name: str
    avatar_url: str | None = None
    dob: date | None = None
    address: str | None = None
    contact_number: str | None = None
    preferred_language: str | None = None
    relationship: str | None = None
    sessions_count: int = 0
    overall_accuracy: int = 0
    memory_subjects_count: int = 0
    last_active_at: datetime | None = None


class PatientCreateIn(BaseModel):
    """Payload to register a new patient and link them to the caregiver."""

    user_id: str | None = Field(
        None, description="Clerk user ID if patient has already signed in on device"
    )
    dob: date | None = None
    address: str | None = None
    contact_number: str | None = None
    preferred_language: str = "as"
    relationship: str | None = Field(
        None, description="Caregiver's relation to patient (e.g. son, daughter, ASHA worker)"
    )


class PatientUpdateIn(BaseModel):
    """Payload to update patient profile information."""

    user_id: str | None = None
    dob: date | None = None
    address: str | None = None
    contact_number: str | None = None
    preferred_language: str | None = None
    relationship: str | None = None


class DashboardSummaryOut(BaseModel):
    """Summary metrics and patient list for the caregiver dashboard home."""

    total_patients: int
    activities_today: int
    total_memory_subjects: int
    needs_attention: int
    patients: list[PatientCardOut]


class MemorySubjectOut(BaseModel):
    """A personalized person, place, or object recognition subject."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    kind: str  # "person" | "place" | "object"
    name: str | None = None
    relation: str | None = None
    photo_url: str | None = None
    is_active: bool = True
    created_by: str | None = None
    created_at: datetime


class MemorySubjectCreateIn(BaseModel):
    """Payload to add a new memory subject for a patient."""

    kind: str = Field(..., description="person, place, or object")
    name: str = Field(..., min_length=1)
    relation: str | None = None
    photo_url: str | None = None
    is_active: bool = True


class MemorySubjectUpdateIn(BaseModel):
    """Payload to modify an existing memory subject."""

    name: str | None = None
    relation: str | None = None
    photo_url: str | None = None
    is_active: bool | None = None


class ReminderOut(BaseModel):
    """A reminder definition, as the caregiver set it up.

    Server-authoritative: the device takes what it is given (`data-model.md` §3 rule 2),
    which is what makes this the one mutable record with no conflict to resolve.

    `title` and `detail` are stored **already in the reader's language**. They are shown on
    the phone and one day spoken aloud exactly as typed here, and nothing on the device
    rewrites them — so a caregiver writing for an Assamese-speaking reader writes Assamese.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    kind: str  # "medicine" | "hydration" | "activity" | "appointment"
    title: str
    detail: str | None = None
    # `HH:MM|1111111` — a 24-hour local time and a days mask, Sunday first.
    schedule: str
    active: bool = True
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime


# The four kinds the phone knows how to draw and, later, to speak. A fifth would render as
# nothing recognisable on the device, so it is refused here rather than shipped to a screen.
REMINDER_KINDS = ("medicine", "hydration", "activity", "appointment")

# `HH:MM|1111111`, matching `parseSchedule` in `apps/mobile/src/lib/reminders.ts`. A string
# the phone cannot parse is a reminder it silently skips, so it is rejected at the door.
SCHEDULE_PATTERN = r"^([01]\d|2[0-3]):([0-5]\d)\|[01]{7}$"


# The one place the four kinds are written down. `features/sync` imports it, so the phone's
# door into this table and the caregiver's cannot come to disagree about what a reminder is.
ReminderKind = Literal["medicine", "hydration", "activity", "appointment"]


class ReminderCreateIn(BaseModel):
    """Payload to add a reminder for a patient."""

    kind: ReminderKind
    title: str = Field(..., min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=500)
    schedule: str = Field(..., pattern=SCHEDULE_PATTERN, examples=["09:00|1111111"])
    active: bool = True


class ReminderUpdateIn(BaseModel):
    """Payload to modify a reminder. Every field is optional; omitted ones are left alone."""

    kind: ReminderKind | None = None
    title: str | None = Field(None, min_length=1, max_length=200)
    detail: str | None = Field(None, max_length=500)
    schedule: str | None = Field(None, pattern=SCHEDULE_PATTERN)
    active: bool | None = None


class SessionSummaryOut(BaseModel):
    """Summary record of a cognitive game session."""

    id: UUID
    date: str
    questions_planned: int | None = None
    questions_answered: int | None = None
    accuracy: int
    avg_time_ms: int
    started_at: datetime
    ended_at: datetime | None = None


class ActivityBreakdownItem(BaseModel):
    """Accuracy and count metrics grouped by activity type."""

    activity: str
    label: str
    accuracy: int
    count: int


class PatientProgressOut(BaseModel):
    """Full progress report for a patient across all sessions and activities."""

    patient_id: UUID
    total_sessions: int
    overall_accuracy: int
    sessions: list[SessionSummaryOut]
    activity_breakdown: list[ActivityBreakdownItem]


class TrendPointOut(BaseModel):
    """Daily aggregated data point for trend charting."""

    date: str
    accuracy: float
    avg_response_ms: int
    sessions_count: int


class CasualPlayOut(BaseModel):
    """Record of a casual, non-scored game session (e.g. chess, sudoku)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    game_key: str
    played_at: datetime
    duration_sec: int | None = None


class CasualPlayCreateIn(BaseModel):
    """Payload to record a casual game session."""

    game_key: str
    played_at: datetime | None = None
    duration_sec: int = Field(..., ge=0)


class QuestionEventOut(BaseModel):
    """Single question attempt event in the activity feed."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    patient_id: UUID
    patient_name: str | None = None
    patient_avatar_url: str | None = None
    subject_id: UUID | None = None
    subject_name: str | None = None
    activity: str
    activity_label: str
    n_options: int | None = None
    is_correct: bool | None = None
    time_taken_ms: int | None = None
    hints_used: int = 0
    reason: str | None = None
    asked_at: datetime


class ActivityFeedOut(BaseModel):
    """Paginated question event feed."""

    events: list[QuestionEventOut]
    total: int


class NotificationOut(BaseModel):
    """Dashboard notification / alert item."""

    id: str
    type: str  # "activity" | "memory" | "alert"
    title: str
    description: str
    time: str
    timestamp: datetime
    read: bool = False
    patient_id: UUID | None = None


class AttentionFlagOut(BaseModel):
    """Rule-based clinical attention flag computed against personal baseline."""

    id: str
    patient_id: UUID
    patient_name: str
    flag_type: str
    severity: str  # "low" | "medium" | "high"
    title: str
    description: str
    observed_at: datetime


__all__ = [
    "ActivityBreakdownItem",
    "ActivityFeedOut",
    "AttentionFlagOut",
    "CasualPlayCreateIn",
    "CasualPlayOut",
    "DashboardSummaryOut",
    "MemorySubjectCreateIn",
    "MemorySubjectOut",
    "MemorySubjectUpdateIn",
    "NotificationOut",
    "PatientCardOut",
    "PatientCreateIn",
    "PatientDetailOut",
    "PatientProgressOut",
    "PatientUpdateIn",
    "QuestionEventOut",
    "ReminderCreateIn",
    "ReminderKind",
    "ReminderOut",
    "ReminderUpdateIn",
    "SessionSummaryOut",
    "TrendPointOut",
]
