from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
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


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[UUID] = _pk()
    role: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[UUID] = _pk()
    # Clerk owns identity, so this points at an external user id and carries no foreign key.
    user_id: Mapped[UUID | None] = mapped_column(PgUuid(as_uuid=True), unique=True, nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(8), nullable=True)

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


class PatientCaregiver(Base):
    __tablename__ = "patient_caregivers"

    id: Mapped[UUID] = _pk()
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), index=True, nullable=False
    )
    caregiver_id: Mapped[UUID] = mapped_column(PgUuid(as_uuid=True), index=True, nullable=False)
    # The attribute cannot be called `relationship` — that name is the imported ORM function
    # and shadowing it breaks every relationship() call below it in the class body.
    relation: Mapped[str | None] = mapped_column("relationship", String(100), nullable=True)

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
    created_by: Mapped[UUID | None] = mapped_column(PgUuid(as_uuid=True), nullable=True)
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
    subject_id: Mapped[UUID] = mapped_column(
        ForeignKey("memory_subjects.id", ondelete="CASCADE"), index=True, nullable=False
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
    subject: Mapped[MemorySubject] = relationship(back_populates="question_events")


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


__all__ = [
    "CasualPlayLog",
    "GameSession",
    "MemorySubject",
    "Patient",
    "PatientCaregiver",
    "QuestionEvent",
    "Role",
]
