# Conventions

The files are the authority; this writes down what they already do. Read two or three
siblings before adding a fourth.

---

## 1. Layout & naming

- **Files:** `kebab-case.ts(x)` everywhere — `use-appearance.tsx`, `settings-list.tsx`,
  `native-host.tsx`. Route files follow expo-router's own rules (`_layout.tsx`,
  `+not-found.tsx`, `(tabs)/`).
- **Exports:** `PascalCase` components, `camelCase` functions, `PascalCase` const objects
  that act as token tables (`Colors`, `Spacing`, `TextStyles`, `AppIcons`, `TouchTarget`).
- **Barrels:** `components/ui/index.ts` and `theme/index.ts` re-export everything, types
  first, alphabetically. Add your export there when you add a module.
- **Imports:** `@/*` → `src/*`. No relative parent chains. Biome sorts them; don't fight it.
- **Types:** export the props type beside the component —
  `export type ScreenProps = {...}` next to `export function Screen`.

## 2. Components

- Named exports for components; `export default` **only** for route files, because
  expo-router requires it.
- Props are an inline object type with a JSDoc line per non-obvious field:
  ```ts
  export type ScreenProps = {
    /** Large heading announced first by screen readers. */
    title: string;
    /** Set false for screens that manage their own scrolling or fill the frame. */
    scrollable?: boolean;
  };
  ```
- One `StyleSheet.create` at the bottom of the file. Static style in the sheet; only
  theme-dependent values inline: `style={[styles.pill, { backgroundColor: colors.primaryMuted }]}`.
- Module-level `const` for magic numbers, named and commented:
  ```ts
  /** Icon, and the pill that sits behind it while its tab is the active one. */
  const TAB_ICON_SIZE = scale(32);
  ```
- Helper components and pure helpers go **below** the main export in the same file when they
  are only used there. Promote to `components/ui/` when a second file needs them.

## 3. Comments — the house style

This is the most distinctive thing about the codebase. Comments explain **why**, in plain
full sentences, usually about a tradeoff or a thing that looks wrong but isn't. They never
narrate what the next line does.

Every module and exported component gets a JSDoc block that opens with a one-line statement
of purpose, then the reasoning:

```ts
/**
 * Four destinations, always visible, always labelled. Recognition beats recall:
 * no hidden drawers, no more than four choices, and no label that only shows up
 * once you have already arrived.
 *
 * The active tab is marked by a filled pill behind its icon rather than a rule
 * under it: a solid shape reads at a glance and from an arm's length away,
 * where a 3pt line does not.
 */
```

Inline comments defend a decision:

```ts
// The layer underneath every screen. Left at its platform default it is pure
// white, which is what shows through for a frame whenever a screen is being
// attached or detached — the flash people see on the way back from a pushed
// screen. Painting it the app canvas makes that frame invisible.
```

**Do:** explain the tradeoff · say what breaks without this · name the user need
(low vision, tremor, recall) · use em dashes and ordinary prose · British-ish spelling
(`colour` in prose, `color` in code identifiers).

**Don't:** `// set the background colour` · `// loop over items` · `// TODO: fix later`
without saying what · restate the type signature.

**TODOs are specs.** Write them the way the existing ones are written — they name the
endpoint or the mechanism that will replace the placeholder:

```ts
/** TODO: replace the placeholders with the day's plan from `GET /dashboard`. */
```

## 4. User-facing copy

Plain, warm, second person, sentence case. It is part of the accessibility work, not
decoration.

- ✅ "The people close to you, and how to reach them."
- ✅ "Photos and stories shared with you will collect here, newest first."
- ✅ "Turns dark when your phone does."
- ❌ "Contact management" · "Error 401: unauthorized" · "No data available"

Empty states say what *will* appear and where it comes from, never just "nothing here".
Settings options are spelled out in full rather than hidden behind an unlabelled slider —
"Match my phone", "Always light", "Always dark". Never blame the user, never show a code,
never use jargon, never abbreviate to save space.

## 5. Accessibility, in code

- `accessibilityRole="header"` on screen titles, `"button"` on every `Pressable`.
- `accessibilityLabel` on every icon-only control.
- `hitSlop={HitSlop}` on small pressables.
- Sizes from `TouchTarget`; never a bare number.
- `tabBarAllowFontScaling`, `numberOfLines` guards, and `ScrollView` wrappers so enlarged
  system text can never trap content off-screen.
- Pressed feedback is opacity, subtle, and consistent (`pressed && styles.pressed`).

## 6. Hooks & state

- Context providers live in `src/hooks/` as `use-*.tsx` and export both the provider and the
  hook from one file.
- Providers memoise their value (`useMemo`) and their callbacks (`useCallback`).
- **Hooks degrade gracefully outside their provider** — `useRecall()` returns a `FALLBACK`
  rather than throwing, so a screen rendered on its own still works. Follow that pattern:
  ```ts
  export function useRecall(): RecallValue {
    return useContext(RecallContext) ?? FALLBACK;
  }
  ```
- Keep derived values in the hook (`useTheme` returns `{ scheme, isDark, colors }`) so
  screens don't recompute them.

## 7. TypeScript

`strict` is on. No `any`. No `!` to silence the checker. `as const satisfies Record<K, V>`
for token tables so keys stay exhaustive and values stay literal. Prefer union string
literals over enums.

## 8. Python (`apps/api`)

- ruff: 100 columns, 4-space indent, double quotes, two blank lines after imports,
  first-party = `src`, `combine-as-imports`.
- Rule set includes `B`, `SIM`, `UP`, `ARG`, `TCH`, `FAST`. `B008` is off for FastAPI
  `Depends`; `E501` is left to the formatter.
- Full type hints on public functions: `async def health_check() -> dict[str, str]:`.
- Feature folders: `src/features/<name>/router.py`, plus `schemas.py` / `service.py` /
  `models.py` as needed. Routers stay thin; logic goes in services.
- Routers export `router = APIRouter()` with no prefix; `main.py` owns prefixes and tags.
- Every response is a Pydantic model, so OpenAPI stays the contract.
- Imports resolve from `src/` as root: `from features.auth.router import router`.

## 9. Commits

Conventional commits with an app scope, subject in sentence case, no trailing period:

```
feat(mobile): Recall Name screen on startup
fix(api): imports
refactor(mobile): Cleanup
chore(ci): added setup task
```

Scopes: `mobile`, `web`, `api`, `ci`, or none for repo-wide. Commit or push only when asked.

## 10. Checks

```bash
bun run --cwd apps/mobile lint      # biome check
bun run --cwd apps/web lint
uv run --project apps/api ruff check
bunx tsc --noEmit -p apps/mobile
```

Pre-commit runs `lint-staged`, which auto-fixes and formats staged files. If it rewrites
your work, restage and carry on.
