"""Route guards, as decorators.

Place one directly under the `@router.*` decorator so it wraps the handler and not the
route:

    @router.get("/patients")
    @caregiver_required
    async def list_patients(auth: AuthContext) -> list[PatientOut]: ...

The handler may declare an `AuthContext` parameter to receive the verified caller, and a
`Request` parameter as usual. Both are optional, and neither has to be in any position.

To guard a whole router at once, use the `Depends` forms in `dependencies.py` — a decorator
cannot reach every route in a router.
"""

from __future__ import annotations

import inspect
from functools import wraps
from typing import TYPE_CHECKING, Any, TypeVar

from fastapi import Request
from starlette.concurrency import run_in_threadpool

from features.auth.schemas import AuthContext
from features.auth.service import require_auth, require_caregiver


if TYPE_CHECKING:
    from collections.abc import Awaitable, Callable

F = TypeVar("F", bound="Callable[..., Any]")

# Prefixed to keep it out of the way of any parameter a handler might legitimately name.
_REQUEST_PARAM = "__smaran_auth_request"


def _is_request(annotation: object) -> bool:
    # With `from __future__ import annotations` a handler's annotations are strings, so both
    # the resolved class and the written name have to be recognised.
    return annotation is Request or (
        isinstance(annotation, str) and annotation.split(".")[-1] == "Request"
    )


def _is_auth_context(annotation: object) -> bool:
    return annotation is AuthContext or (
        isinstance(annotation, str) and annotation.split(".")[-1] == "AuthContext"
    )


def _guard(check: Callable[[Request], Awaitable[AuthContext]]) -> Callable[[F], F]:
    """Build a decorator that runs `check` before the handler and injects its result.

    FastAPI decides what to inject by reading the handler's signature, so the wrapper has to
    present a signature FastAPI can still make sense of: a `Request` is appended if the
    handler does not already take one, and every `AuthContext` parameter is removed so it is
    not mistaken for a request body. Path params, query params and the return annotation all
    survive untouched, and neither injected parameter appears in the OpenAPI schema.
    """

    def decorate(func: F) -> F:
        signature = inspect.signature(func)
        parameters = list(signature.parameters.values())

        request_param = next((p.name for p in parameters if _is_request(p.annotation)), None)
        context_params = [p.name for p in parameters if _is_auth_context(p.annotation)]

        exposed = [p for p in parameters if p.name not in context_params]
        if request_param is None:
            request_param = _REQUEST_PARAM
            # Keyword-only and last, so it cannot disturb the handler's own positional
            # parameters however they are declared.
            exposed.append(
                inspect.Parameter(
                    _REQUEST_PARAM,
                    inspect.Parameter.KEYWORD_ONLY,
                    annotation=Request,
                )
            )

        is_async = inspect.iscoroutinefunction(func)

        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            request = kwargs.pop(_REQUEST_PARAM, None) or kwargs.get(request_param)
            if request is None:
                request = next((a for a in args if isinstance(a, Request)), None)
            if request is None:  # pragma: no cover - only reachable if FastAPI stops injecting
                raise RuntimeError(f"{func.__qualname__} is guarded but no Request reached it.")

            context = await check(request)
            for name in context_params:
                kwargs[name] = context

            if is_async:
                return await func(*args, **kwargs)
            # Sync handlers keep the threadpool treatment FastAPI would have given them had
            # the wrapper not made every handler look like a coroutine function.
            return await run_in_threadpool(func, *args, **kwargs)

        wrapper.__signature__ = signature.replace(parameters=exposed)  # type: ignore[attr-defined]
        return wrapper  # type: ignore[return-value]

    return decorate


auth_required = _guard(require_auth)
"""Reject anyone without a valid Clerk session with a 401."""

caregiver_required = _guard(require_caregiver)
"""Reject anyone who is not a caregiver — 401 if signed out, 403 if signed in."""


__all__ = ["auth_required", "caregiver_required"]
