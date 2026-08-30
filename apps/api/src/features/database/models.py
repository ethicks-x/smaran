from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import Boolean, Date, ForeignKey, Integer, SmallInteger, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from features.database.db import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    role: Mapped[str] = mapped_column(String, nullable=False)


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    user_id: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), unique=True, nullable=True)
    dob: Mapped[date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_number: Mapped[str | None] = mapped_column(String(32), nullable=True)
    preferred_language: Mapped[str | None] = mapped_column(String(8), nullable=True)

    memory_subjects: Mapped[list["MemorySubject"]] = relationship("MemorySubject", back_populates="patient")
    game_sessions: Mapped[list["GameSession"]] = relationship("GameSession", back_populates="patient")
    casual_play_logs: Mapped[list["CasualPlayLog"]] = relationship("CasualPlayLog", back_populates="patient")
    question_events: Mapped[list["QuestionEvent"]] = relationship("QuestionEvent", back_populates="patient")
    patient_caregivers: Mapped[list["PatientCaregiver"]] = relationship("PatientCaregiver", back_populates="patient")


class PatientCaregiver(Base):
    __tablename__ = "patient_caregivers"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), nullable=False)
    caregiver_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    relationship: Mapped[str | None] = mapped_column(String(100), nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="patient_caregivers")


class MemorySubject(Base):
    __tablename__ = "memory_subjects"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    relationship: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_by: Mapped[UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC), nullable=False)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="memory_subjects")
    question_events: Mapped[list["QuestionEvent"]] = relationship("QuestionEvent", back_populates="subject")


class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)
    questions_planned: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    questions_answered: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="game_sessions")
    question_events: Mapped[list["QuestionEvent"]] = relationship("QuestionEvent", back_populates="session")


class QuestionEvent(Base):
    __tablename__ = "question_events"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    session_id: Mapped[UUID] = mapped_column(ForeignKey("game_sessions.id"), nullable=False)
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), nullable=False)
    subject_id: Mapped[UUID] = mapped_column(ForeignKey("memory_subjects.id"), nullable=False)
    activity: Mapped[str] = mapped_column(String(50), nullable=False)
    n_options: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    time_taken_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hints_used: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    asked_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC), nullable=False)

    session: Mapped["GameSession"] = relationship("GameSession", back_populates="question_events")
    patient: Mapped["Patient"] = relationship("Patient", back_populates="question_events")
    subject: Mapped["MemorySubject"] = relationship("MemorySubject", back_populates="question_events")


class CasualPlayLog(Base):
    __tablename__ = "casual_play_log"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default="gen_random_uuid()")
    patient_id: Mapped[UUID] = mapped_column(ForeignKey("patients.id"), nullable=False)
    game_key: Mapped[str] = mapped_column(String(50), nullable=False)
    played_at: Mapped[datetime] = mapped_column(default=lambda: datetime.now(UTC), nullable=False)
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient", back_populates="casual_play_logs")


