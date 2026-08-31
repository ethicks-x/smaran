from fastapi import APIRouter

from core.config import settings
from features.auth.decorators import auth_required
from features.auth.schemas import AuthContext, RoleGrantOut
from features.auth.service import grant_caregiver_role


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"feature": "auth", "status": "ok"}


@router.post("/caregiver-role")
@auth_required
async def enroll_caregiver_role(auth: AuthContext) -> RoleGrantOut:
    """Grant the caregiver role in Postgres to the signed-in Clerk user.

    Enables new caregivers to self-enroll upon creating an account in the dashboard.
    """
    await grant_caregiver_role(auth.user_id)
    return RoleGrantOut(user_id=auth.user_id, role=settings.caregiver_role, granted=True)
