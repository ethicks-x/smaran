"""Reads behind the `/users` routes. Routers stay thin; the queries live here."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import select

from core.config import settings
from features.auth.service import granted_roles
from features.database.models import Patient, Role
from features.user.schemas import PatientProfile, UserProfile


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession

    from features.auth.schemas import AuthContext


async def get_patient_for_user(session: AsyncSession, user_id: str) -> Patient | None:
    """The patient record a Clerk user id is enrolled against, if there is one.

    `patients.user_id` is unique but nullable — a patient may be provisioned by a caregiver
    before the device is ever signed in — so a missing row is ordinary, not an error.
    """
    return await session.scalar(select(Patient).where(Patient.user_id == user_id))


async def get_smaran_id(session: AsyncSession, user_id: str) -> int | None:
    """The caller's shareable Smaran id, if they have a `roles` row yet.

    A caller with no row is ordinary — an account created in Clerk that has not self-enrolled
    — so `None` means "not ready", never an error.
    """
    return await session.scalar(select(Role.smaran_id).where(Role.id == user_id))


async def resolve_current_user(session: AsyncSession, context: AuthContext) -> UserProfile:
    """Resolve the signed-in caller into the profile the clients ask for.

    Roles come from the `roles` table and only from there (decisions.md D-14).
    """
    roles = await granted_roles(context.user_id)
    patient = await get_patient_for_user(session, context.user_id)
    smaran_id = await get_smaran_id(session, context.user_id)

    return UserProfile(
        user_id=context.user_id,
        roles=sorted(roles),
        is_caregiver=settings.caregiver_role.strip().lower() in roles,
        smaran_id=smaran_id,
        patient=PatientProfile.model_validate(patient) if patient is not None else None,
    )


__all__ = ["get_patient_for_user", "get_smaran_id", "resolve_current_user"]
