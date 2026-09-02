import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  type MemoryQuestionForm,
  type MemoryQuestionRow,
  type MemorySubjectKind,
  type MemorySubjectRow,
  memoryQuestion,
  memorySubject,
} from "@/db/schema";
import { ApiError, ApiUnreachableError, apiFetch, type GetToken } from "./api";

/**
 * The questions the recognition game asks, and where they come from.
 *
 * **The game is offline; only the writing of the questions is not.** A question is a
 * sentence about a photograph the phone already holds, so once it has been written it is
 * the device's for good: stored in `memory_question`, dealt fresh and shuffled every
 * round, and asked with the radio off for as long as the family leaves the subject up.
 * `fetchQuestions` is the one call, it happens on a screen that says it is happening, and
 * every failure it can have is survivable — the game falls back to what is already stored,
 * which is the only reason it is allowed to exist at all (`AGENTS.md` §2.1).
 *
 * **Nothing here writes to `sync_queue`.** Like memory subjects, questions run one way: the
 * server writes them, the device asks for them and takes what it is given. What the device
 * sends back is the round it played, which goes up the ordinary `game_session` path.
 */

/** A question as the server hands it down. `QuestionOut` in `apps/api`. */
export type PulledQuestion = {
  id: string;
  subject_id: string;
  form: string;
  language: string;
  prompt: string;
  answer: string | null;
  options: string[];
};

/** `GenerateOut` in `apps/api/src/features/quiz/schemas.py`. */
type GenerateResponse = {
  generated_at: string;
  language: string;
  subjects_used: number;
  questions: PulledQuestion[];
};

/** How a fetch went, in the one word the preparing screen needs. */
export type FetchOutcome =
  /** A fresh set arrived and is stored. */
  | "written"
  /** We asked and there was nothing to write about — no subjects, or no photographs. */
  | "empty"
  /** We could not ask. Radio off, or a server that is not there. */
  | "offline"
  /** We asked and were refused: not enrolled yet, or the model is not configured. */
  | "refused";

/**
 * Ask the server to write a fresh set of questions in this language, and store what comes
 * back.
 *
 * Every outcome is ordinary. There is no throw on this path and no error for a screen to
 * show, because there is nothing the reader could do about any of them and nothing they
 * need to: the game has already decided it will play on whatever it holds.
 */
export async function fetchQuestions(
  language: string,
  getToken: GetToken,
): Promise<FetchOutcome> {
  let response: GenerateResponse;

  try {
    response = await apiFetch<GenerateResponse>("/quiz/generate", getToken, {
      method: "POST",
      body: JSON.stringify({ language }),
    });
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return "offline";
    }

    if (error instanceof ApiError) {
      return "refused";
    }

    return "refused";
  }

  // An empty set is **not** an instruction to forget what we have, and this is the one
  // place that differs from how subjects sync. A subject snapshot is authoritative because
  // the server knows the whole set; an empty generation only ever means the model wrote
  // nothing this time — a photograph that would not download, a request that came back
  // off-schema — and throwing away a working set of questions over that would take the
  // game away from a reader for no reason at all.
  if (response.questions.length === 0) {
    return "empty";
  }

  applyQuestions(response.language, response.questions);

  return "written";
}

/**
 * Replace this language's questions with the set just written.
 *
 * A replace rather than a merge, and scoped to the one language: a subject the family
 * renamed should stop being asked about under the old name, and the only way to say that
 * is to put the new set in place of the old one. The other languages' rows are untouched,
 * so a reader who switches to Hindi and back does not have to wait for a second generation.
 *
 * A question about a subject this phone has never heard of is dropped rather than inserted.
 * The foreign key would refuse it anyway; dropping it here means one stale row cannot fail
 * the whole write.
 */
export function applyQuestions(
  language: string,
  pulled: readonly PulledQuestion[],
): number {
  return db().transaction((tx) => {
    const known = new Set(
      tx
        .select({ id: memorySubject.id })
        .from(memorySubject)
        .all()
        .map((row) => row.id),
    );

    tx.delete(memoryQuestion)
      .where(eq(memoryQuestion.language, language))
      .run();

    let written = 0;

    // The set was just cleared, so the only way an id can repeat is within this one
    // response. Counting such a row twice would be a count that does not match the table.
    const seen = new Set<string>();

    for (const question of pulled) {
      if (
        seen.has(question.id) ||
        !known.has(question.subject_id) ||
        !isForm(question.form)
      ) {
        continue;
      }

      seen.add(question.id);

      tx.insert(memoryQuestion)
        .values({
          id: question.id,
          subjectId: question.subject_id,
          form: question.form,
          language,
          prompt: question.prompt,
          answer: question.answer,
          options: JSON.stringify(question.options),
          createdAt: Date.now(),
        })
        .onConflictDoNothing()
        .run();

      written += 1;
    }

    return written;
  });
}

/** How many questions this reader could be asked right now, in their language. */
export function questionCount(language: string): number {
  return db()
    .select({ id: memoryQuestion.id })
    .from(memoryQuestion)
    .where(eq(memoryQuestion.language, language))
    .all().length;
}

/** After this long, a set is worth writing again even if nothing has changed — so the
 * questions a reader meets are not word for word the same ones for ever. */
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Whether it is worth spending a call on this language, before spending one.
 *
 * The call costs a model request and a photograph's worth of upload over whatever
 * connection is there, so the game does not make it every time it opens. It makes it when
 * the answer would actually be different: there are no questions in this language at all,
 * somebody has been added to the family's list since the last set was written, or the set
 * has simply been sitting there a fortnight.
 *
 * A subject **removed** needs no rule here: the questions about them went with them, on the
 * cascade, the moment the subject snapshot was applied.
 */
export function needsQuestions(language: string): boolean {
  const rows = db()
    .select({
      subjectId: memoryQuestion.subjectId,
      createdAt: memoryQuestion.createdAt,
    })
    .from(memoryQuestion)
    .where(eq(memoryQuestion.language, language))
    .all();

  if (rows.length === 0) {
    return true;
  }

  const covered = new Set(rows.map((row) => row.subjectId));

  // Only subjects with a photograph count as uncovered. One without a picture can never
  // be asked about, so counting it here would ask for a regeneration on every single
  // launch, for ever, over a subject no generation could do anything with.
  const uncovered = db()
    .select({ id: memorySubject.id, photoUri: memorySubject.photoUri })
    .from(memorySubject)
    .all()
    .filter((subject) => subject.photoUri !== null && !covered.has(subject.id));

  if (uncovered.length > 0) {
    return true;
  }

  const newest = rows.reduce(
    (latest, row) => Math.max(latest, row.createdAt),
    0,
  );

  return Date.now() - newest > STALE_AFTER_MS;
}

/** One thing to tap: a word, or a face. */
export type QuizOption = {
  id: string;
  /** What a screen reader hears, and what a word option shows. */
  label: string;
  /** A path into the media cache. Present only on a picture option. */
  photoUri?: string;
};

/**
 * One question, ready to draw.
 *
 * The two forms are the two halves of recognising somebody, and they are genuinely
 * different tasks. `about_photo` puts the face in front of the reader and asks for the
 * word — recognition, which is the gentler direction. `find_photo` gives the word and asks
 * for the face, which means holding a name in mind while looking at several people at once.
 */
export type QuizQuestion = {
  id: string;
  form: MemoryQuestionForm;
  prompt: string;
  kind: MemorySubjectKind;
  /** The photograph the question is *about*. Shown for `about_photo`; for `find_photo` it
   * is one of the options instead and is not shown above the question. */
  photoUri: string | null;
  options: readonly QuizOption[];
  /** Which option is the one the question is asking for. */
  answerId: string;
};

/** What one round asks for. */
export type RoundShape = {
  /** How many questions to deal, at most. A short round is dealt short, never padded. */
  questions: number;
  /** How many answers each question offers, the right one included. */
  options: number;
  /** Which forms this rung may use. */
  forms: readonly MemoryQuestionForm[];
};

/**
 * Deal a round: whichever questions this reader's own photographs support, in a fresh
 * order, with fresh options.
 *
 * Shuffled on every deal rather than stored in an order, so playing the same board twice is
 * not the same board twice — the same reason `missing.tsx` shuffles its pool. A reader who
 * has learnt that the answer is the second one is not recognising anybody.
 *
 * **A question that cannot be answered is not dealt.** That is most of this function. A
 * `find_photo` question needs enough *other* photographs to hide the right one among, and
 * it prefers ones of the same kind — asking which of four faces is your daughter is a
 * question; asking which of a face, a kitchen and a walking stick is your daughter is not.
 * An `about_photo` question needs its subject's picture on this phone and at least one
 * wrong answer to sit beside the right one. Anything short of that is dropped here rather
 * than drawn and quietly impossible.
 */
export function dealRound(language: string, shape: RoundShape): QuizQuestion[] {
  const rows = db()
    .select()
    .from(memoryQuestion)
    .where(
      and(
        eq(memoryQuestion.language, language),
        inArray(memoryQuestion.form, [...shape.forms]),
      ),
    )
    .all();

  if (rows.length === 0) {
    return [];
  }

  const subjects = new Map(
    db()
      .select()
      .from(memorySubject)
      .all()
      .map((subject) => [subject.id, subject]),
  );

  const dealt: QuizQuestion[] = [];

  // One question per subject in a round. Two questions about the same face in one sitting
  // give the second one away, and a round of four questions about two people is a round the
  // reader has really only been asked twice.
  const asked = new Set<string>();

  for (const row of shuffled(rows)) {
    if (dealt.length >= shape.questions) {
      break;
    }

    const subject = subjects.get(row.subjectId);

    if (!subject?.photoUri || asked.has(subject.id)) {
      continue;
    }

    const question =
      row.form === "about_photo"
        ? wordQuestion(row, subject, shape.options)
        : pictureQuestion(row, subject, [...subjects.values()], shape.options);

    if (question) {
      asked.add(subject.id);
      dealt.push(question);
    }
  }

  return dealt;
}

/** The photograph is shown; the answers are words. */
function wordQuestion(
  row: MemoryQuestionRow,
  subject: MemorySubjectRow,
  optionCount: number,
): QuizQuestion | null {
  const answer = row.answer?.trim();

  if (!answer || !subject.photoUri) {
    return null;
  }

  const written = parseOptions(row.options);
  const decoys = shuffled(written.filter((option) => option !== answer)).slice(
    0,
    Math.max(1, optionCount - 1),
  );

  if (decoys.length === 0) {
    return null;
  }

  return {
    id: row.id,
    form: "about_photo",
    prompt: row.prompt,
    kind: subject.kind,
    photoUri: subject.photoUri,
    options: shuffled([answer, ...decoys]).map((label) => ({
      // The word itself is the id: the options within one question are already distinct,
      // and a word that reads the same twice would be two taps that are both right.
      id: label,
      label,
    })),
    answerId: answer,
  };
}

/** The question is words; the answers are photographs. */
function pictureQuestion(
  row: MemoryQuestionRow,
  subject: MemorySubjectRow,
  everyone: readonly MemorySubjectRow[],
  optionCount: number,
): QuizQuestion | null {
  if (!subject.photoUri) {
    return null;
  }

  const others = everyone.filter(
    (other) => other.id !== subject.id && other.photoUri !== null,
  );

  // Same kind first, because a decoy has to be a plausible answer to the question actually
  // asked. Other kinds are the fallback rather than the rule: a round of three faces and a
  // kitchen is still a round worth playing, and no round at all is not.
  const sameKind = shuffled(
    others.filter((other) => other.kind === subject.kind),
  );
  const rest = shuffled(others.filter((other) => other.kind !== subject.kind));

  const decoys = [...sameKind, ...rest].slice(0, Math.max(1, optionCount - 1));

  if (decoys.length === 0) {
    return null;
  }

  return {
    id: row.id,
    form: "find_photo",
    prompt: row.prompt,
    kind: subject.kind,
    photoUri: null,
    options: shuffled([subject, ...decoys]).map((option) => ({
      id: option.id,
      // Named for a screen reader even though the picture is the whole task for a reader
      // who can see it. A photograph is never the only cue (§2.3) — someone listening gets
      // the name, which makes the question answerable rather than merely present.
      label: option.name ?? option.relationship ?? "",
      photoUri: option.photoUri ?? undefined,
    })),
    answerId: subject.id,
  };
}

/** The stored JSON array, or nothing. A row that will not parse is a row with no options. */
function parseOptions(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed.filter((option): option is string => typeof option === "string")
      : [];
  } catch {
    return [];
  }
}

const isForm = (value: string): value is MemoryQuestionForm =>
  value === "about_photo" || value === "find_photo";

/** Decorate, sort, undecorate — the same shuffle the other games use. */
function shuffled<T>(items: readonly T[]): T[] {
  return items
    .map((item) => ({ item, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map(({ item }) => item);
}
