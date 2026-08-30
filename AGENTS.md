# AGENTS.md — Smaran

Instructions for AI coding agents working in this repository. Read this file fully before
editing anything. It is the operating manual; `plan.md` is the problem statement and
`artifacts/` is the living knowledge base.

---

## 0. Orientation — read these, in this order

| Step | File | Why |
|---|---|---|
| 1 | `AGENTS.md` (this file) | How to work here: rules, style, workflow |
| 2 | `artifacts/progress.md` | What actually exists today vs. what is still a stub |
| 3 | `artifacts/architecture.md` | How the pieces fit and where a change belongs |
| 4 | `artifacts/decisions.md` | Choices already made — do not silently re-litigate |
| 5 | `plan.md` | The SIH26003 problem statement and the team's pitch |

`artifacts/conventions.md`, `artifacts/data-model.md`, `artifacts/api-contract.md`, and
`artifacts/capabilities.md` are reference material — open them when the task touches
their subject.

**`plan.md` describes the intended system. It is not a description of the code.** Large
parts of it are unbuilt, and a few parts were built differently (auth, most notably). When
the two disagree, the code is the fact and `artifacts/decisions.md` explains the gap.
Never write code that assumes a `plan.md` feature exists — check `artifacts/progress.md`.

---

## 1. What this project is

**Smaran** — an offline-first Android/tablet app for elderly people living with dementia in
India's North Eastern Region, plus a caregiver dashboard and a sync backend. Submission for
Smart India Hackathon problem **SIH26003** (MDoNER). Deadline **20 September 2026**.

Three deployables in one monorepo:

- `apps/mobile` — the patient app. Expo (React Native) + TypeScript + expo-router.
- `apps/web` — the caregiver dashboard. Next.js App Router + TypeScript + Tailwind.
- `apps/api` — the sync/analytics backend. FastAPI + Pydantic.

The person holding the phone has dementia. Every decision in `apps/mobile` is downstream of
that one fact.

---

## 2. The five rules

These are non-negotiable. A change that breaks one is a regression even if it compiles,
passes lint, and does what the ticket asked. Say so and propose the alternative rather than
merging it quietly.

### 2.1 Offline-first is the product

Playing a game, seeing a reminder, hearing a voice prompt, opening any patient screen —
**none of these may require a network call.** The network is for syncing already-captured
data, and for nothing else. If a feature seems to need the network on the patient side,
the answer is almost always: do it on-device, write the result to local storage, and queue
the consequence for sync.

There is no local database yet (see `artifacts/progress.md`). Until there is, do not paper
over the gap with a network fetch on a core patient flow — build the local store, or leave
the placeholder and say why.

### 2.2 No required background execution

Managed Expo cannot promise unattended background work. Sync must be *triggerable* — on app
open, on connectivity regained, on user action — never *assumed* to have happened. Do not
design a flow whose correctness depends on a background task having run.

### 2.3 Elderly accessibility is a hard constraint, not a preference

- Touch targets come from `TouchTarget` in `src/theme/layout.ts`. Never hardcode a size
  below the platform floor of 48pt.
- Type comes from `TextStyles`. The floor is 18pt before scaling; there is no smaller step
  and you may not add one.
- Colour comes from semantic tokens in `src/theme/colors.ts` — `colors.text`,
  `colors.primary`, `colors.dangerMuted`. **Never a raw hex value in a screen or component.**
  The palette clears WCAG AAA (7:1) on the pairings it documents; a hex literal silently
  opts out of that.
- Copy comes from the locale catalogues. **Never an English string literal in a screen or
  component** — like a hex literal, it silently opts the app out of three languages.
- One primary action per screen — one filled button, and it sits above the fold.
- No time limits on any interaction. No penalty for slowness. Nothing that scolds.
- Voice **output** is the accessibility layer and must always be sufficient on its own
  alongside touch. Voice **input** is a bonus, never a dependency.
- Recognition over recall in navigation: visible labels, no hidden drawers, no gesture that
  is the only way to reach something.
- Copy is plain, warm, and second-person: "The people close to you, and how to reach them."
  Not "Contact management". Never an error code, never jargon, never blame.

### 2.4 Personal baseline, never a population score

Every analytic, insight, flag, or difficulty adjustment compares a patient against **their
own history**. There is no cross-patient benchmark, no percentile, no "average user". This
is the project's stated differentiator and its clinical justification — a population norm
for a dementia cohort in NER does not exist and inventing one would be dishonest.

### 2.5 Patient data is sensitive

Cognitive performance data is health-adjacent personal data about a vulnerable person.
Never log raw patient data to plaintext or to the console. Never add an unauthenticated
caregiver-facing endpoint. Never put a name, a photo, or a session record into an error
message, a URL, or an analytics event. Secrets live in `.env` (gitignored) — never in code,
never in a commit.

---

## 3. Working agreement

### Before you write code

1. **Locate the change.** Which app? Which side of the offline/sync boundary
   (`artifacts/architecture.md` §3)? Which of the nine required capabilities
   (`artifacts/capabilities.md`)?
2. **Check what exists.** `artifacts/progress.md` tells you whether the thing you are
   about to call is real. Many screens are deliberate placeholders with a `TODO` naming the
   endpoint they are waiting for — honour those TODOs, they are the spec.
3. **Read the neighbours.** This codebase has a strong, consistent house style. Read two or
   three sibling files before adding a fourth. `artifacts/conventions.md` writes the style
   down, but the files are the authority.
4. **Reuse before you build.** `src/components/ui` already has `Screen`, `Surface`,
   `Section`, `Text`, `ActionButton`, `ChoiceGroup`, `CodeInput`, `EmptyState`,
   `ProgressBar`, `SettingsGroup`/`SettingsRow`/`SettingsLink`, `NativeHost`, `AppIcons`.
   A new screen should mostly be composition. If you need a new primitive, it goes in
   `src/components/ui` with an export added to `index.ts`, not inline in one screen.
5. **Use the stack that is here.** Do not introduce a new framework, state library, styling
   approach, or ORM without being asked. The chosen stack is in
   `artifacts/architecture.md` §2 and the decisions behind it in `artifacts/decisions.md`.

### While you write

- Match the surrounding comment style. This repo comments the *why* in short, plain,
  full-sentence prose — often explaining a tradeoff or a thing that looks wrong but isn't.
  It does not narrate the *what*. See `artifacts/conventions.md` §3 for worked examples.
- Keep strings user-facing-ready: no jargon, no truncation, no ALL CAPS.
- TypeScript is `strict`. No `any`, no non-null `!` to silence the checker. Export the props
  type next to the component.
- Python is `ruff`-linted with a broad rule set and full type hints on public functions.

### Before you finish

Run the checks for the app you touched. Do not skip this; the pre-commit hook runs
`lint-staged` and will reformat under you otherwise.

```bash
bun run --cwd apps/mobile lint          # biome check
bun run --cwd apps/web lint             # biome check
uv run --project apps/api ruff check    # ruff
bunx tsc --noEmit -p apps/mobile        # types
```

There is no test suite yet. If you add one, put it behind a `task` target and say so in
`artifacts/progress.md`.

### After you finish

Update `artifacts/progress.md` when you change what exists. Add to `artifacts/decisions.md`
when you make a choice a future agent could reasonably reverse by accident. These two files
are how the next session starts warm instead of cold — keeping them current is part of the
task, not a favour.

---

## 4. Repository map

```
smaran/
├── AGENTS.md              ← you are here;  CLAUDE.md is a symlink to this
├── plan.md                ← problem statement + pitch (intent, not implementation)
├── Taskfile.yml           ← every dev command; use `task`, not raw bun/uv
├── artifacts/             ← the agent knowledge base (see artifacts/README.md)
├── apps/
│   ├── mobile/            ← Expo patient app        (bun · biome · expo-router)
│   ├── web/               ← Next.js caregiver PWA   (bun · biome · tailwind v4)
│   └── api/               ← FastAPI backend         (uv  · ruff)
└── packages/              ← empty; shared TS packages will live here
```

**Tooling:** `bun` for JS/TS, `uv` for Python, `task` for scripts, `tmux` for the dev
dashboard, `biome` for JS/TS lint+format, `ruff` for Python, `husky` + `lint-staged` on
commit.

**Common commands** — always prefer these over ad-hoc invocations:

```bash
task setup        # install everything
task dev:all      # api + web + mobile, each in its own tmux window
task dev:split    # the same three, tiled in one window
task dev:api      # uv run src/main.py        → :8080
task dev:web      # next dev                  → :3000
task dev:mobile   # expo start
task stop         # kill the tmux session
```

### Path aliases

`apps/mobile` uses `@/*` → `./src/*` and `@/assets/*` → `./assets/*`. Use them; do not
write `../../..` chains.

`apps/api` runs with `src/` as the import root, so modules import as
`from features.auth.router import router` — not `from src.features...`.

---

## 5. App-specific notes

### `apps/mobile` — the patient app

- **Routing** is expo-router file-based with typed routes on. `src/app/_layout.tsx` is the
  gate: it holds the splash screen until Clerk and appearance preferences have both loaded,
  then routes via `Stack.Protected` guards to `landing` (signed out), `recall` (signed in,
  not yet recalled this launch), or `(tabs)`. Add a screen by adding a file; add it to a
  guard only if it should be gated.
- **Tabs** are `TopTabs` at the bottom — a pager, so screens swipe as well as tap.
  Five destinations, always labelled, always visible.
- **Theme.** `useTheme()` / `useThemeColors()` for colour, `TextStyles` for type, `Spacing`
  / `Radius` / `TouchTarget` for layout, `scale()` for anything sized by hand. `UIScale` in
  `src/theme/layout.ts` is a single global dial (currently `0.75`) that every derived size
  runs through — changing it re-tunes the whole app, which is why hardcoded pixel values
  are a bug and not just a style nit.
- **Tailwind is available**, through Uniwind (`className` on any RN component, D-17). It is
  wired to the *same* tokens: `bg-surface`, `p-lg`, `text-body`, `min-h-touch-comfortable`.
  `src/theme/tokens.css` is **generated** from `src/theme/*.ts` — edit the TypeScript, then
  run `bun run --cwd apps/mobile theme:css` and commit both. Either styling approach is
  fine; §2.3 binds both, so `bg-[#fff]` is as much a violation as a hex in a `StyleSheet`.
- **Native controls.** Every `@expo/ui` component must be wrapped in `NativeHost`, which
  hands SwiftUI/Compose our colour scheme and a fixed seed colour. An `@expo/ui` component
  rendered outside one will silently use platform defaults.
- **Auth is Clerk**, not Better Auth as `plan.md` says. Hosted-auth flow, deep link back on
  the `smaran://` scheme, caught by `src/app/+native-intent.ts`. See
  `artifacts/decisions.md` D-01. The patient signs in **once** and stays signed in — never
  design a flow that asks them to authenticate again.
- **`recall`** is a warm-up, not a lock screen. It scores per letter, celebrates, and
  reveals the answer after three misses. It is in-memory only and repeats once per launch,
  deliberately — nothing about it is persisted.
- **Strings live in `src/i18n/locales/*.json`, never in a screen.** `en.json` is the source
  catalogue and its shape is the typed contract — a key missing from it is a compile error.
  Add copy there in all four languages, reach it with `useTranslation()`, and never build a
  sentence by concatenating translated fragments: a name inside a sentence is a whole key
  per language, and a count goes through i18next plurals. Dates and numbers format with
  `useLocale()`, never the phone's locale. See `decisions.md` D-12.

### `apps/web` — the caregiver dashboard

Bare `create-next-app` today: one page, default metadata, nothing project-specific. Tailwind
v4 via `@tailwindcss/postcss` is wired but the design system is not. TanStack Query and
Recharts are planned (`artifacts/architecture.md` §2) and not yet installed.

`apps/web/AGENTS.md` carries a generated block from `next dev` warning that this Next.js
version differs from training data — **read `node_modules/next/dist/docs/` before writing
Next.js code**, and commit that block if it reappears in your diff rather than deleting it.
`apps/web/CLAUDE.md` is an `@AGENTS.md` import, deliberately — leave both alone.

### `apps/api` — the backend

A FastAPI skeleton: `main.py` mounts three routers (`/auth`, `/users`, `/dashboard`) that
each expose only a health check. No database, no models, no migrations, no auth. Python
3.13, ruff at 100 columns, double quotes, two blank lines after imports.

New work goes in `src/features/<feature>/` following the existing shape — `router.py` plus
`schemas.py` / `service.py` / `models.py` as needed. Keep routers thin; put logic in
services. Every response model is a Pydantic model so the OpenAPI schema stays the contract.

---

## 6. The adaptive engine — read before touching it

Not built yet, and when it is built these rules bind:

- **Pure function, stable signature.** Input: a patient's recent session stats. Output: a
  difficulty adjustment. No I/O, no storage access, no clock, no randomness that isn't
  passed in. This is the seam that lets v1's rule-based logic be swapped for a model later
  without touching game or storage code.
- **v1 is rules, on-device, and that is deliberate** — there is not enough patient data for
  a model, and it must work with the network off. Do not propose an API call here.
- Inputs are accuracy, response time, attempts, and consistency, measured against **this
  patient's own recent history**.

---

## 7. Git

- Conventional commits with an app scope: `feat(mobile):`, `fix(api):`, `refactor(web):`,
  `chore:`, `docs:`. Subject in sentence case, imperative-ish, no trailing period —
  matching the existing log (`feat(mobile): Recall Name screen on startup`).
- Branch is `main`. **Commit or push only when asked.**
- The pre-commit hook formats and lints staged files. If it rewrites your work, that is
  expected — restage and continue.
- Never commit `.env`, `node_modules/`, `.venv/`, `__pycache__/`, or build output.

---

## 8. Known gaps and traps

Things that will bite you. Each is tracked in `artifacts/progress.md` or
`artifacts/decisions.md`.

- **No local database.** `expo-sqlite` and Drizzle are planned, not installed. There is no
  session store and no sync queue. Nothing offline is actually persisted yet.
- **No games.** The core deliverable of the problem statement has no code.
- **i18n is in place, but the translations are unreviewed.** English, Hindi, Bengali and
  Assamese all ship in the bundle (`decisions.md` D-12). No native speaker has read the
  three translations yet, and no NER language beyond these has been started.
- **No voice.** No TTS anywhere.
- **Root `package.json` workspaces say `apps/packages/*`, but the directory is
  `packages/`.** Anything added to `packages/` will not be picked up until that glob is
  fixed. Fix it when you first need a shared package; flag it, don't silently ignore it.
- **Naming drift.** The product is *Smaran*; the team is *spaced*; the root package is
  `cgamp`. `plan.md` uses the team name throughout. Use **Smaran** in anything user-facing.
- **`plan.md` names Better Auth; the app ships Clerk.** See D-01.
- **`apps/mobile/src/app/(tabs)/index.tsx` has a commented-out `headerAction`** and unused
  imports kept alongside it. Leave it or finish it — don't half-clean it.

---

## 9. Scope discipline

Do the task asked. Do all of it. If part is blocked, finish the rest and say plainly what
you left and why.

Do not: rewrite the theme system, restructure routing, swap a library, add a dependency,
reformat files you didn't otherwise touch, or "fix" `plan.md` to match the code — it is a
submission document and a historical record.

Do: flag a real conflict with §2 in a sentence or two, then keep building under a stated
assumption rather than stopping.
