"""The patient↔caregiver link, as it crosses the wire.

One row of `patient_caregivers` is the whole subject of this module: who looks after this
patient, and whether that has been agreed to yet. The link starts as a claim the patient
makes — they read a Smaran id off a piece of paper and type it in — so it arrives
`pending` and grants nothing until the caregiver says yes (`AGENTS.md` §2.5).

Nothing here carries a name, a photo or a contact detail. A patient asking to be looked
after learns only whether the number they typed belongs to somebody; a caregiver reading
their requests learns a patient id and no more.
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


# The three values `patient_caregivers.status` may hold, named once so the dashboard's read
# path and this feature's write path cannot drift apart. A caregiver may only ever read a
# patient behind an `active` row — `pending` is a request nobody has answered and `revoked`
# is access that has ended.
LINK_PENDING = "pending"
LINK_ACTIVE = "active"
LINK_REVOKED = "revoked"

# The Smaran id is nine digits and starts at 100,000,000 (`database/models.py`), so no valid
# id is shorter or longer. Validating the shape here means a typo comes back as "that is not
# a Smaran id" rather than as a lookup that quietly finds nobody.
SMARAN_ID_MIN = 100_000_000
SMARAN_ID_MAX = 999_999_999

# What a patient's device is told. `none` is not an error and not an empty result — it is
# the ordinary state of a phone that has been signed in and not yet set up.
CareLinkStatus = Literal["none", "pending", "active", "revoked"]


class CareLinkRequestIn(BaseModel):
    """A patient asking a caregiver, by Smaran id, to look after them."""

    smaran_id: int = Field(ge=SMARAN_ID_MIN, le=SMARAN_ID_MAX)


class CareLinkOut(BaseModel):
    """Where the patient's own link stands.

    The device stores this and gates its setup screen on it, so it has to answer with the
    radio off as well as on — which is why it is a single flat status rather than a list the
    client has to reduce. A patient with several caregivers reports the strongest state they
    are in: an approved link beats one still waiting, which beats one that has ended.
    """

    status: CareLinkStatus
    # The caregiver the reported status belongs to, so a phone can show which number it is
    # waiting on. Null when the status is `none`.
    caregiver_smaran_id: int | None = None


class CareRequestOut(BaseModel):
    """One patient waiting on this caregiver's answer.

    Deliberately thin. Approving is the moment access is granted, so everything a caregiver
    could use to recognise the patient sits behind the approval rather than in front of it —
    before there is an `active` row there is nothing here this endpoint may say about them.
    """

    id: UUID
    patient_id: UUID
    status: CareLinkStatus


class CareRequestDecisionIn(BaseModel):
    """A caregiver answering one request. `active` accepts it, `revoked` turns it down."""

    status: Literal["active", "revoked"]


__all__ = [
    "LINK_ACTIVE",
    "LINK_PENDING",
    "LINK_REVOKED",
    "SMARAN_ID_MAX",
    "SMARAN_ID_MIN",
    "CareLinkOut",
    "CareLinkRequestIn",
    "CareLinkStatus",
    "CareRequestDecisionIn",
    "CareRequestOut",
]
