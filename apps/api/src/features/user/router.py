from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter

from features.auth.decorators import auth_required

# Runtime import, not TYPE_CHECKING: FastAPI resolves `DbSession` against this module's
# globals to find the Depends inside it, and one it cannot resolve becomes a query param.
from features.database.db import DbSession  # noqa: TC001
from features.user.schemas import UserProfile
from features.user.service import resolve_current_user


if TYPE_CHECKING:
    from features.auth.schemas import AuthContext


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"feature": "user", "status": "ok"}


@router.get("/me", response_model=UserProfile)
@auth_required
async def read_current_user(db: DbSession, auth: AuthContext) -> UserProfile:
    """Who the caller is: their Clerk id, their granted roles, and their patient record.

    The patient app calls this to learn which patient it is holding — once, on sign-in or on
    a sync, into local storage. It is **not** on the path of any patient screen: nothing the
    reader can see may wait on a network call (§2.1), so a device that has never reached this
    endpoint still has to open, play and remind normally.

    A caregiver calling it gets `patient: null` and their roles, so one route resolves either
    audience and neither client has to know which shape to expect before it asks.
    """
    return await resolve_current_user(db, auth)
