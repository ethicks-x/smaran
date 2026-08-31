"""Clerk Backend API client and user profile resolution helpers.

Identity lives in Clerk; the server mirrors no person details in its tables (decisions.md
D-13, D-20). When a dashboard screen needs a display name or avatar for a person, this
module resolves the Clerk user id asynchronously through Clerk's Backend API.
"""

from __future__ import annotations

from dataclasses import dataclass

from clerk_backend_api import Clerk

from core.config import settings


@dataclass(frozen=True)
class ClerkUserProfile:
    user_id: str
    first_name: str | None = None
    last_name: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    email: str | None = None
    phone: str | None = None


_clerk_client: Clerk | None = None


def get_clerk_client() -> Clerk:
    """Singleton Clerk client configured with the server secret key."""
    global _clerk_client
    if _clerk_client is None:
        _clerk_client = Clerk(bearer_auth=settings.clerk_secret_key)
    return _clerk_client


async def resolve_clerk_user(user_id: str | None) -> ClerkUserProfile | None:
    """Fetch user profile from Clerk Backend API with error shielding.

    If Clerk is unreachable, secret is unconfigured, or the user id does not exist, this
    returns a graceful fallback containing the user_id rather than failing the request.
    """
    if not user_id:
        return None
    try:
        client = get_clerk_client()
        user = await client.users.get_async(user_id=user_id)
        if user is None:
            return ClerkUserProfile(user_id=user_id)

        first = user.first_name
        last = user.last_name
        full = f"{first or ''} {last or ''}".strip() or None

        email = None
        if user.email_addresses:
            primary_id = user.primary_email_address_id
            for em in user.email_addresses:
                if em.id == primary_id:
                    email = em.email_address
                    break
            if not email and len(user.email_addresses) > 0:
                email = user.email_addresses[0].email_address

        phone = None
        if user.unsafe_metadata and isinstance(user.unsafe_metadata, dict):
            raw_phone = user.unsafe_metadata.get("phone")
            if isinstance(raw_phone, str):
                phone = raw_phone

        return ClerkUserProfile(
            user_id=user.id,
            first_name=first,
            last_name=last,
            full_name=full,
            avatar_url=user.image_url,
            email=email,
            phone=phone,
        )
    except Exception:
        return ClerkUserProfile(user_id=user_id)


__all__ = ["ClerkUserProfile", "get_clerk_client", "resolve_clerk_user"]
