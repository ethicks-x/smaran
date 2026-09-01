"""Who looks after this patient. The reads and writes behind `/care`.

A patient's phone is useless to a family nobody has connected it to, and the connection has
to start somewhere. It starts here: the caregiver reads their nine-digit Smaran id out, the
patient types it into the setup screen, and this module writes the `pending` row that says
so. Nothing about that row grants access — it is a request, and `approve` is the only thing
that turns it into access (`AGENTS.md` §2.5).

The patient side of this is the one network call the app makes that a reader waits on, and
it is deliberately the *only* one: it happens once, at setup, beside the sign-in that also
needs a network. Everything after it reads the device's cached answer, so a linked phone
opens with the radio off exactly as it did before (§2.1).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from fastapi import HTTPException, status
from sqlalchemy import select

from core.clerk import resolve_clerk_user
from core.config import settings
from features.auth.service import is_caregiver
from features.care.schemas import (
    LINK_ACTIVE,
    LINK_PENDING,
    LINK_REVOKED,
    CareLinkOut,
    CareLinkStatus,
    CareRequestOut,
)
from features.database.models import Patient, PatientCaregiver, Role


if TYPE_CHECKING:
    from uuid import UUID

    from sqlalchemy.ext.asyncio import AsyncSession


# Which state a patient with several caregivers is reported to be in: an approved link
# beats one still waiting, which beats one that has ended. The device draws a single screen
# from this, and "somebody has said yes" is the fact that screen turns on.
_STATUS_RANK = {LINK_ACTIVE: 3, LINK_PENDING: 2, LINK_REVOKED: 1}

# Plain, warm and about the number rather than the person who typed it. A reader with
# dementia is looking at this sentence, so it never says "invalid" and never blames.
NOT_FOUND_MESSAGE = "We could not find anyone with that number. Please check it and try again."
CAREGIVER_MESSAGE = "This account looks after other people, so it cannot ask for a carer."


def _status_of(link: PatientCaregiver) -> CareLinkStatus:
    """The stored status, narrowed to the three values the wire knows.

    The column is a plain `String(16)` — a hand-written row or an older migration could put
    something else in it, and reporting an unrecognised status as `none` sends the reader
    back to setup rather than into a screen the app cannot draw.
    """
    if link.status in _STATUS_RANK:
        return cast("CareLinkStatus", link.status)

    return "none"


async def find_caregiver(session: AsyncSession, smaran_id: int) -> str | None:
    """The Clerk id of the caregiver holding this Smaran id, if there is one.

    Only a caregiver's id is looked up. Every account has one — the sequence hands them out
    to patients too — and a patient typing another patient's number is a mistake we would
    rather name than quietly turn into a link nobody can approve.
    """
    return await session.scalar(
        select(Role.id).where(
            Role.smaran_id == smaran_id,
            Role.role == settings.caregiver_role.strip().lower(),
        )
    )


async def ensure_patient(session: AsyncSession, user_id: str) -> Patient:
    """The patient record for this signed-in account, creating it on first setup.

    This is the moment a self-signed-up reader becomes a row: until now the account existed
    in Clerk and in `roles`, and `patients` — which every synced table hangs off — had
    nothing to attribute their rounds to. Creating it here rather than at sign-in keeps it
    tied to a deliberate act, and makes `POST /sync/*`'s 409 a state that setup resolves
    rather than one a reader can be stuck in forever.

    Nothing but the Clerk id is written. Date of birth, address and language belong to the
    caregiver's own screens; a blank record is the honest shape of what we know here.
    """
    patient = await session.scalar(select(Patient).where(Patient.user_id == user_id))

    if patient is None:
        patient = Patient(user_id=user_id, enrolled_by=user_id)
        session.add(patient)
        await session.flush()

    return patient


async def _link_out(session: AsyncSession, link: PatientCaregiver | None) -> CareLinkOut:
    """One link row as the device reads it, with the caregiver's number resolved."""
    if link is None:
        return CareLinkOut(status="none")

    smaran_id = await session.scalar(select(Role.smaran_id).where(Role.id == link.caregiver_id))

    return CareLinkOut(status=_status_of(link), caregiver_smaran_id=smaran_id)


async def _strongest_link(session: AsyncSession, patient_id: UUID) -> PatientCaregiver | None:
    links = (
        await session.scalars(
            select(PatientCaregiver).where(PatientCaregiver.patient_id == patient_id)
        )
    ).all()

    if not links:
        return None

    return max(links, key=lambda link: _STATUS_RANK.get(link.status, 0))


async def get_link(session: AsyncSession, user_id: str) -> CareLinkOut:
    """Where the signed-in patient's own link stands, or `none`.

    A caller with no `patients` row is `none` rather than a 404: a phone that has signed in
    and not been set up is the ordinary first launch, and an error there would put the
    reader in front of a failure they did nothing to cause (§2.3).
    """
    patient = await session.scalar(select(Patient).where(Patient.user_id == user_id))

    if patient is None:
        return CareLinkOut(status="none")

    return await _link_out(session, await _strongest_link(session, patient.id))


async def request_link(session: AsyncSession, user_id: str, smaran_id: int) -> CareLinkOut:
    """Ask the caregiver holding `smaran_id` to look after the signed-in patient.

    Idempotent, because the setup screen is reachable again after a phone is closed
    mid-request: asking twice for the same caregiver returns the row that already exists
    rather than stacking up requests for somebody to answer one by one. A link that was
    revoked and is asked for again goes back to `pending` — ending access is not the same as
    refusing to consider it a second time, and the caregiver still has to say yes.
    """
    if await is_caregiver(user_id):
        # A caregiver account on a patient's phone would otherwise get a `patients` row of
        # its own and start syncing somebody else's afternoons into it.
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=CAREGIVER_MESSAGE)

    caregiver_id = await find_caregiver(session, smaran_id)

    if caregiver_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=NOT_FOUND_MESSAGE)

    patient = await ensure_patient(session, user_id)

    link = await session.scalar(
        select(PatientCaregiver).where(
            PatientCaregiver.patient_id == patient.id,
            PatientCaregiver.caregiver_id == caregiver_id,
        )
    )

    if link is None:
        link = PatientCaregiver(
            patient_id=patient.id, caregiver_id=caregiver_id, status=LINK_PENDING
        )
        session.add(link)
    elif link.status == LINK_REVOKED:
        link.status = LINK_PENDING

    await session.commit()
    await session.refresh(link)

    return await _link_out(session, link)


async def _build_request_out(session: AsyncSession, link: PatientCaregiver) -> CareRequestOut:
    patient = await session.get(Patient, link.patient_id)
    patient_name: str | None = None
    patient_avatar_url: str | None = None
    patient_email: str | None = None
    patient_phone: str | None = None

    if patient and patient.user_id:
        clerk_user = await resolve_clerk_user(patient.user_id)
        if clerk_user:
            patient_name = clerk_user.full_name or clerk_user.email or clerk_user.phone
            patient_avatar_url = clerk_user.avatar_url
            patient_email = clerk_user.email
            patient_phone = clerk_user.phone

    if not patient_name and patient:
        patient_name = f"Patient {str(patient.id)[:8]}"

    return CareRequestOut(
        id=link.id,
        patient_id=link.patient_id,
        status=_status_of(link),
        patient_name=patient_name,
        patient_avatar_url=patient_avatar_url,
        patient_email=patient_email,
        patient_phone=patient_phone,
    )


async def list_requests(session: AsyncSession, caregiver_id: str) -> list[CareRequestOut]:
    """Every patient waiting on this caregiver's answer.

    In no particular order: `patient_caregivers` has no timestamp, so these come back in whatever order the table
    holds them. That is fine for a handful of requests and would not be for a hundred —
    a `requested_at` column is the fix when it matters.
    """
    links = (
        await session.scalars(
            select(PatientCaregiver).where(
                PatientCaregiver.caregiver_id == caregiver_id,
                PatientCaregiver.status == LINK_PENDING,
            )
        )
    ).all()

    return [await _build_request_out(session, link) for link in links]


async def decide_request(
    session: AsyncSession, caregiver_id: str, link_id: UUID, decision: str
) -> CareRequestOut:
    """Accept or turn down one request. The only thing that ever grants access.

    Scoped to the caregiver the row names, so a caregiver cannot answer somebody else's
    request by guessing its id. A row that is not theirs is a 404 rather than a 403 — that
    a link exists at all is a fact about a patient they have no relationship with.
    """
    link = await session.get(PatientCaregiver, link_id)

    if link is None or link.caregiver_id != caregiver_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="That request no longer exists."
        )

    link.status = decision
    await session.commit()
    await session.refresh(link)

    return await _build_request_out(session, link)


__all__ = [
    "CAREGIVER_MESSAGE",
    "NOT_FOUND_MESSAGE",
    "decide_request",
    "ensure_patient",
    "find_caregiver",
    "get_link",
    "list_requests",
    "request_link",
]
