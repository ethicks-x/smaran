# Progress

**As of 2026-09-01** · `main` · deadline **2026-09-20** (19 days)

Read this before calling into anything. A screen that renders is not the same as a feature
that works — most of what exists is UI over placeholders.

> **Demoing on 2026-09-03?** Read `artifacts/prototype-path.md` first — it is the
> two-day solo triage, and it overrides §Next below until the demo is done.
>
> **This file is stale in two places** (2026-09-01):
> `capabilities.md` still reports no game code and no i18n, and the Foundation table's
> Tailwind/Uniwind row describes a `metro.config.js` and packages that are not in this
> working tree. The first two are fixed as task Z2 of the prototype path.

Legend: **✅ done** · **🟡 partial / placeholder** · **⬜ not started**

---

## Headline

The **patient app's shell is real and good**: theming, accessibility, navigation, auth, and
a design system are all built to a high standard. Underneath it, the device store is now
real and two features sit on it. The patient app speaks four languages with the network
off; it has its first game — Matching pairs — which plays end to end and measures itself,
and those measurements are kept: SQLite + Drizzle is in, with every device table from
`data-model.md` §1 (D-24). **Today is now the reader's actual day** — reminders are read
from that store, marked done into it, and added from a dialog on the screen itself (D-25).
Sync, notifications and voice are still missing. The dashboard is `create-next-app`. The
backend has SQLAlchemy models and Clerk token verification with two route guards, but no migrations and no endpoint yet uses either.

The rubric's centrepiece — adaptive cognitive games — has one game, and that game now
adapts. The loop from "open a game" to "finish a deck" is real, every board closes a
`SessionStats` (D-22), the row is on disk (D-24), and the engine reads those rows back:
Matching pairs opens on the rung this reader's own recent rounds point at, and the dialog
after a finished board offers the next one **and says why**, in their language (D-26). What
is still missing is more games, and a second ladder to prove the engine is not shaped around
this one.

---

## `apps/mobile` — patient app

### Foundation ✅

| Item | Notes |
|---|---|
| Expo 57 / RN 0.86 / React 19, typed routes, React Compiler | `app.json`, `tsconfig.json` |
| Design tokens | `src/theme/` — colours (AAA-rated), six highlight palettes (also AAA), type (18pt floor), spacing, radii, touch targets |
| Global `UIScale` dial | `theme/layout.ts`, currently `0.75` |
| Appearance preferences | theme mode, text size, highlight colour, bold text — persisted, `use-appearance.tsx` |
| UI kit | `Screen`, `Surface` (with `elevated`), `Section`, `SettingCard`/`SettingField`, `Text`, `ActionButton`, `ChoiceGroup`, `PreviewChoice`, `ColorChoice`, `StepSlider`, `Toggle`, `CodeInput`, `EmptyState`, `ProgressBar` (with a `durationMs` countdown mode), `Dialog` (scrolling, with a `details` slot), `Confetti`, `SettingsGroup`/`Row`/`Link`/`Accordion`, `TextField`, `TimeField` (four buttons, never a wheel — D-25), `NativeHost`, `AppIcons` |
| Native bridging | `NativeHost` wraps `@expo/ui` with our scheme + the chosen highlight as seed colour |
| Localisation | `i18next` + `react-i18next`, four bundled catalogues, `src/i18n/` |
| Tailwind via Uniwind | `uniwind@1.11` + `tailwindcss@4`, Metro plugin only — `metro.config.js`, `src/global.css`. Tokens generated from `src/theme/*.ts` into `src/theme/tokens.css` by `bun run --cwd apps/mobile theme:css`; `use-uniwind-appearance.ts` pushes the highlight and text size over them at runtime. Nothing migrated yet — screens still use `StyleSheet`. D-17 |
| Biome lint/format | `bun run --cwd apps/mobile lint` |

### Navigation & auth ✅

| Item | Notes |
|---|---|
| Root gate | `_layout.tsx` — splash held until Clerk + appearance + language load; `Stack.Protected` guards |
| Clerk hosted auth | sign-in via Account Portal, `smaran://` deep link, `+native-intent.ts` |
| Bottom `TopTabs` pager | five labelled tabs, swipeable, pill indicator |
| Landing | animated intro pager, page dots, sign-in CTA — `landing.tsx`, `components/landing/` |
| Recall | once-per-launch name warm-up; per-letter scoring, reveal after 3 misses, in-memory only |
| API client | `src/lib/api.ts` (`apiFetch`, `API_BASE_URL`, `ApiError`, `ApiUnreachableError`) + `useApi()` in `src/hooks/use-api.ts`. Clerk session token per call, `Authorization: Bearer`. Base URL from `EXPO_PUBLIC_API_URL`, falling back to the Expo packager host on `:8080`. The only caller is a `__DEV__`-only “Developer” row on Account that GETs `/users/me` — D-21 |
| Account stack | profile (editable — name, phone, photo), appearance (four dials, all working), language (working), notifications (placeholder copy) |
| Game session stats | `src/lib/game-stats.ts` (pure — accuracy, precision, completion, response times, consistency, streak) + `useGameSession` (`src/hooks/`) for the clock and per-attempt timing + `src/lib/game-history.ts`, now backed by the `game_session` table. Matching pairs is wired to it. `GameSummary` shows four warm lines in the win dialog and `GameStatsDetail` dumps every field under `__DEV__`. D-22, D-23, D-24 |
| Reminders | ✅ `src/lib/reminders.ts` — the `HH:MM\|1111111` schedule format, `remindersFor(day)` computing a day's occurrences, `addReminder()`, and `acknowledge()` writing a `reminder_event` with its `sync_queue` entry in one transaction. `src/hooks/use-reminders.ts` holds the screen state and re-reads on focus; every call is guarded so a store that will not open costs the reminders and not the screen. D-25 |
| Local database | ✅ `expo-sqlite` + `drizzle-orm` — `src/db/`. All nine device tables from `data-model.md` §1: `patient`, `device`, `game_session`, `session_event`, `reminder`, `reminder_event`, `person`, `memory_item`, `sync_queue`. Opened synchronously but lazily (`db()`, on first use); hand-written DDL versioned by `PRAGMA user_version` in `migrations.ts`; `device` row and its `seq` counter ensured at open. **Native module — the dev build must be rebuilt after pulling this.** D-24 |
| Games stack | `src/app/games/` pushed over the tabs, entered from a card on Today; `src/components/games/` holds `GameCard`, `GameFrame`, `MemoryCard`, `MemoryBoard` and the `Symbols` table — D-18, D-19 |

### Screens 🟡

| Screen | State |
|---|---|
| **Today** | ✅ greeting, date and the day's plan are real. Reminders come from the `reminder` table: the next one is a raised card — big time, one "I have done this" button — and the rest of the day is one grouped list of rows under it, in time order, where a done row stays put with a tick and the time it was done. "Add a reminder" opens a dialog (kind, words, time) that writes the row. Nothing here touches the network. D-25 |
| **People** | 🟡 `EmptyState` only. `TODO: load the circle from the API` |
| **Memories** | 🟡 `EmptyState` only. `TODO: load shared memories` |
| **Help** | 🟡 layout + call button real; contact is hardcoded. `TODO: real primary contact + notify dashboard` |
| **Settings** | ✅ platform-shaped list: account row on top, grouped setting rows, sign-out on its own card |
| **Games** | ✅ list of games at `games/index.tsx`, reached from a card on Today — `decisions.md` D-18 |
| **Matching pairs** | 🟡 plays end to end: four square boards (4×4, 6×6, 8×8, 12×12), face-up preview under a draining bar and no buttons, flip (a third card settles the pair already up rather than waiting), matches held on the board, a win dialog with confetti onto the next board. Every board is measured (D-22) — turns, pairs found, time per turn, finished or put down — and the win dialog shows pairs found, turns taken, the share of turns that were right, and roughly how long it took, with a full metric dump under `__DEV__` (D-23). Framed by `GameFrame` — cross, board name, settings — not `Screen` (D-19). 8×8 and 12×12 scroll sideways on a phone — cards are clamped at the touch floor. Every session — finished or put down — is written to `game_session` with its `sync_queue` entry in one transaction (D-24) |
| **Notifications** | 🟡 describes behaviour that does not exist yet |
| **Profile** | ✅ first name, last name, phone number and photo are editable and saved to Clerk — `decisions.md` D-13 |

### Localisation ✅ (translations unreviewed)

| Item | Notes |
|---|---|
| `i18next` + `react-i18next` + `expo-localization` | `src/i18n/index.ts`; init is synchronous, all catalogues in the bundle |
| English, Hindi, Bengali, Assamese | `src/i18n/locales/*.json`, key-identical, `en.json` is the typed contract |
| Language choice, stored and offline | `use-language.tsx` (`smaran.language` in secure store), `account/language.tsx` |
| Every screen and component translated | no English string literals left outside the catalogues |
| Dates and numbers | `useLocale()`, Latin digits pinned — `decisions.md` D-12 |

**Not done:** no native speaker has reviewed the Hindi, Bengali or Assamese copy. They are
drafted, key-complete and consistent, and good enough to demo — but a review pass by people
who speak them belongs before submission. No language beyond these four; the next one on a
script the platform does not ship (Meitei Mayek) also needs a bundled font.

### Core capability ⬜

| Item | Blocking |
|---|---|
| Local SQLite + Drizzle | ✅ done — see Foundation above. Sessions persist; the sync queue exists and nothing drains it yet |
| Cognitive games | 🟡 one game (Matching pairs), four difficulty levels, no longer fixed — the opening board and the one offered next both come from the engine (D-26). Every board is measured (D-22) and the row is stored (D-24). The rest of the deliverable is more games, not more plumbing |
| Adaptive difficulty engine | 🟡 `lib/adaptive.ts` — pure, rule-based, reads this reader's own recent rounds and returns a rung plus a reason code (D-26). Wired into Matching pairs at both ends: the opening board and the offer after a finished one, with the reason said in four languages. **Missing:** it is the one game's ladder only, and there are no tests |
| Reminders (medicine / hydration / activity / appointments) | 🟡 definitions, a day's occurrences and adherence events all work on-device and are wired to Today (D-25). **Missing:** `expo-notifications`, so nothing fires when the app is closed and `reminder.notification_ids` stays `[]`; no way yet to edit, switch off or delete a reminder once added; every reminder repeats every day, because the dialog asks three questions and the days mask is not one of them |
| Voice prompts (TTS) | `expo-speech` not installed |
| Sync queue + upload | needs the local DB and the API |

---

## `apps/api` — backend 🟡

| Item | State |
|---|---|
| FastAPI app, uvicorn on `:8080` | ✅ |
| `/health` + `/auth/health`, `/users/health`, `/dashboard/health` | ✅ — health checks |
| ruff config, feature-folder layout | ✅ |
| Settings from env / `.env` | ✅ `src/core/config.py`, pydantic-settings; `.env.example` is the template |
| Clerk token verification | ✅ `src/features/auth/service.py` — `authenticate`, `require_auth`, `require_caregiver`, `require_roles`, `granted_roles` |
| Route guards | ✅ `@auth_required` / `@caregiver_required` in `decorators.py`; `requires_auth` / `requires_caregiver` / `optional_auth` in `dependencies.py` |
| Role self-provisioning | ✅ `POST /auth/caregiver-role` grants caregiver role in Postgres for authenticated Clerk users |
| Clerk user profile resolution | ✅ `src/core/clerk.py` resolves names, email, avatars from Clerk Backend API |
| `GET /users/me` | ✅ `@auth_required`; returns Clerk id, granted roles, `is_caregiver`, and linked `patient` row |
| Dashboard API for Caregiver Web PWA | ✅ Full suite under `/dashboard`: summary stats, patient CRUD, memory subjects CRUD, progress/session summaries, trend rollups, casual play logs, activity feed, notifications & baseline attention flags |
| SQLAlchemy models | ✅ `src/features/database/models.py` |
| Migrations | ⬜ Alembic is a dependency but there is no `alembic/`; `init_db()` calls `create_all` on startup |
| TimescaleDB hypertable + continuous aggregates | ⬜ |
| Sync ingest endpoint (`/sync/sessions`) | ⬜ |

The Caregiver Web Dashboard backend is fully built, typed, linted, and reflected in the OpenAPI contract.

---

## `apps/web` — caregiver dashboard 🟡

Real UI — ~2,600 lines across a dashboard, patients, memories, activity, notifications and
settings — rendering `lib/mock-data.ts`. Tailwind v4, Recharts and framer-motion are in.
TanStack Query is still not installed, and no PWA/offline cache.

| Item | State |
|---|---|
| Auth (Clerk) | ✅ `ClerkProvider` in the root layout, `proxy.ts` protecting every non-public route, `<SignIn>`/`<SignUp>` at `/login` and `/signup`, working sign-out in Settings |
| API client | ✅ `lib/api.ts` (transport) + `lib/api-server.ts` `api()` + `hooks/use-api.ts` `useApi()` — D-27 |
| Screens fed by the API | ⬜ every screen still reads `lib/mock-data.ts`. The client exists; nothing calls it yet |
| Identity on screen | 🟡 the header shows the real Clerk user; Settings still renders the mock caregiver |
| Data fetching/caching | ⬜ TanStack Query not installed |

Next on this app: point one screen at `api()` — `/users/me` or `/dashboard/summary` — and
delete the mock behind it.

Note for whoever wires the browser to the API: `apps/api` now sets `CORSMiddleware` from
`CORS_ALLOW_ORIGINS` (default `http://localhost:3000`). The dashboard origin must be in
**both** that and `CLERK_AUTHORIZED_PARTIES`, or every call fails as `ApiUnreachableError`
— which is what a blocked preflight looks like from the browser.

---

## Repo-level

| Item | State |
|---|---|
| Bun workspaces + uv project | ✅ |
| `Taskfile.yml` with tmux dev dashboard | ✅ |
| Husky + lint-staged pre-commit | ✅ |
| `packages/` for shared TS | 🟡 directory exists but is empty — **and the root workspace glob says `apps/packages/*`, which does not match it.** Fix before adding a package |
| Tests | ⬜ none, anywhere |
| CI | ⬜ none |
| Root `README.md` | 🟡 "Overview: To be updated..." |

---

## Next — ordered by what unblocks the most

*Superseded until 2026-09-03 by `prototype-path.md`. Resume here afterwards.*

1. ~~**Local persistence** (`expo-sqlite` + Drizzle)~~ — done 2026-09-01, D-24.
2. ~~**Persist the session rows.**~~ — done 2026-09-01. Neither caller needed editing, as
   D-22 intended.
3. ~~**Adaptive engine v1** as a pure module reading `recentSessions()`~~ — done 2026-09-01,
   D-26, and wired into Matching pairs at both ends. What is *not* done: no tests behind it,
   and the reason sentence is the only thing the reader ever sees of it, which is by design
   but has not been read aloud yet — that is the `expo-speech` pass.
4. **Reminders** — the store and the Today UI are done (D-25). What is left is
   `expo-notifications` for local scheduling with no server dependency, and a way to edit
   or remove a reminder that has been added.
5. **API ingest** — SQLAlchemy + Alembic + Postgres, `POST /sync/sessions` with
   `(device_id, seq)` dedupe (`api-contract.md`).
6. **Sync client** — drain the queue on app open and on connectivity regained.
7. **Dashboard** — TanStack Query + Recharts against the aggregation endpoints, personal
   baseline only.
8. **TTS** — voice output, keyed the same way as the string catalogue so a prompt and its
   audio cannot drift. Strings are already externalised (D-12), which was the hard half.

## Open questions

- **Enrollment flow.** Clerk gives a sign-in; the PS wants a caregiver to enrol a device
  once and hand it over. That flow is undesigned. See `decisions.md` D-01.
- **Who reviews the Hindi, Bengali and Assamese translations**, and which language is
  fifth? (Answered for the first four — `decisions.md` D-12.)
- **Do People/Memories sync down**, and from where does the family upload them?
