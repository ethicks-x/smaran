from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
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


class Role(Base):
    """A role granted to a Clerk user. `id` is the Clerk user id, not a generated uuid."""

    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(_clerk_id(), primary_key=True)
    # Not unique: a role is held by many people. Indexed because the only query is
    # "who are the caregivers", never "what role is this".
    role: Mapped[str] = mapped_column(String(50), index=True, nullable=False)


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

    memory_subjects: Mapped[list[MemorySubject]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    memory_assets: Mapped[list[MemoryAsset]] = relationship(
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
    caregiver_id: Mapped[str] = mapped_column(_clerk_id(), index=True, nullable=False)
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
    created_by: Mapped[str | None] = mapped_column(_clerk_id(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )

    patient: Mapped[Patient] = relationship(back_populates="memory_subjects")
    question_events: Mapped[list[QuestionEvent]] = relationship(
        back_populates="subject", cascade="all, delete-orphan"
    )
    # No delete-orphan: the FK is SET NULL, because the object outlives the subject. A
    # picture the family uploaded is theirs, and dropping a recognition subject should not
    # silently orphan bytes in the bucket that nothing is left to point at or clean up.
    assets: Mapped[list[MemoryAsset]] = relationship(back_populates="subject")


class MemoryAsset(Base):
    """
    One media object in the memory bucket, and the row the phone syncs down to find it.

    The bytes never pass through this API. The dashboard asks for a presigned URL and PUTs
    the file straight at the bucket, so a large photo on a slow NER connection occupies a
    caregiver's browser for the length of the upload rather than an API worker. The phone
    reads these rows on sync and pulls each object once into its own media cache, because
    the Memories tab has to open with the radio off (`AGENTS.md` §2.1).
    """

    __tablename__ = "memory_assets"
    __table_args__ = (
        # An object is described exactly once. A retried upload reuses its row rather than
        # leaving behind a second row claiming bytes the first one already owns.
        UniqueConstraint("bucket", "object_key", name="uq_memory_assets_object"),
        # The phone's down-sync is "everything for this patient that changed since my
        # watermark", and it runs on every connectivity regain. It is the one query here
        # worth a composite index.
        Index("ix_memory_assets_patient_updated", "patient_id", "updated_at"),
    )

    id: Mapped[UUID] = _pk()
    # Deliberately not `index=True`, unlike every other `patient_id` here: the composite
    # index above already leads on this column, and Postgres uses it for a patient-only
    # lookup. A second index would be dead weight on every insert.
    patient_id: Mapped[UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    # Null for a memory that is only a shared picture. Set when the picture *is* a
    # recognition subject's photo, so swapping that photo is a row here and not a rewrite
    # of `memory_subjects.photo_url` — which would strand the object it used to name.
    subject_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("memory_subjects.id", ondelete="SET NULL"), index=True, nullable=True
    )
    # "photo" | "audio" | "story", spelled exactly as the device's `memory_item.kind`
    # (`data-model.md` §1) so a synced row needs no translation on the way down.
    kind: Mapped[str] = mapped_column(
        String(20), default="photo", server_default=text("'photo'"), nullable=False
    )

    # The bucket lives on the row and not only in config: a deployment's bucket can change,
    # and a row written against the old one still has to resolve afterwards.
    bucket: Mapped[str] = mapped_column(String(63), nullable=False)
    # What S3 actually answers to, and ours to generate — never the caregiver's own
    # filename. An uploaded name collides, often carries the patient's name, and can hold
    # characters that need escaping in every URL that will ever name it (§2.5).
    object_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    # The picture's name as the caregiver knows it: what the dashboard lists it under and
    # what a download saves as. Recognition over recall — "birthday-with-nati.jpg" is the
    # handle they will look for, and the object key is not something a person can read.
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # The object's ETag. The phone caches media to its filesystem and is offline most of
    # the time; comparing this is how it decides a cached file is stale without spending a
    # download to find out.
    etag: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # What the caregiver wrote about this memory: the caption shown under the picture and,
    # once there is TTS, the line read aloud. Plain warm prose in the patient's own
    # language — never a clinical note, which does not belong in this store at all
    # (§2.5, `data-model.md` §3.6).
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # "pending" until the browser's PUT lands and the dashboard confirms it, then "ready"
    # ("failed" if it never arrives). The row necessarily exists before the object does,
    # because minting the presigned URL is what writes it — so the phone must sync down
    # `ready` rows only, or it caches a broken file and shows a gap where a face should be.
    status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default=text("'pending'"), nullable=False
    )
    uploaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # A removed memory keeps its row instead of vanishing. The phone syncs on a watermark
    # and can never learn about a row that is simply gone, so a hard delete would leave the
    # picture on the device forever; flipping this is what tells it to drop the cached file.
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    uploaded_by: Mapped[str | None] = mapped_column(_clerk_id(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, server_default=func.now(), nullable=False
    )
    # The phone's down-sync watermark reads this column, so every edit has to move it —
    # a caption fixed after upload is a change the device must be told about.
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_utcnow,
        server_default=func.now(),
        onupdate=_utcnow,
        nullable=False,
    )

    patient: Mapped[Patient] = relationship(back_populates="memory_assets")
    subject: Mapped[MemorySubject | None] = relationship(back_populates="assets")


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


__all__ = [
    "CasualPlayLog",
    "GameSession",
    "MemoryAsset",
    "MemorySubject",
    "Patient",
    "PatientCaregiver",
    "QuestionEvent",
    "Role",
]
