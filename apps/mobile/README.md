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

## Building

Smaran is not on Google Play. It is handed to a family on a device somebody set
up for them, and the app updates itself from GitHub releases afterwards — so the
APK you build here is the thing people actually install, and the numbers on it
are what the updater compares. `src/lib/updates.ts` explains that side of it.

### Every build

Two rules, and both fail quietly rather than loudly if you break them:

- **`version` in `app.json` must equal the git tag you publish.** It is the only
  version the updater compares. `versionName` in `android/app/build.gradle` is
  what Android shows and is invisible to `checkForUpdate`, so if the two drift,
  the app installs an update, still reports the old version, and offers the same
  update again on every launch — for ever.
- **`android.versionCode` in `app.json` must go up on every release.** Android
  refuses to install an APK that does not raise it, and refuses it silently: the
  installer opens and closes with no message.

Never edit anything under `android/` by hand. It is generated, gitignored, and
`expo prebuild` **clears** it rather than merging — everything that has to
survive is written by `plugins/with-release-signing.js` instead.

### Which command

| When | Command |
|---|---|
| Day to day, onto a device or emulator | `bun run android` |
| After changing `app.json`, adding a native module, or pulling one | `bunx expo prebuild -p android` first |
| Release APK | `cd android && ./gradlew assembleRelease` |
| Machine runs out of memory mid-build | add `CMAKE_BUILD_PARALLEL_LEVEL=2` and `--max-workers=2 --no-parallel` |
| Smaller APK, phones only | `-PreactNativeArchitectures=arm64-v8a` |
| Emulator only | `-PreactNativeArchitectures=x86_64` |
| Something is stale in a way that makes no sense | `cd android && ./gradlew clean` |

The full release build, with the memory guards, on a machine that cannot spare
16 GB:

```bash
cd android
CMAKE_BUILD_PARALLEL_LEVEL=2 ./gradlew assembleRelease \
  -PreactNativeArchitectures=armeabi-v7a,arm64-v8a \
  --max-workers=2 --no-parallel
```

The default builds four ABIs; `x86` and `x86_64` are emulator-only, so dropping
them halves the native link work and the APK size. `arm64-v8a` alone covers
every Android phone from roughly 2015 on and is smaller again — which matters
here, because somebody downloads it over the connections this app is written
around. Don't pipe `gradlew` through `tail`: it swallows the exit code and a
failed build reports success.

The APK lands at `android/app/build/outputs/apk/release/app-release.apk`.

### Signing

Release APKs are signed with the upload keystore in `credentials/`, which is
gitignored and is **not** in the repository — get it from whoever holds it, and
keep using the same one for ever. The day it changes, no installed Smaran can
accept an update again.

The passwords go in `.env` (`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
`ANDROID_KEY_PASSWORD` — see `.env.example`), and
`plugins/with-release-signing.js` copies the keystore in and writes the gradle
signing config on every prebuild.

| Condition | What happens |
|---|---|
| Keystore and passwords both present | release builds are signed with it |
| No keystore in `credentials/` | prebuild says nothing, release falls back to the debug key — fine for working on the app, never for a build anybody installs |
| Keystore but no passwords | prebuild stops with an error, rather than quietly producing an APK no phone can accept as an update |

A debug build and a release build are signed with different keys, so **a dev
build cannot be updated by a release APK.** To test the updater end to end,
install a release build first, then update it with another release build signed
with the same keystore.

### Publishing a release

1. Bump `version` and `android.versionCode` in `app.json`.
2. Build the release APK as above.
3. Create a GitHub release on the repo in `EXPO_PUBLIC_UPDATE_REPO`, tagged
   exactly the `version` from step 1 — `1.2.0` or `v1.2.0`, both parse.
4. Attach the APK. **Check the asset shows a digest** — `checkForUpdate` refuses
   any release whose APK has no published SHA-256 and reports it as nothing
   available, because an APK it cannot verify is not something to put in front
   of this reader.

Drafts and prereleases are skipped, and position in the list decides nothing —
the newest valid stable semver tag wins.

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
