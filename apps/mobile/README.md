# Smaran — Mobile

The elder-facing companion app. Family and carers manage everything from the
web **Caregiver Dashboard**; this app is what the person being cared for
actually opens.

## Design principles

Every UI decision here follows from the fact that the reader may have reduced
vision, unsteady hands, or memory difficulty:

- **Large type by default.** The type scale in `src/theme/typography.ts` starts
  at 18pt and body copy is 20–22pt. Nothing ships below the floor because every
  string goes through `<Text variant="…">`.
- **High contrast.** Every foreground/background pair in `src/theme/colors.ts`
  clears WCAG AAA (7:1) in both light and dark mode — body text, secondary copy,
  and the accent/success/danger colours on their muted fills.
- **Big targets.** `TouchTarget` starts at 56pt and primary actions are 76pt —
  well above the 44pt platform floor.
- **One obvious action per screen.** At most one `filled` button is visible at a
  time; everything else is `outlined` or `text`.
- **Recognition over recall.** Four permanent, labelled tabs. No drawers, no
  gesture-only navigation, no icon-only controls.
- **Native controls.** Interactive elements come from `@expo/ui`, so they render
  as real SwiftUI / Jetpack Compose views and inherit platform accessibility.

## Structure

```
src/
  app/                    file-based routes (expo-router)
    _layout.tsx           Clerk provider, theme, splash, auth guard
    sign-in.tsx           signed-out route
    settings.tsx          modal: account + sign out
    +not-found.tsx
    (tabs)/
      _layout.tsx         native tab bar
      index.tsx           Today   — the day's plan
      people.tsx          People  — familiar faces and how to reach them
      memories.tsx        Memories— photos and stories from family
      help.tsx            Help    — one unmistakable way to reach someone
  components/ui/          the design system; screens use nothing else
    screen.tsx            page frame: safe areas, title, gutters, max width
    section.tsx           titled group within a screen
    surface.tsx           themed card
    text.tsx              themed text, variant-driven
    action-button.tsx     @expo/ui Button, sized for unsteady hands
    empty-state.tsx       "nothing here yet" placeholder
    native-host.tsx       themed @expo/ui Host — wrap every @expo/ui component
    icons.ts              icon registry (SF Symbols + Material Symbols)
  theme/                  colours, type scale, spacing/radius/touch targets
  hooks/                  use-theme, use-color-scheme
```

Rules of thumb:

- Screens compose `components/ui` — they never reach for raw `Text`, `View`
  colours, or hardcoded spacing.
- Anything from `@expo/ui` must be rendered inside `<NativeHost>`, which applies
  the app's colour scheme and accent to the native view tree.
- New icons go in `src/components/ui/icons.ts`, never inline at a call site.

## Getting started

```bash
cp .env.example .env      # add your Clerk publishable key
bun install
bun run start             # or: task dev:mobile from the repo root
```

Native modules (`@expo/ui`, native tabs, Clerk's Android redirect) require a
development build — Expo Go will not run this app.

```bash
bunx expo prebuild
bun run ios               # or: bun run android
```

## Checks

```bash
bun run lint              # biome
bun run lint:fix
bunx tsc --noEmit         # types, including generated route types
```

## Still to do

- App icon and splash art are still Expo's (`assets/expo.icon`,
  `assets/images/icon.png`, `assets/images/splash-icon.png`) — replace with
  Smaran branding.
- Screens are skeletons: each has a `TODO` marking the API call that fills it.
