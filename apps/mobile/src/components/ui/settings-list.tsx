import { Icon } from "@expo/ui";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";

import { type AppIconName, AppIcons } from "@/components/ui/icons";
import { NativeHost } from "@/components/ui/native-host";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { useThemeColors } from "@/hooks/use-theme";
import { Spacing, scale, TouchTarget } from "@/theme";

/** Every row's icon sits in a column of this width, so labels line up. */
const ICON_COLUMN = scale(40);
const ROW_ICON_SIZE = scale(30);
const CHEVRON_SIZE = scale(24);
/** Long enough to be followed by a slow eye, short enough not to feel stuck. */
const OPEN_DURATION = 220;

/**
 * Each row carries its own tint so the list can be scanned by colour before it
 * is read. The tint colours the icon only — a plain icon beside plain text is
 * the shape every settings app on the phone already uses, and the row reads as
 * a list entry rather than a card. Tints are semantic tokens, so every pairing
 * is already contrast checked in both light and dark.
 */
export type SettingsTint =
  | "primary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

const TINTS = {
  primary: "primary",
  accent: "accent",
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "textSecondary",
} as const;

type AccordionValue = {
  openId: string | null;
  toggle: (id: string) => void;
};

const AccordionContext = createContext<AccordionValue | null>(null);

/**
 * Keeps one row open at a time. Two open rows means two half-read answers and a
 * list that no longer fits the screen; closing the last one on every open keeps
 * the reader's place obvious.
 */
export function SettingsAccordion({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const value = useMemo<AccordionValue>(
    () => ({
      openId,
      toggle: (id) => setOpenId((current) => (current === id ? null : id)),
    }),
    [openId],
  );

  return (
    <AccordionContext.Provider value={value}>
      {children}
    </AccordionContext.Provider>
  );
}

export type SettingsGroupProps = {
  /** Optional quiet heading above the card, as on the platform settings apps. */
  title?: string;
  children: ReactNode;
};

/** A card of related rows, separated by hairlines rather than gaps. */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const colors = useThemeColors();
  const rows = Array.isArray(children) ? children.flat() : [children];

  return (
    <View style={styles.group}>
      {title ? (
        <Text variant="caption" color="textSecondary" style={styles.groupTitle}>
          {title}
        </Text>
      ) : null}

      <Surface padded={false} style={styles.card}>
        {rows.filter(Boolean).map((row, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the rows are static.
          <View key={index}>
            {index > 0 ? (
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
            ) : null}
            {row}
          </View>
        ))}
      </Surface>
    </View>
  );
}

type RowFaceProps = {
  icon: AppIconName;
  tint: SettingsTint;
  label: string;
  /** One short line naming what is inside. Never essential on its own. */
  description?: string;
  /** Rotates as the row opens; `undefined` on rows that push a screen. */
  progress?: Animated.Value;
};

/** The visible part of every row: tile, two lines of text, and a chevron. */
function RowFace({ icon, tint, label, description, progress }: RowFaceProps) {
  const colors = useThemeColors();

  return (
    <>
      <View style={styles.icon}>
        <NativeHost>
          <Icon
            name={AppIcons[icon]}
            size={ROW_ICON_SIZE}
            color={colors[TINTS[tint]]}
          />
        </NativeHost>
      </View>

      <View style={styles.rowText}>
        <Text variant="bodyLarge" numberOfLines={2}>
          {label}
        </Text>
        {description ? (
          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>

      {progress ? (
        <Animated.View
          style={{
            transform: [
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "180deg"],
                }),
              },
            ],
          }}
        >
          <NativeHost>
            <Icon
              name={AppIcons.chevronDown}
              size={CHEVRON_SIZE}
              color={colors.textSecondary}
            />
          </NativeHost>
        </Animated.View>
      ) : (
        <NativeHost>
          <Icon
            name={AppIcons.chevronRight}
            size={CHEVRON_SIZE}
            color={colors.textSecondary}
          />
        </NativeHost>
      )}
    </>
  );
}

export type SettingsRowProps = {
  icon: AppIconName;
  tint?: SettingsTint;
  label: string;
  description?: string;
  /** Revealed in place when the row opens. */
  children: ReactNode;
};

/**
 * A row that answers in place. The chevron points down while there is more to
 * see and turns as the panel grows, so the animation says which row moved even
 * if the eye was somewhere else when it was tapped.
 *
 * Whole row is the target — never just the chevron.
 */
export function SettingsRow({
  icon,
  tint = "primary",
  label,
  description,
  children,
}: SettingsRowProps) {
  const id = useId();
  const accordion = useContext(AccordionContext);
  const [locallyOpen, setLocallyOpen] = useState(false);

  const open = accordion ? accordion.openId === id : locallyOpen;
  const toggle = () =>
    accordion ? accordion.toggle(id) : setLocallyOpen((was) => !was);

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: OPEN_DURATION,
      easing: Easing.out(Easing.cubic),
      // Height cannot be driven natively, and the chevron shares this value so
      // the turn and the panel stay in step.
      useNativeDriver: false,
    }).start();
  }, [open, progress]);

  return (
    <View>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={description}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <RowFace
          icon={icon}
          tint={tint}
          label={label}
          description={description}
          progress={progress}
        />
      </Pressable>

      <Collapsible open={open} progress={progress}>
        <View style={styles.detail}>{children}</View>
      </Collapsible>
    </View>
  );
}

export type SettingsLinkProps = {
  icon: AppIconName;
  tint?: SettingsTint;
  label: string;
  description?: string;
  /** Pushes a screen. Rows that only reveal a sentence should expand instead. */
  onPress: () => void;
};

/** A row that opens a screen of its own, marked by a chevron pointing forward. */
export function SettingsLink({
  icon,
  tint = "primary",
  label,
  description,
  onPress,
}: SettingsLinkProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <RowFace
        icon={icon}
        tint={tint}
        label={label}
        description={description}
      />
    </Pressable>
  );
}

/**
 * Grows and fades its content to the height it measures for itself. The panel
 * stays mounted so the height is known before the first open, and is hidden
 * from touch and from screen readers while it is closed.
 */
function Collapsible({
  open,
  progress,
  children,
}: {
  open: boolean;
  progress: Animated.Value;
  children: ReactNode;
}) {
  const [height, setHeight] = useState(0);

  return (
    <Animated.View
      pointerEvents={open ? "auto" : "none"}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      style={[
        styles.collapsible,
        {
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, height],
          }),
          opacity: progress,
        },
      ]}
    >
      <View
        style={styles.measured}
        onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      >
        {children}
      </View>
    </Animated.View>
  );
}

/** A labelled fact: caption above, the value itself in reading size below. */
export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyLarge">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.sm,
  },
  groupTitle: {
    paddingHorizontal: Spacing.md,
  },
  card: {
    overflow: "hidden",
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    marginLeft: Spacing.lg + ICON_COLUMN + Spacing.md,
  },
  row: {
    minHeight: TouchTarget.comfortable,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  icon: {
    width: ICON_COLUMN,
    alignItems: "center",
  },
  rowText: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  collapsible: {
    overflow: "hidden",
  },
  measured: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
  },
  detail: {
    paddingLeft: Spacing.lg + ICON_COLUMN + Spacing.md,
    paddingRight: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
  },
  detailItem: {
    gap: Spacing.xs,
  },
  pressed: {
    opacity: 0.9,
  },
});
