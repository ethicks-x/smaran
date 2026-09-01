from fastapi import APIRouter

from core.config import settings
from features.auth.decorators import auth_required
from features.auth.schemas import AuthContext, RoleGrantOut
from features.auth.service import self_enroll


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"feature": "auth", "status": "ok"}


@router.post("/caregiver-role")
@auth_required
async def enroll_caregiver_role(auth: AuthContext) -> RoleGrantOut:
    """Grant the caregiver role in Postgres to the signed-in Clerk user.

    The dashboard calls this once, straight after a new account is created. Safe to repeat:
    `self_enroll` is idempotent, so a client that could not reach us on sign-up simply asks
    again next time it loads.
    """
    granted = await self_enroll(auth.user_id, settings.caregiver_role)
    return RoleGrantOut(user_id=auth.user_id, role=settings.caregiver_role, granted=granted)


@router.post("/patient-role")
@auth_required
async def enroll_patient_role(auth: AuthContext) -> RoleGrantOut:
    """Grant the patient role in Postgres to the signed-in Clerk user.

    The patient app calls this once, after its first session becomes active. It is never on
    the path of a patient screen (§2.1): the phone works the same whether this call has
    landed or not, and retries on a later launch if it has not.
    """
    granted = await self_enroll(auth.user_id, settings.patient_role)
    return RoleGrantOut(user_id=auth.user_id, role=settings.patient_role, granted=granted)
