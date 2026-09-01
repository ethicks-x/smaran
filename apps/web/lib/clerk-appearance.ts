import type { SignIn } from "@clerk/nextjs";
import type { ComponentProps } from "react";

// `@clerk/types` is not a direct dependency of this app, so the shape is taken
// from the component that consumes it. Type-only, so nothing is imported at
// runtime and this file stays usable from a server component.
type Appearance = NonNullable<ComponentProps<typeof SignIn>["appearance"]>;

/**
 * Clerk's prebuilt screens, wearing the dashboard's own tokens.
 *
 * The values are CSS custom properties rather than literals so the components
 * follow the light/dark switch in `globals.css` with the rest of the app —
 * Clerk re-reads them on repaint, and next-themes only flips the `:root` block.
 */
export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: "var(--color-indigo-500)",
    colorBackground: "var(--color-surface)",
    colorForeground: "var(--color-ink-900)",
    colorMutedForeground: "var(--color-ink-500)",
    colorInput: "var(--color-surface)",
    colorInputForeground: "var(--color-ink-900)",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    // The page already sets the logo, heading and sub-heading; Clerk's own would
    // be a second copy of both.
    header: "hidden",
    cardBox: "shadow-[0_12px_40px_rgba(44,31,88,0.12)] border border-black/6 dark:border-white/[0.08]",
    card: "bg-surface",
    footer: "bg-surface",
  },
};
