from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AuthContext(BaseModel):
    """The verified caller — an identity, and deliberately not a set of permissions.

    Nothing here is looked up or stored: every field comes out of the token Clerk signed, so
    an `AuthContext` is exactly as trustworthy as that signature and no more. There is no
    `roles` field and no `has_role` for that reason — roles live in Postgres, so asking what
    a caller may do is a query (`service.has_role`), never an attribute read.
    """

    model_config = ConfigDict(frozen=True)

    # Clerk's own user id ("user_2ab…"), the value every person-shaped column in
    # `features/database/models.py` holds. See decisions.md D-20.
    user_id: str
    session_id: str | None = None
    org_id: str | None = None
    # The raw claims, for a caller that needs one this model does not name. Kept out of the
    # repr: a session's claims are diagnostic detail about a person (§2.5) and must not
    # reach a log line by accident.
    claims: dict[str, Any] = Field(default_factory=dict, repr=False)


class RoleGrantOut(BaseModel):
    user_id: str
    role: str
    granted: bool


__all__ = ["AuthContext", "RoleGrantOut"]
