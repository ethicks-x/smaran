"""The wire shape of a generated recognition question.

Deliberately small. A question is a **sentence and some words** — never a picture, never a
URL, never an id the phone would have to resolve. The photographs are already on the device,
cached by `lib/media-cache.ts` when the subjects synced down, so sending anything image-shaped
here would be sending a second copy of something the phone already has and can draw with the
radio off.

Nothing in this module is a score, a benchmark or a judgement about the patient
(`AGENTS.md` §2.4). These are questions about the patient's own family and their own home.
"""

from __future__ import annotations

from datetime import datetime  # noqa: TC003
from uuid import UUID  # noqa: TC003

from pydantic import BaseModel, Field


class QuestionOut(BaseModel):
    """One question about one subject, ready to be asked with the radio off.

    Two forms, and the difference is what the reader is choosing between:

    - `about_photo` — the subject's photograph is on screen and the answers are **words**.
      "Who is this?", with their name among a few plausible others.
    - `find_photo` — the question is words and the answers are **photographs**. "Which one is
      your daughter Meera?", answered by picking her face out of a handful.

    `options` carries the written answers for the first form and is empty for the second: the
    photographs a `find_photo` question offers are chosen **on the device**, from the subjects
    it actually holds. That is not a shortcut — it is what keeps the question answerable. The
    server does not know which pictures finished downloading onto this particular phone, and a
    question whose right answer never arrived is one the reader cannot get right.
    """

    id: UUID = Field(
        description="Stable for this subject, form and question — a re-generation replaces rather than duplicates"
    )
    subject_id: UUID
    form: str = Field(description="`about_photo` or `find_photo`")
    language: str = Field(description="BCP-47 tag the prompt and options are written in")
    prompt: str = Field(description="The question, in the reader's own language")
    answer: str | None = Field(
        None,
        description="The right written answer. Null for `find_photo`, where the answer is a face",
    )
    options: list[str] = Field(
        default_factory=list,
        description="Every written answer offered, the right one included. Empty for `find_photo`",
    )


class GenerateIn(BaseModel):
    """What the phone asks for: questions, in this language, about the subjects it holds."""

    language: str = Field(
        "en", max_length=16, description="BCP-47 tag. The questions come back written in it"
    )


class GenerateOut(BaseModel):
    """Every question the model wrote this time, and when.

    **The complete set, not a delta.** The phone replaces what it holds for this language with
    what comes back, the same shape and for the same reason `PullOut.subjects` is a snapshot: a
    subject the family took down should stop being asked about, and a replace is the only way
    to say that without modelling a deletion.
    """

    generated_at: datetime
    language: str
    subjects_used: int = Field(description="How many subjects the model was actually shown")
    questions: list[QuestionOut] = Field(default_factory=list)
