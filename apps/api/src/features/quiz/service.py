"""Writing recognition questions from the family's own photographs.

This is the one place in the project where a model is shown a patient's pictures, and the
shape of the whole feature falls out of two facts about that.

**It runs on the server, never on the phone.** The key lives in `.env` and stays there
(`AGENTS.md` §2.5); an app binary carrying a Gemini key would be handing it to anyone who
unzipped the APK. The device asks this endpoint and this endpoint asks Google.

**It is optional, always.** A question is generated once, over whatever connection happens to
be there, and then belongs to the phone — stored, replayed, shuffled fresh every round, and
asked with the radio off for as long as the family leaves the subject up. Nothing the reader
does waits on this call (§2.1); the game opens on what it already holds and quietly takes a
better set if one arrives.

**Names and relationships are what the model is told, and what it writes back.** No session
history, no scores, no telemetry, and nothing about how this reader has been doing — the model
is being asked to phrase a question about a photograph, not to form a view about a person.
"""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any
from uuid import UUID, uuid5

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select

from core.config import settings
from core.storage import download_object
from features.database.models import MemoryAsset, MemorySubject
from features.quiz.schemas import GenerateOut, QuestionOut
from features.sync.service import resolve_patient


if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncSession


# How many subjects go into one request. A family keeps a handful, and a request carrying
# thirty photographs on a village connection is one that times out rather than one that
# answers slowly.
MAX_SUBJECTS = 10

# Per photograph, and across the whole request. A caregiver may upload a 20 MiB picture from a
# modern phone; inlining several of those would make a request no connection here can finish.
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_TOTAL_IMAGE_BYTES = 15 * 1024 * 1024

# What the model may hand back, per subject. Two questions about the picture and one that asks
# for the picture — enough that a round is not the same three questions every time, few enough
# that the whole set still fits in one response.
QUESTIONS_PER_SUBJECT = 3

# The ids are derived rather than random, so generating again for the same subject in the same
# language overwrites the question it replaces instead of stacking a second copy beside it.
_QUESTION_NAMESPACE = UUID("6f1d9d3e-1c2a-4f5b-9c7e-0d2b6a5f8c41")

_GEMINI_TIMEOUT_SECONDS = 45.0

_FORMS = ("about_photo", "find_photo")


async def generate_questions(session: AsyncSession, user_id: str, language: str) -> GenerateOut:
    """Ask the model for a fresh set of questions about this patient's own subjects.

    Returns an empty set rather than an error when the family has not added anybody yet, or
    when no photograph could be read. The phone treats that as "nothing new to take" and keeps
    playing on what it has, which is the right behaviour for a call that is a nicety on top of
    a game that already works.
    """
    _require_gemini()

    patient = await resolve_patient(session, user_id)
    subjects = await _subjects_with_photos(session, patient.id)

    if not subjects:
        return GenerateOut(
            generated_at=datetime.now(UTC), language=language, subjects_used=0, questions=[]
        )

    written = await _ask_gemini(subjects, language)

    return GenerateOut(
        generated_at=datetime.now(UTC),
        language=language,
        subjects_used=len(subjects),
        questions=_to_questions(subjects, written, language),
    )


@dataclass(frozen=True, slots=True)
class _Subject:
    """A subject the model can actually be shown: their details and their picture's bytes."""

    id: UUID
    kind: str
    name: str | None
    relation: str | None
    image: bytes
    content_type: str


async def _subjects_with_photos(session: AsyncSession, patient_id: UUID) -> list[_Subject]:
    """The patient's active subjects, each paired with the bytes of its newest photograph.

    A subject whose picture cannot be fetched is left out entirely rather than sent as text
    alone. Both question forms are about a photograph — one shows it, the other asks the reader
    to find it — so a subject without one has no question to be asked about it.
    """
    subjects = (
        await session.scalars(
            select(MemorySubject)
            .where(
                MemorySubject.patient_id == patient_id,
                MemorySubject.is_active.is_(True),
            )
            .order_by(MemorySubject.created_at.desc())
            .limit(MAX_SUBJECTS)
        )
    ).all()

    if not subjects:
        return []

    assets = (
        await session.scalars(
            select(MemoryAsset)
            .where(
                MemoryAsset.subject_id.in_([subject.id for subject in subjects]),
                MemoryAsset.status == "ready",
                MemoryAsset.is_active.is_(True),
            )
            .order_by(MemoryAsset.created_at.desc())
        )
    ).all()

    # Newest first, so the first asset seen for a subject is the one that wins — the same rule
    # the sync pull uses, so the phone and the model are looking at the same picture.
    newest: dict[UUID, MemoryAsset] = {}
    for asset in assets:
        if asset.subject_id is not None:
            newest.setdefault(asset.subject_id, asset)

    ready: list[_Subject] = []
    budget = MAX_TOTAL_IMAGE_BYTES

    for subject in subjects:
        asset = newest.get(subject.id)

        fetched = (
            await download_object(asset.object_key)
            if asset is not None
            else await _fetch_external(subject.photo_url)
        )

        if fetched is None:
            continue

        image, content_type = fetched

        if len(image) > MAX_IMAGE_BYTES or len(image) > budget:
            continue

        budget -= len(image)
        ready.append(
            _Subject(
                id=subject.id,
                kind=subject.kind,
                name=subject.name,
                relation=subject.relation,
                image=image,
                content_type=content_type,
            )
        )

    return ready


async def _fetch_external(photo_url: str | None) -> tuple[bytes, str] | None:
    """A picture the caregiver linked to rather than uploaded.

    Best effort and never fatal: an unreachable host, a redirect to a login page, or anything
    that is not an image simply costs that subject its questions.
    """
    if not photo_url or not photo_url.lower().startswith(("http://", "https://")):
        return None

    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(photo_url)
    except Exception:
        return None

    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()

    if response.status_code != 200 or not content_type.startswith("image/"):
        return None

    return response.content, content_type


def _require_gemini() -> None:
    """A 503 rather than a 500 when no key is configured — this is a service that is off."""
    if not settings.gemini_api_key or settings.gemini_api_key.strip() in (
        "",
        "your_gemini_api_key_here",
    ):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Question generation is not set up. Add a valid GEMINI_API_KEY to apps/api/.env.",
        )


_SYSTEM_INSTRUCTION = (
    "You write gentle recognition questions for Smaran, an app used by elderly people living "
    "with dementia in North East India. The photographs are of this reader's own family, their "
    "own home and their own belongings, shared by their family for exactly this purpose.\n\n"
    "Rules, all of them strict:\n"
    "1. WARM AND PLAIN. Second person, short sentences, no jargon, no test language. Never "
    "'identify', 'select the correct answer', or 'quiz'. Ask the way a grandchild would ask.\n"
    "2. NEVER NEGATIVE. No question may be phrased so that a wrong answer feels like a failure. "
    "No time pressure, no difficulty labels, no scoring words.\n"
    "3. ANSWERABLE FROM THE PICTURE AND THE DETAILS GIVEN. Never invent a fact about the person, "
    "the place or the object that you were not told and cannot see.\n"
    "4. WRONG ANSWERS MUST BE PLAUSIBLE AND KIND. For a person, other ordinary relationships or "
    "common names for this region. Never anything unkind, absurd, or about illness or death.\n"
    "5. WRITE EVERY WORD IN THE REQUESTED LANGUAGE, including the options. Use the script that "
    "language is normally written in.\n"
    "6. Two forms. 'about_photo': the photograph is shown and the answers are words — give the "
    "prompt, the right answer, and two or three plausible wrong answers. 'find_photo': the "
    "answers will be other photographs the app picks itself — give only the prompt, which must "
    "name what to look for ('Which one is your daughter Meera?'), and leave answer and options "
    "empty.\n"
    f"7. Exactly {QUESTIONS_PER_SUBJECT} questions per subject: two 'about_photo' and one "
    "'find_photo'.\n"
    "8. Return strictly valid JSON in the requested schema and nothing else."
)


_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "OBJECT",
    "properties": {
        "questions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "subject_index": {"type": "INTEGER"},
                    "form": {"type": "STRING", "enum": list(_FORMS)},
                    "prompt": {"type": "STRING"},
                    "answer": {"type": "STRING"},
                    "options": {"type": "ARRAY", "items": {"type": "STRING"}},
                },
                "required": ["subject_index", "form", "prompt"],
            },
        }
    },
    "required": ["questions"],
}


async def _ask_gemini(subjects: list[_Subject], language: str) -> list[dict[str, Any]]:
    """One request carrying every photograph, and the raw question objects it answered with.

    One request rather than one per subject on purpose: the model sees the whole set, so it can
    tell a daughter from a neighbour and write wrong answers that are plausible *within this
    family* rather than generic. It is also the difference between one slow round trip and ten
    on a connection that may only be up for a minute.
    """
    parts: list[dict[str, Any]] = [
        {
            "text": (
                f"{_SYSTEM_INSTRUCTION}\n\n"
                f"Write every question in this language (BCP-47): {language}\n\n"
                f"There are {len(subjects)} subjects. Each is described below and followed by "
                "its photograph. Refer to them by their subject_index."
            )
        }
    ]

    for index, subject in enumerate(subjects):
        parts.append({"text": json.dumps(_describe(index, subject), ensure_ascii=False)})
        parts.append(
            {
                "inline_data": {
                    "mime_type": subject.content_type,
                    # Gemini's REST API takes inline bytes base64-encoded.
                    "data": base64.b64encode(subject.image).decode("ascii"),
                }
            }
        )

    body = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _RESPONSE_SCHEMA,
            # Low, but not zero. These are questions about a fixed set of facts, and the small
            # amount of variation left is what stops every regeneration reading identically.
            "temperature": 0.4,
        },
    }

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )

    try:
        async with httpx.AsyncClient(timeout=_GEMINI_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=body)
    except httpx.TimeoutException as err:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Writing the questions took too long. The phone will try again later.",
        ) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not reach the question service: {err}",
        ) from err

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"The question service refused the request ({response.status_code}).",
        )

    candidates = response.json().get("candidates", [])

    if not candidates:
        return []

    text_parts = [
        part.get("text", "")
        for part in candidates[0].get("content", {}).get("parts", [])
        if part.get("text", "").strip()
    ]

    if not text_parts:
        return []

    try:
        parsed = json.loads(text_parts[-1])
    except Exception:
        # A response that is not the JSON we asked for is a generation that produced nothing
        # usable, not an error the phone can act on. It plays on what it holds and tries again.
        return []

    questions = parsed.get("questions", [])

    return questions if isinstance(questions, list) else []


def _describe(index: int, subject: _Subject) -> dict[str, Any]:
    """What the model is told about a subject, and the whole of it.

    Only the three things the family typed. There is no patient name here, no id the model
    could correlate on, and nothing about how this reader has been doing (§2.5).
    """
    return {
        "subject_index": index,
        "kind": subject.kind,
        "name": subject.name,
        "relationship": subject.relation,
    }


def _to_questions(
    subjects: list[_Subject], written: list[dict[str, Any]], language: str
) -> list[QuestionOut]:
    """Turn what the model wrote into questions the phone can be trusted to ask.

    Everything here is a rejection rule. A model that answers off-schema, points at a subject
    that was never sent, writes an `about_photo` question with one option, or leaves the right
    answer out of its own option list has produced a question the reader could not get right —
    and a question nobody can get right is worse on this screen than one question fewer.
    """
    questions: list[QuestionOut] = []
    seen: set[UUID] = set()

    for position, raw in enumerate(written):
        if not isinstance(raw, dict):
            continue

        index = raw.get("subject_index")
        form = raw.get("form")
        prompt = str(raw.get("prompt", "")).strip()

        if not isinstance(index, int) or not 0 <= index < len(subjects):
            continue

        if form not in _FORMS or not prompt:
            continue

        subject = subjects[index]
        answer = str(raw.get("answer", "")).strip() or None
        options = [str(option).strip() for option in raw.get("options", []) if str(option).strip()]

        if form == "about_photo":
            if answer is None:
                continue

            # The right answer belongs in the list whether or not the model remembered to put
            # it there, and it is deduplicated because an option repeated is two taps that are
            # both right and only one of them counted.
            options = list(dict.fromkeys([answer, *options]))

            if len(options) < 2:
                continue
        else:
            # The photographs are chosen on the device, so anything written here would be
            # ignored — dropped rather than carried, so nothing downstream can read it and
            # believe it means something.
            answer, options = None, []

        # Derived from what the question is *about* rather than from its position, so the same
        # subject asked the same way in the same language keeps its id across regenerations.
        identity = uuid5(_QUESTION_NAMESPACE, f"{subject.id}:{form}:{language}:{position}")

        if identity in seen:
            continue

        seen.add(identity)
        questions.append(
            QuestionOut(
                id=identity,
                subject_id=subject.id,
                form=form,
                language=language,
                prompt=prompt,
                answer=answer,
                options=options,
            )
        )

    return questions
