import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

import type { MissingOption, PhotoOption } from "@/components/games";
import {
  GameFrame,
  GameStatsDetail,
  GameSummary,
  MissingOptions,
  PhotoOptions,
  PhotoPrompt,
  PreparingBoard,
} from "@/components/games";
import {
  ActionButton,
  Confetti,
  Dialog,
  ProgressBar,
  Text,
} from "@/components/ui";
import { useGameSession } from "@/hooks/use-game-session";
import { useLanguage } from "@/hooks/use-language";
import { PREPARE_MS, useQuestionSupply } from "@/hooks/use-memory-quiz";
import { adjustDifficulty, type DifficultyAdvice } from "@/lib/adaptive";
import { recentSessions } from "@/lib/game-history";
import type { SessionStats } from "@/lib/game-stats";
import { dealRound, type QuizQuestion } from "@/lib/memory-quiz";
import { Spacing } from "@/theme";

/** The key this game's sessions are grouped under, here and on the server. */
const GAME_ID = "recognise";

/**
 * The boards, gentlest first.
 *
 * Two dials, and the second one is what this ladder is really about. How many questions and
 * how many answers each offers is the ordinary dial every game has. **Which way round the
 * question is asked** is the other, and it is a genuinely different task rather than more of
 * the same one: with the photograph on screen the reader is recognising a face that is in
 * front of them, which is the gentler direction; asked to *find* the face they have to hold
 * a name in mind and look through several people at once.
 *
 * So the ladder walks from one to the other. The bottom rung never asks for a face, the
 * middle two mix the directions, and the top rung asks for a face every time.
 */
const LEVELS = [
  {
    id: "four",
    questions: 4,
    options: 3,
    forms: ["about_photo"],
  },
  {
    id: "five",
    questions: 5,
    options: 3,
    forms: ["about_photo", "find_photo"],
  },
  {
    id: "six",
    questions: 6,
    options: 4,
    forms: ["about_photo", "find_photo"],
  },
  {
    id: "faces",
    questions: 6,
    options: 4,
    forms: ["find_photo"],
  },
] as const satisfies readonly {
  id: string;
  /** How many questions the board asks, at most — a reader whose family has shared three
   * photographs gets a board of three rather than a board that will not deal. */
  questions: number;
  /** How many answers each question offers, the right one included. */
  options: number;
  forms: readonly QuizQuestion["form"][];
}[];

type Level = (typeof LEVELS)[number];

/** How long a question that has just been answered stays green before the next one. Long
 * enough to see that it was right, and to look at the face once more. */
const SETTLE_MS = 1200;

type Phase = "preparing" | "asking" | "settling" | "won" | "empty";

/**
 * The people, places and things you know — the family's own photographs, asked about two
 * ways round.
 *
 * This is the game the problem statement is really asking for, and it is the only one whose
 * content is *this reader's own life* rather than a pool of pictures shipped in the bundle.
 * The subjects are what the family put on the dashboard — their daughter, their kitchen,
 * their walking stick — synced down with their photographs and cached to local flash
 * (D-45).
 *
 * **The one network call is on the way in, and the game does not depend on it.** The screen
 * opens on a board that says it is getting ready, and behind that a request goes to
 * `/quiz/generate`, which shows the photographs to a model and asks it to write a few gentle
 * questions about each. Whatever comes back is written to `memory_question` and belongs to
 * the phone from then on — dealt, shuffled and asked with the radio off for as long as the
 * family leaves the subject up. A phone with no signal waits the same second and a half and
 * plays the same game on the set it already holds (`AGENTS.md` §2.1). The key that call
 * needs lives on the server and never in this app (§2.5).
 *
 * **Nothing about a wrong answer takes anything away.** The option is tinted and stays
 * exactly where it is, the photograph is untouched, and the line under the bar says only
 * that the one tapped was not the one — never that the reader was wrong. No limit on tries,
 * no timer, no way to lose.
 *
 * Every board is measured by `useGameSession` — one attempt per tap, right or wrong, timed —
 * and the row is written to SQLite and queued for sync whether the board was finished or put
 * down. `adjustDifficulty` is read the same two places the other two games read it (D-26):
 * on the way in, to open on the rung this reader's own recent rounds point at, and when a
 * board is finished, to offer the next one and say why.
 */
export default function RecogniseScreen() {
  const { t } = useTranslation();
  const { language } = useLanguage();

  const supply = useQuestionSupply();
  const session = useGameSession({ gameId: GAME_ID });

  // Where this reader starts is their own recent rounds' business (§2.4). Read once, on the
  // first render: nothing changes the history while the screen is open except this screen
  // finishing a board, and that is handled where it happens.
  const [levelIndex, setLevelIndex] = useState(openingIndex);
  const level = LEVELS[levelIndex] ?? LEVELS[0];

  /** Counts the boards dealt this sitting. Nothing reads it as a score — it is what tells
   * the confetti that this is a new board and not the last one still running. */
  const [round, setRound] = useState(0);

  const [questions, setQuestions] = useState<readonly QuizQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>("preparing");

  /** Which question is being asked, counting from zero. */
  const [askIndex, setAskIndex] = useState(0);

  /** Options tried on the current question and found not to be the one. Cleared with each
   * new question. */
  const [wrong, setWrong] = useState<string[]>([]);

  /** How many questions have been answered. Grows across the whole board. */
  const [answered, setAnswered] = useState(0);

  const [summary, setSummary] = useState<SessionStats | null>(null);
  const [advice, setAdvice] = useState<DifficultyAdvice | null>(null);

  const question = questions[askIndex];
  const total = questions.length;

  // The board is dealt the moment the questions are ready, and not before. A board dealt
  // during preparation would be dealt from whatever was on disk a moment before the fresh
  // set landed.
  useEffect(() => {
    if (phase !== "preparing") {
      return;
    }

    if (supply.status === "empty") {
      setPhase("empty");
      return;
    }

    if (supply.status !== "ready") {
      return;
    }

    const dealt = deal(level, language);

    if (dealt.length === 0) {
      setPhase("empty");
      return;
    }

    setQuestions(dealt);
    session.begin({
      difficulty: levelIndex + 1,
      total: dealt.length,
      // One tap per question is the fewest this board could take. That perfect run is what
      // this run is measured against — never another person's (§2.4).
      idealAttempts: dealt.length,
    });
    setPhase("asking");
  }, [phase, supply.status, level, levelIndex, language, session]);

  // A question has just been answered and is sitting green. Hold it there long enough to be
  // seen, then ask the next one — or, if that was the last, close the board.
  useEffect(() => {
    if (phase !== "settling") {
      return;
    }

    const timer = setTimeout(() => {
      if (askIndex + 1 < total) {
        setAskIndex((asked) => asked + 1);
        setWrong([]);
        setPhase("asking");

        return;
      }

      const stats = session.finish();

      setPhase("won");

      // Only the call that actually closed the board has numbers; a second pass through
      // here would get null, and letting that through would empty the card the reader is
      // looking at.
      if (stats) {
        setSummary(stats);

        // `finish` has already written the row, so the board just played is the newest
        // thing in the history the engine is about to read.
        setAdvice(
          adjustDifficulty(recentSessions({ gameId: GAME_ID }), {
            current: stats.difficulty,
            rungs: LEVELS.length,
          }),
        );
      }
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [phase, askIndex, total, session]);

  const start = (index: number) => {
    const next = LEVELS[index] ?? LEVELS[0];

    // A board still in play when the next one is dealt was put down, and it is written down
    // as one rather than lost. Nothing about an unfinished board counts against the reader.
    session.abandon();

    const dealt = deal(next, language);

    setLevelIndex(index);
    setRound((dealt_) => dealt_ + 1);
    setAskIndex(0);
    setWrong([]);
    setAnswered(0);
    setSummary(null);
    setAdvice(null);

    if (dealt.length === 0) {
      setQuestions([]);
      setPhase("empty");

      return;
    }

    setQuestions(dealt);
    session.begin({
      difficulty: index + 1,
      total: dealt.length,
      idealAttempts: dealt.length,
    });
    setPhase("asking");
  };

  const choose = (id: string) => {
    // Only while a question is actually open: a tap landing during the hold after a right
    // answer belongs to nothing, and counting it would put an attempt against a question
    // that was already over.
    if (phase !== "asking" || !question) {
      return;
    }

    const picked = question.options.find((option) => option.id === id);

    if (!picked || wrong.includes(picked.id)) {
      return;
    }

    const right = picked.id === question.answerId;

    // One tap is one attempt, whichever way it went. This is the only place the game learns
    // anything about how the board is going, so it is the only place that counts.
    session.record(right);

    if (!right) {
      setWrong((tried) => [...tried, picked.id]);

      return;
    }

    setAnswered((done) => done + 1);
    setPhase("settling");
  };

  const settled = phase === "settling" || phase === "won";

  // The rung the engine offered, and whether taking it means a different board at all — at
  // the top of the ladder, or on a run that read as ordinary, the honest offer is this board
  // again.
  const offeredIndex = advice ? advice.difficulty - 1 : levelIndex;
  const offered = LEVELS[offeredIndex] ?? level;
  const offersAnotherBoard = advice !== null && offeredIndex !== levelIndex;

  return (
    <GameFrame
      title={t(`games.recognise.levels.${level.id}.name`)}
      onClose={() => router.back()}
      onSettings={() => router.push("/account/appearance")}
      closeLabel={t("games.recognise.close")}
      settingsLabel={t("games.recognise.settings")}
    >
      {phase === "preparing" ? (
        <PreparingBoard
          title={t("games.recognise.preparingTitle")}
          message={t(
            supply.asked
              ? "games.recognise.preparingAsking"
              : "games.recognise.preparingBody",
          )}
          progressLabel={t("games.recognise.preparingLabel")}
          durationMs={PREPARE_MS}
        />
      ) : (
        <>
          <View style={styles.meter}>
            <ProgressBar
              value={total > 0 ? answered / total : 0}
              tone={phase === "won" ? "success" : "primary"}
              accessibilityLabel={t("games.recognise.progressLabel")}
            />

            {/* The one line of words above the board, and the only thing anyone who cannot
                see it has to go on: it always says what just happened, and is read out
                whenever it changes. */}
            <Text
              variant="bodyLarge"
              color={settled ? "success" : "textSecondary"}
              center
              accessibilityLiveRegion="polite"
            >
              {statusOf({ t, phase, question, wrong, answered, total })}
            </Text>
          </View>

          {question ? (
            <View style={styles.board}>
              {/* Shown only when the question *is* the photograph. On a find-the-face
                  question the pictures are the answers, and one of them above the question
                  would be the answer given away. */}
              {question.form === "about_photo" ? (
                <PhotoPrompt
                  photoUri={question.photoUri}
                  kind={question.kind}
                  label={t("games.recognise.photoLabel")}
                />
              ) : null}

              <Text variant="heading" center accessibilityRole="header">
                {question.prompt}
              </Text>

              {question.form === "about_photo" ? (
                <MissingOptions
                  options={wordOptions(question, wrong, settled)}
                  mode="word"
                  label={t("games.recognise.wordOptionsLabel")}
                  wrongLabel={(name) =>
                    t("games.recognise.wrongOption", { name })
                  }
                  onPress={choose}
                />
              ) : (
                <PhotoOptions
                  options={photoOptions(
                    question,
                    wrong,
                    settled,
                    t("games.recognise.unnamedPhoto"),
                  )}
                  label={t("games.recognise.photoOptionsLabel")}
                  wrongLabel={(name) =>
                    t("games.recognise.wrongOption", { name })
                  }
                  onPress={choose}
                />
              )}
            </View>
          ) : null}
        </>
      )}

      {/* There is genuinely nothing to play with until the family has shared a photograph,
          and this says so in those words rather than reporting a failure. The way out is the
          only button on it. */}
      <Dialog
        visible={phase === "empty"}
        icon="memories"
        title={t("games.recognise.emptyTitle")}
        message={t("games.recognise.emptyMessage")}
        onRequestClose={() => router.back()}
      >
        <ActionButton
          label={t("games.recognise.emptyAction")}
          size="large"
          onPress={() => router.back()}
        />
      </Dialog>

      {/* The board stays behind the dialog exactly as it was finished. */}
      <Dialog
        visible={phase === "won"}
        icon="celebrate"
        title={t("games.recognise.doneTitle")}
        message={t("games.recognise.doneMessage", { count: total })}
        celebration={<Confetti run={round} />}
        details={
          summary ? (
            <>
              <GameSummary
                stats={summary}
                foundLabel={t("games.recognise.foundLabel")}
              />

              {/* Why the buttons below say what they say, in one sentence, in their
                  language — this board against this reader's own last few rounds of this
                  game and nobody else's (§2.4). */}
              {advice ? (
                <Text variant="bodyLarge" center>
                  {t(`games.recognise.reason.${advice.reason}`)}
                </Text>
              ) : null}

              {/* Stripped from a release build — see `GameStatsDetail`. */}
              {__DEV__ ? <GameStatsDetail stats={summary} /> : null}
            </>
          ) : null
        }
        onRequestClose={() => router.back()}
      >
        {offersAnotherBoard ? (
          <ActionButton
            label={t(
              offeredIndex > levelIndex
                ? "games.recognise.offer.up"
                : "games.recognise.offer.down",
              { board: t(`games.recognise.levels.${offered.id}.phrase`) },
            )}
            size="large"
            onPress={() => start(offeredIndex)}
          />
        ) : null}
        <ActionButton
          label={t("games.recognise.again")}
          variant={offersAnotherBoard ? "outlined" : "filled"}
          size={offersAnotherBoard ? "comfortable" : "large"}
          onPress={() => start(levelIndex)}
        />
        <ActionButton
          label={t("games.recognise.finish")}
          variant="text"
          onPress={() => router.back()}
        />
      </Dialog>
    </GameFrame>
  );
}

/**
 * What each answer is wearing: green once it has been found, tinted once it has been tried
 * and was not the one, and plain until then.
 *
 * `found` is the answer only after it has actually been tapped. Reading it off
 * `question.answerId` alone would paint the right answer green from the moment the question
 * appeared.
 */
function stateOf(
  optionId: string,
  question: QuizQuestion,
  wrong: readonly string[],
  found: boolean,
): "idle" | "wrong" | "correct" {
  if (found && optionId === question.answerId) {
    return "correct";
  }

  return wrong.includes(optionId) ? "wrong" : "idle";
}

/** The written answers, wearing what has already happened to them. */
function wordOptions(
  question: QuizQuestion,
  wrong: readonly string[],
  found: boolean,
): MissingOption[] {
  return question.options.map((option) => ({
    id: option.id,
    // Never drawn in word mode, and there is no symbol to draw — these are the family's own
    // words rather than anything from `Symbols`.
    symbol: "",
    name: option.label,
    state: stateOf(option.id, question, wrong, found),
  }));
}

/**
 * The photographs, wearing what has already happened to them.
 *
 * `unnamed` is not a nicety. A subject the family added without typing a name has no word
 * to announce, and a picture that announces as nothing is a picture someone listening
 * cannot choose — which would make the question unanswerable rather than merely harder
 * (§2.3).
 */
function photoOptions(
  question: QuizQuestion,
  wrong: readonly string[],
  found: boolean,
  unnamed: string,
): PhotoOption[] {
  return question.options.map((option) => ({
    id: option.id,
    photoUri: option.photoUri ?? null,
    label: option.label || unnamed,
    kind: question.kind,
    state: stateOf(option.id, question, wrong, found),
  }));
}

/**
 * The sentence above the board. Each state gets a whole string of its own rather than a stem
 * with a clause bolted on, so a translator can say it the way their language says it (D-12).
 */
function statusOf({
  t,
  phase,
  question,
  wrong,
  answered,
  total,
}: {
  t: ReturnType<typeof useTranslation>["t"];
  phase: Phase;
  question: QuizQuestion | undefined;
  wrong: readonly string[];
  answered: number;
  total: number;
}) {
  if (phase === "won") {
    return t("games.recognise.doneTitle");
  }

  if (phase === "settling") {
    return t("games.recognise.rightOne");
  }

  // A wrong answer says what is true about the thing tapped — that it was not the one —
  // rather than that the reader got it wrong. Only the most recent, because the line is read
  // out on every change and a growing list would be read from the beginning each time.
  if (wrong.length > 0 && question) {
    return t("games.recognise.notThatOne");
  }

  return t("games.recognise.asking", {
    asked: answered + 1,
    total,
  });
}

/** A board's worth of questions, or none if this reader's photographs cannot support one. */
function deal(level: Level, language: string): QuizQuestion[] {
  try {
    return dealRound(language, {
      questions: level.questions,
      options: level.options,
      forms: level.forms,
    });
  } catch {
    // A store that will not open costs this game and nothing else — the same guard every
    // other reader of `src/db` takes. Nothing is logged: the rows are the family's.
    return [];
  }
}

/**
 * Which rung to open on, from this reader's own history of **this** game.
 *
 * A device with nothing on it opens on the gentlest board, which is also what the engine
 * says about an empty history — so there is no special case here.
 */
function openingIndex(): number {
  try {
    const history = recentSessions({ gameId: GAME_ID });

    const { difficulty } = adjustDifficulty(history, {
      current: history[0]?.difficulty ?? 1,
      rungs: LEVELS.length,
    });

    return difficulty - 1;
  } catch {
    return 0;
  }
}

const styles = StyleSheet.create({
  meter: {
    gap: Spacing.md,
  },
  board: {
    flex: 1,
    gap: Spacing.xl,
    justifyContent: "center",
    paddingBottom: Spacing.lg,
  },
});
