"""Clerk authentication, as plain functions.

Everything a guard needs lives here and takes ordinary arguments, so the same checks are
available to a background job, a script or a service method — anywhere there is no route to
hang a decorator on. `decorators.py` and `dependencies.py` are thin wrappers over these.

The API owns no authentication route: sign-in, sign-up and refresh all happen in Clerk and
the backend only ever asks "is this token valid, and who does it belong to" (decisions.md
D-14).
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from clerk_backend_api.security import authenticate_request_async
from clerk_backend_api.security.types import AuthenticateRequestOptions
from fastapi import HTTPException, Request, status
from sqlalchemy import select

from core.config import settings
from features.auth.schemas import AuthContext
from features.database.db import SessionLocal
from features.database.models import Role


if TYPE_CHECKING:
    from clerk_backend_api.security.types import RequestState


# Clerk's failure reason is never passed on. It is diagnostic detail about someone's session
# (§2.5) and the caller can do nothing with it either way, so both failures say one plain
# thing and stop.
SIGNED_OUT_MESSAGE = "You need to be signed in to do that."
FORBIDDEN_MESSAGE = "You do not have access to this."


# Roles live in Postgres and nowhere else. Clerk answers "who is this", the `roles` table
# answers "what may they do" — nothing in a token grants anything, however it is spelled, so
# a misconfigured Clerk instance or a stale JWT template cannot widen access here.
def _normalise_role(value: object) -> str | None:
    """Fold one stored role into the canonical form so comparison is case-insensitive."""
    if not isinstance(value, str):
        return None
    return value.strip().lower() or None


async def granted_roles(user_id: str) -> frozenset[str]:
    """Every role granted to a Clerk user id in the `roles` table.

    The table is the grant of record (decisions.md D-20). A row is a grant, not an enum: a
    user with no rows holds no roles, and an unknown id is simply an empty set rather than
    an error — "not a caregiver" is the honest answer to both.
    """
    async with SessionLocal() as session:
        result = await session.scalars(select(Role.role).where(Role.id == user_id))
        return frozenset(role for role in (_normalise_role(v) for v in result.all()) if role)


async def has_role(user_id: str, *names: str) -> bool:
    """True if `user_id` has been granted any of `names`. Case-insensitive."""
    wanted = {name for name in (_normalise_role(n) for n in names) if name}
    if not wanted:
        return False
    return bool(wanted & await granted_roles(user_id))


async def is_caregiver(user_id: str) -> bool:
    """True if `user_id` holds the caregiver role, whatever this instance names it."""
    return await has_role(user_id, settings.caregiver_role)


# `Request` is imported at runtime, not under TYPE_CHECKING: FastAPI resolves a
# dependency's annotations against its module globals, and a `Request` it cannot resolve
# is read as a query parameter instead — every guarded route then 422s.
async def authenticate_state(request: Request) -> RequestState:
    """Verify the request's Clerk token and return Clerk's own view of it.

    Networkless when `CLERK_JWT_KEY` is set; otherwise this fetches Clerk's JWKS. Use it
    only when the reason for a failure matters — `authenticate` is the usual entry point.
    """
    return await authenticate_request_async(
        request,
        AuthenticateRequestOptions(
            secret_key=settings.clerk_secret_key,
            jwt_key=settings.clerk_jwt_key,
            authorized_parties=settings.clerk_authorized_parties or None,
        ),
    )


async def authenticate(request: Request) -> AuthContext | None:
    """The verified caller, or `None` when the request carries no usable session.

    This never raises for an unauthenticated request, which is what makes it the right
    function for a route that behaves differently when signed in rather than refusing.
    """
    state = await authenticate_state(request)
    if not state.is_signed_in or not state.payload:
        return None

    claims = state.payload
    user_id = claims.get("sub")
    if not isinstance(user_id, str) or not user_id:
        # A signed-in state with no subject is not something a caller can act on; treat it
        # as signed out rather than inventing an identity for it.
        return None

    return AuthContext(
        user_id=user_id,
        session_id=claims.get("sid"),
        org_id=claims.get("org_id"),
        claims=dict(claims),
    )


async def require_auth(request: Request) -> AuthContext:
    """The verified caller, or a 401. The check behind `@auth_required`."""
    context = await authenticate(request)
    if context is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=SIGNED_OUT_MESSAGE,
            headers={"WWW-Authenticate": "Bearer"},
        )
    return context


async def require_caregiver(request: Request) -> AuthContext:
    """The verified caller if they are a caregiver, or a 401/403.

    The check behind `@caregiver_required`. Every caregiver-facing route is authenticated
    (§2.5) — there is no such thing as an open dashboard endpoint.
    """
    context = await require_auth(request)
    if not await is_caregiver(context.user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=FORBIDDEN_MESSAGE,
        )
    return context


async def require_roles(request: Request, *roles: str) -> AuthContext:
    """The verified caller if they hold any of `roles`, or a 401/403.

    The general form of `require_caregiver`, for a role this module does not name.
    """
    context = await require_auth(request)
    if not await has_role(context.user_id, *roles):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=FORBIDDEN_MESSAGE)
    return context


async def grant_role(user_id: str, role_name: str) -> None:
    """Grant a role to a Clerk user id in the `roles` table if not already granted."""
    norm_role = _normalise_role(role_name)
    if not norm_role:
        return
    async with SessionLocal() as session:
        existing = await session.scalar(
            select(Role).where(Role.id == user_id, Role.role == norm_role)
        )
        if existing is None:
            session.add(Role(id=user_id, role=norm_role))
            await session.commit()


async def grant_caregiver_role(user_id: str) -> None:
    """Grant the caregiver role to a Clerk user id."""
    await grant_role(user_id, settings.caregiver_role)


__all__ = [
    "FORBIDDEN_MESSAGE",
    "SIGNED_OUT_MESSAGE",
    "authenticate",
    "authenticate_state",
    "granted_roles",
    "grant_caregiver_role",
    "grant_role",
    "has_role",
    "is_caregiver",
    "require_auth",
    "require_caregiver",
    "require_roles",
]
