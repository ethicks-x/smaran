from __future__ import annotations

from datetime import date
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PatientProfile(BaseModel):
    """The patient record the caller is linked to.

    Deliberately no name, photo or email: those live in Clerk and the app already has them
    without asking us (decisions.md D-13, D-20). What is here is what only the server knows.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    dob: date | None = None
    address: str | None = None
    contact_number: str | None = None
    preferred_language: str | None = None


class UserProfile(BaseModel):
    """Who the caller is, as far as this API is concerned.

    One endpoint answers for both audiences: a patient gets their own record in `patient`, a
    caregiver gets `patient: null` and a `caregiver` role. Neither has to know which shape to
    expect before it asks.
    """

    user_id: str
    roles: list[str]
    is_caregiver: bool
    # `null` for a caregiver, and also for a patient whose device has been signed in but not
    # yet enrolled against a record. The app must treat the second case as "not set up yet",
    # never as an error the reader is shown (§2.3).
    patient: PatientProfile | None = None


__all__ = ["UserProfile", "PatientProfile"]
