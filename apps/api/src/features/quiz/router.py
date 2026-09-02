"""The one route the phone calls to have questions written for it.

Thin, like every router here — the decisions are in `service.py`.

This endpoint is **optional by contract** (`AGENTS.md` §2.1). The recognition game opens,
plays and records itself on questions the phone already holds; this call is what puts a
better set there for next time. A phone that never reaches it plays exactly the same game,
which is why nothing here is on any screen's critical path.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from fastapi import APIRouter

from features.auth.decorators import auth_required

# Runtime import, not TYPE_CHECKING: FastAPI resolves annotations against module globals.
from features.database.db import DbSession  # noqa: TC001
from features.quiz.schemas import GenerateIn, GenerateOut  # noqa: TC001
from features.quiz.service import generate_questions


if TYPE_CHECKING:
    from features.auth.schemas import AuthContext


router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"feature": "quiz", "status": "ok"}


@router.post("/generate", response_model=GenerateOut)
@auth_required
async def generate(request: GenerateIn, db: DbSession, auth: AuthContext) -> GenerateOut:
    """Write a fresh set of recognition questions from this patient's own memory subjects.

    A POST rather than a GET because it is not a read: it spends a model call and the answer is
    different every time. It is safe to repeat — the question ids are derived from the subject,
    the form and the language, so calling twice replaces a set rather than growing one.
    """
    return await generate_questions(db, auth.user_id, request.language)
