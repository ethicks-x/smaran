"""The same guards in `Depends` form.

Use these to protect a whole router at once — something a decorator cannot do:

    router = APIRouter(dependencies=[Depends(requires_caregiver)])

or to take the verified caller as a parameter, which reads better than the decorator when
the handler needs the caller anyway:

    async def me(auth: CurrentUser) -> ProfileOut: ...
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends

from features.auth.schemas import AuthContext
from features.auth.service import authenticate, require_auth, require_caregiver


requires_auth = require_auth
"""401 unless the request carries a valid Clerk session."""

requires_caregiver = require_caregiver
"""401 if signed out, 403 if signed in without the caregiver role."""

optional_auth = authenticate
"""The caller if there is one, `None` otherwise. Never rejects the request."""

CurrentUser = Annotated[AuthContext, Depends(requires_auth)]
CurrentCaregiver = Annotated[AuthContext, Depends(requires_caregiver)]
MaybeCurrentUser = Annotated[AuthContext | None, Depends(optional_auth)]


__all__ = [
    "CurrentCaregiver",
    "CurrentUser",
    "MaybeCurrentUser",
    "optional_auth",
    "requires_auth",
    "requires_caregiver",
]
