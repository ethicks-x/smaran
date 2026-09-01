"""The routes behind setting up who looks after a patient. Thin — logic is in `service.py`.

Two audiences, one table. The patient's phone asks where its own link stands and, once,
creates it; the caregiver's dashboard reads the requests waiting for them and answers one.
The patient routes are guarded by nothing more than a valid session — a signed-in account
asking about itself — and the caregiver routes are guarded by the caregiver role, like
every other route that can reach somebody else's data (`AGENTS.md` §2.5).
"""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID  # noqa: TC003

from fastapi import APIRouter

from features.auth.decorators import auth_required, caregiver_required
from features.care.schemas import (  # noqa: TC001
    CareLinkOut,
    CareLinkRequestIn,
    CareRequestDecisionIn,
    CareRequestOut,
)
from features.care.service import decide_request, get_link, list_requests, request_link

# Runtime import, not TYPE_CHECKING: FastAPI resolves annotations against module globals.
from features.database.db import DbSession  # noqa: TC001


if TYPE_CHECKING:
    from features.auth.schemas import AuthContext


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"feature": "care", "status": "ok"}


@router.get("/link", response_model=CareLinkOut)
@auth_required
async def read_care_link(db: DbSession, auth: AuthContext) -> CareLinkOut:
    """Where the signed-in patient's link stands: `none`, `pending`, `active` or `revoked`.

    The device caches whatever comes back and gates its setup screen on the cache, never on
    this call (§2.1). A phone that cannot reach us keeps the answer it already had, which is
    why a linked phone still opens on a mountain with no signal.
    """
    return await get_link(db, auth.user_id)


@router.post("/link", response_model=CareLinkOut)
@auth_required
async def create_care_link(
    payload: CareLinkRequestIn, db: DbSession, auth: AuthContext
) -> CareLinkOut:
    """Ask the caregiver holding this Smaran id to look after the signed-in patient.

    The request lands as `pending` and grants nothing on its own. Quoting somebody's Smaran
    id at this route is exactly as much access as knowing their phone number — the caregiver
    still has to answer.

    Idempotent: a reader who taps twice, or comes back tomorrow to the same number, gets the
    request that already exists rather than a second one for somebody to answer.
    """
    return await request_link(db, auth.user_id, payload.smaran_id)


@router.get("/requests", response_model=list[CareRequestOut])
@caregiver_required
async def read_care_requests(db: DbSession, auth: AuthContext) -> list[CareRequestOut]:
    """Patients waiting on this caregiver to accept them."""
    return await list_requests(db, auth.user_id)


@router.post("/requests/{link_id}", response_model=CareRequestOut)
@caregiver_required
async def answer_care_request(
    link_id: UUID, payload: CareRequestDecisionIn, db: DbSession, auth: AuthContext
) -> CareRequestOut:
    """Accept a patient (`active`) or turn the request down (`revoked`).

    This is the only thing in the codebase that grants a caregiver access to a patient, and
    it is why the request has to exist first: access is something a patient asked for and a
    caregiver agreed to, never something either half arranged alone.
    """
    return await decide_request(db, auth.user_id, link_id, payload.status)
