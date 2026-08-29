import { useUser } from "@clerk/expo";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CodeBoxStatus } from "@/components/ui";
import {
  ActionButton,
  CodeInput,
  ProgressBar,
  Surface,
  Text,
} from "@/components/ui";
import { useRecall } from "@/hooks/use-recall";
import { useThemeColors } from "@/hooks/use-theme";
import { MaxContentWidth, Spacing, TouchTarget } from "@/theme";

/** How long the finished bar is left on screen before the app opens. */
const CELEBRATION_MS = 900;

/** Wrong full-length answers before the name is offered outright. */
const ATTEMPTS_BEFORE_HELP = 3;

/**
 * Recall — the first thing after signing in, once per launch.
 *
 * The reader types their own name into a row of boxes and watches a bar fill as
 * they get it right. It is a warm-up, not a lock: every letter is scored as it
 * lands so progress is visible immediately, and after a few misses the answer
 * is offered rather than withheld.
 */
export default function RecallScreen() {
  const { user } = useUser();
  const { confirmRecall } = useRecall();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  const name = firstNameOf(user?.firstName, user?.fullName);
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const isMatch = value.length === name.length && matches(value, name);
  const marks = useMemo(() => markLetters(value, name), [value, name]);
  const correctCount = marks.filter((mark) => mark === "correct").length;
  const nearCount = marks.filter((mark) => mark === "present").length;
  const progress = name.length ? scoreOf(marks) / name.length : 0;

  // Nothing to recall — an account with no name on it must not be a dead end.
  useEffect(() => {
    if (!name) {
      confirmRecall();
    }
  }, [name, confirmRecall]);

  // The bar reaching the end is the reward; let it be seen before moving on.
  useEffect(() => {
    if (!isMatch) {
      return;
    }

    const timer = setTimeout(confirmRecall, CELEBRATION_MS);

    return () => clearTimeout(timer);
  }, [isMatch, confirmRecall]);

  // A full row that is not the name counts as one try — and only one, however
  // long it is left sitting there.
  useEffect(() => {
    if (value.length === name.length && !matches(value, name)) {
      setAttempts((count) => count + 1);
    }
  }, [value, name]);

  if (!name) {
    return null;
  }

  const statuses: CodeBoxStatus[] = Array.from(
    name,
    (_, index) => marks[index] ?? "empty",
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.frame,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        {/* Prompt and answer travel together in the middle of the screen, so
            the question is never a header stranded above an empty page. */}
        <View style={styles.centre}>
          <View style={styles.prompt}>
            <Text variant="caption" color="textSecondary" center>
              {t(salutationKey())}
            </Text>
            <Text variant="title" center accessibilityRole="header">
              {t("recall.question")}
            </Text>
            <Text variant="bodyLarge" color="textSecondary" center>
              {t("recall.hint")}
            </Text>
          </View>

          <Surface style={styles.answer}>
            <CodeInput
              length={name.length}
              value={value}
              onChangeText={setValue}
              statuses={statuses}
              placeholders={isRevealed ? Array.from(name) : undefined}
              accessibilityLabel={t("recall.nameLabel")}
            />

            <View style={styles.meter}>
              <ProgressBar
                value={progress}
                tone={isMatch ? "success" : "primary"}
                accessibilityLabel={t("recall.progressLabel")}
              />
              <Text
                variant="bodyLarge"
                color={isMatch ? "success" : "textSecondary"}
                center
                accessibilityLiveRegion="polite"
              >
                {isMatch
                  ? t("recall.correct", { name })
                  : nearCount
                    ? t("recall.placed", {
                        correct: correctCount,
                        count: nearCount,
                      })
                    : t("recall.lettersRight", {
                        correct: correctCount,
                        count: name.length,
                      })}
              </Text>
            </View>
          </Surface>
        </View>

        {/* Held open whether or not there is help to give, so the answer above
            does not shift the moment the offer appears. */}
        <View style={styles.footer}>
          {isMatch ? null : isRevealed ? (
            <Text variant="bodyLarge" color="textSecondary" center>
              {t("recall.revealed", { name })}
            </Text>
          ) : attempts >= ATTEMPTS_BEFORE_HELP ? (
            <ActionButton
              label={t("recall.reveal")}
              variant="text"
              onPress={() => setIsRevealed(true)}
            />
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/** The same warm opener the home screen leads with. */
function salutationKey() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "greeting.morning" as const;
  }

  return hour < 17
    ? ("greeting.afternoon" as const)
    : ("greeting.evening" as const);
}

/**
 * The name to ask for: the given name, or the first word of the full name when
 * that is all the account has. One word keeps the row of boxes short and spares
 * anyone hunting for the space bar.
 */
function firstNameOf(firstName?: string | null, fullName?: string | null) {
  const candidate = firstName?.trim() || fullName?.trim() || "";

  return candidate.split(/\s+/)[0] ?? "";
}

/** Case is not what is being recalled here. */
const matches = (value: string, name: string) =>
  value.toLocaleLowerCase() === name.toLocaleLowerCase();

/**
 * What each letter earns. A letter that belongs to the name but has landed in
 * the wrong box is partly remembered, so it counts for something; a letter that
 * is not in the name at all pulls the bar back, which is what makes the bar a
 * measure of the answer rather than of how much has been typed.
 */
const WEIGHTS: Partial<Record<CodeBoxStatus, number>> = {
  correct: 1,
  present: 0.5,
  absent: -0.5,
};

const scoreOf = (marks: CodeBoxStatus[]) =>
  marks.reduce((total, mark) => total + (WEIGHTS[mark] ?? 0), 0);

/**
 * Marks each typed letter green, yellow or red, the way a word game does.
 *
 * Exact positions are claimed first, then the leftovers are what a misplaced
 * letter can match against — so typing the same letter twice when the name
 * holds it once marks one box yellow and the other red, rather than flattering
 * the guess twice over.
 */
function markLetters(value: string, name: string): CodeBoxStatus[] {
  const target = Array.from(name.toLocaleLowerCase());
  const typed = Array.from(value.toLocaleLowerCase()).slice(0, target.length);

  const marks: CodeBoxStatus[] = typed.map((letter, index) =>
    letter === target[index] ? "correct" : "empty",
  );

  /** Letters of the name not already claimed by a box in the right place. */
  const unclaimed = new Map<string, number>();

  target.forEach((letter, index) => {
    if (typed[index] !== letter) {
      unclaimed.set(letter, (unclaimed.get(letter) ?? 0) + 1);
    }
  });

  typed.forEach((letter, index) => {
    if (marks[index] === "correct") {
      return;
    }

    const remaining = unclaimed.get(letter) ?? 0;

    if (remaining > 0) {
      unclaimed.set(letter, remaining - 1);
      marks[index] = "present";
    } else {
      marks[index] = "absent";
    }
  });

  return marks;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  frame: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  centre: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    justifyContent: "center",
    gap: Spacing["2xl"],
  },
  prompt: {
    gap: Spacing.xs,
  },
  answer: {
    gap: Spacing.xl,
  },
  meter: {
    gap: Spacing.md,
  },
  footer: {
    width: "100%",
    maxWidth: MaxContentWidth,
    minHeight: TouchTarget.comfortable,
    justifyContent: "center",
  },
});
