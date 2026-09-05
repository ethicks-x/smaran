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
off; it has three games — Matching pairs, Find what is missing, and People and places you
know — which play end to end and
measure themselves, and those measurements are kept: SQLite + Drizzle is in, with every device table from
`data-model.md` §1 (D-24). **Today is now the reader's actual day** — reminders are read
from that store, marked done into it, and added from a dialog on the screen itself (D-25).
Sync, notifications and voice are still missing. The dashboard is `create-next-app`. The
backend now has a SQLAlchemy model for every device table that syncs (D-32), alongside Clerk
token verification with two route guards — and, as of today, the two routes that write the
synced tables. **The loop closes**: a round ends, the row and its queue entry hit local disk
in one transaction, and the next time the app opens the outbox drains to `/sync/*` and the
rows land on the server (D-33). **And the loop runs both ways** (D-34): a caregiver adds,
edits or retires a reminder on the dashboard's API and the phone takes it; a phone that has
been reinstalled pulls this reader's game history back down so the adaptive engine still
knows who it is talking to. **Alembic now owns the schema** (D-35) — `task db:migrate` —
which unblocks all of the above on a database that already exists.

The rubric's centrepiece — adaptive cognitive games — has three games, and all three adapt.
**The third one is the recognition game the problem statement actually asks for** (D-46):
its content is this reader's own family, places and belongings rather than a pool of emoji,
and the questions about them are written once by Gemini — server-side, over whatever
connection is there — and then asked offline for ever after out of `memory_question`. The
loop from "open a game" to "finish a board" is real, every board closes a `SessionStats`
(D-22), the row is on disk (D-24), and the engine reads those rows back: each game opens on
the rung this reader's own recent rounds point at, and the dialog after a finished board
offers the next one **and says why**, in their language (D-26). **The second ladder is now
built and it is shaped nothing like the first** — not square, not a grid width, and its
hardest dial is words rather than size — and `adjustDifficulty` drove it without a line
changing (D-30). What is still missing is tests behind the engine, a template floor under
the recognition game for a device that has never once had signal (D-46), and more games.

---

## `apps/mobile` — patient app

### Foundation ✅

| Item | Notes |
|---|---|
| Expo 57 / RN 0.86 / React 19, typed routes, React Compiler | `app.json`, `tsconfig.json` |
| Design tokens | `src/theme/` — colours (AAA-rated), six highlight palettes (also AAA), type (18pt floor), spacing, radii, touch targets |
| Global `UIScale` dial | `theme/layout.ts`, currently `0.75` |
| Appearance preferences | theme mode, text size, highlight colour, bold text — persisted, `use-appearance.tsx` |
| UI kit | `Screen` (one-row app bar, back arrow, `stickyHeader` — D-31, optional pull-to-refresh — D-53), `Surface` (with `elevated`), `Section`, `SettingCard`/`SettingField`, `Text`, `ActionButton` (Compose's own `colors` on Android, `tint` on iOS — a native button's fill is not a background, D-50), `ChoiceGroup`, `PreviewChoice`, `ColorChoice`, `StepSlider`, `Toggle`, `CodeInput`, `EmptyState`, `ProgressBar` (with a `durationMs` countdown mode), `Dialog` (scrolling, safe-area inset, with a `details` slot), `Confetti`, `PhotoViewer` (one photograph full screen, grown in and shrunk back out, closed by a labelled button), `SettingsGroup`/`Row`/`Link`/`Accordion`, `TextField`, `FieldTrigger`, `SelectField` (the platform's own dropdown — D-43; painted from the palette and full width on Android — D-44), `TimeField` / `DateField` over `SchedulePicker` (Material 3's date and time dialogs on Android, in the app's own colours — D-43, D-44; dropdowns elsewhere), `RepeatField` (seven day toggles — D-42), `NativeHost`, `AppIcons` |
| Pull to refresh | `use-refresh.ts` — runs the same `sync()` the app runs on open and refreshes the care link; passed to `Screen`'s `onRefresh` by Today, Memories, a memory category and Help, and by nothing else (D-53) |
| Scroll backdrop | `use-scroll-backdrop.ts` — fades a solid strip in behind the status bar with the scroll offset; used by `Screen` and `GameFrame` (D-31) |
| Native bridging | `NativeHost` wraps `@expo/ui` with our scheme + the chosen highlight as seed colour |
| Localisation | `i18next` + `react-i18next`, four bundled catalogues, `src/i18n/` |
| Tailwind via Uniwind | `uniwind@1.11` + `tailwindcss@4`, Metro plugin only — `metro.config.js`, `src/global.css`. Tokens generated from `src/theme/*.ts` into `src/theme/tokens.css` by `bun run --cwd apps/mobile theme:css`; `use-uniwind-appearance.ts` pushes the highlight and text size over them at runtime. Nothing migrated yet — screens still use `StyleSheet`. D-17 |
| Launcher & splash art | ✅ generated from `assets/branding/logo.svg` / `logo-dark.svg` — iOS icon, Android adaptive foreground/background/monochrome, light and dark splash marks, favicon, and the `assets/smaran.icon` Icon Composer bundle. D-51 |
| Biome lint/format | `bun run --cwd apps/mobile lint` |

### Navigation & auth ✅

| Item | Notes |
|---|---|
| Root gate | `_layout.tsx` — splash held until Clerk + appearance + language load; `Stack.Protected` guards |
| Clerk hosted auth | sign-in via Account Portal, `smaran://` deep link, `+native-intent.ts` |
| Clerk offline load | `ClerkProvider` is given `__experimental_resourceCache` from `@clerk/expo/resource-cache`, so a signed-in session restores from the device with the radio off and the splash lifts. Without it Clerk only finishes loading by reaching its API and the app never opened offline — D-29 |
| Role enrolment | `use-role-enrolment.ts` — POSTs `/auth/patient-role` on the first session an account has on this phone, remembers the user id in the secure store, and is awaited by nothing. Offline is a no-op that retries next launch — D-28 |
| Care link & setup | ✅ `src/app/setup.tsx` — a signed-in reader with no **active** caregiver link sees this and nothing else: one field for the nine-digit Smaran id of the person who helps them, one button, then a spinner until that person accepts. `CareLinkProvider` (`hooks/use-care-link.tsx`) holds the state, caches it in the secure store per Clerk user id, and the root gate reads the **cache** — so a phone that has been set up once opens with the radio off forever after. `lib/care-link.ts` has the wire calls, the cache and `parseSmaranId`. Setup itself needs a signal, once, beside the sign-in that also does — D-38 |
| Bottom `TopTabs` pager | five labelled tabs, swipeable, pill indicator |
| Landing | animated intro pager, page dots, sign-in CTA — `landing.tsx`, `components/landing/` |
| Recall | once-per-launch name warm-up; per-letter scoring, reveal after 3 misses, in-memory only |
| API client | `src/lib/api.ts` (`apiFetch`, `API_BASE_URL`, `ApiError`, `ApiUnreachableError`) + `useApi()` in `src/hooks/use-api.ts`. Clerk session token per call, `Authorization: Bearer`. Base URL from `EXPO_PUBLIC_API_URL`, falling back to the Expo packager host on `:8080`. The only caller is a `__DEV__`-only “Developer” row on Account that GETs `/users/me` — D-21 |
| Account stack | profile (editable — name, phone, photo), appearance (four dials, all working), language (working), notifications (placeholder copy) |
| Game session stats | `src/lib/game-stats.ts` (pure — accuracy, precision, completion, response times, consistency, streak) + `useGameSession` (`src/hooks/`) for the clock and per-attempt timing + `src/lib/game-history.ts`, now backed by the `game_session` table. Both games are wired to it. `GameSummary` shows four warm lines in the win dialog and `GameStatsDetail` dumps every field under `__DEV__`. D-22, D-23, D-24 |
| Reminders | ✅ `src/lib/reminders.ts` — the `HH:MM\|1111111` and `HH:MM@YYYY-MM-DD` schedule formats (repeating and one-off — D-43), `remindersFor(day)` computing a day's occurrences, `addReminder()`, and `acknowledge()` writing a `reminder_event` with its `sync_queue` entry in one transaction. `src/hooks/use-reminders.ts` holds the screen state and re-reads on focus; every call is guarded so a store that will not open costs the reminders and not the screen. D-25 |
| Sync | ✅ **both directions.** Up: `src/db/queue.ts` (`queued`, `drop`, `bumpAttempts`, `oldestQueuedSeq`, `queueDepth`) + `src/lib/sync.ts` (`sync()`, batches of 100, ISO-8601 on the wire, one in-flight run) + `useSync()` at the root; a queue row is deleted only on a response that accounts for it, and 422 is the one status it ever gives up on (D-33). Down: `takeDown()` in the same file against `GET /sync/pull`, applying caregiver reminders through `applyReminders()`, replacing the memory subjects through `applyMemorySubjects()` and caching their photographs afterwards through `cacheSubjectPhotos()` (D-45), and restoring history through `restoreSessions()`, watermarked on the **server's** clock in `device.last_pulled_at` (D-34). Three streams go up — `reminder`, `game_session`, `reminder_event` — since a reminder the reader adds now reaches the dashboard too (D-36) |
| Self-update | ✅ `src/lib/version.ts` (pure — parse a tag, order two, decide how hard to press) + `src/lib/updates.ts` (`checkForUpdate()`, `fetchAndInstall()`) + `UpdateProvider`/`useUpdate()` at the root + `UpdateNotice` over every screen. Newest **stable** semver-tagged release from the GitHub repo in `EXPO_PUBLIC_UPDATE_REPO` (falling back to `ethicks-x/smaran`), first `.apk` on it, downloaded to the cache directory, SHA-256 checked against the digest GitHub recorded on upload, handed to Android's installer through expo-file-system's FileProvider. Forced on a major bump or five minor releases behind; a question with a "Not now" otherwise, and putting it off lasts one launch. Checked on open and on return to the foreground, at most once every four hours; awaited by nothing, so an unreachable GitHub is a non-event. `android.permission.REQUEST_INSTALL_PACKAGES`; the reader allows Smaran to install apps once at Android's own prompt. **That permission comes from `app.json` and only reaches the phone through a prebuild — an APK built before it was added starts the installer and is refused silently, which looks exactly like nothing happening.** Two further things make an install fail the same quiet way: a release APK whose signing key differs from the installed build, and a debug dev build being asked to update to a release-signed one. **`app.json`'s `version` is the number the updater compares, and it must equal the GitHub release tag** — `versionName` in `android/app/build.gradle` is what Android shows and is invisible to `checkForUpdate`, so the two drifting means an update that installs, still reports the old version and re-offers itself on every launch for ever. Nothing in `android/` is hand-edited any more: `plugins/with-release-signing.js` copies the keystore in from `credentials/` and writes the release `signingConfig` on every prebuild (passwords from `.env`, never committed), so both version numbers stay derived from `app.json` and prebuild is safe to run. `android.versionCode` must be bumped by hand per release — Android silently refuses an install that does not raise it. After the hand-off the card stops on `handedOff` with "Try again" and "Close" rather than on a buttonless `installing` — a required update stops being required at that point, because insisting cannot mean holding somebody on a card about an install that has already left the app's hands. **New deps: `expo-intent-launcher`, `js-sha256` — the dev build must be rebuilt after pulling this.** iOS does nothing. `EXPO_PUBLIC_UPDATE_PREVIEW` forces the card into any state under `__DEV__` for working on it without a release. The card carries an `UpdateDetails` block in every state — installed version, offered version, and the download's size, which becomes "arrived of total" while the download runs and "checked of total" while the hash does — for whoever the reader asks about the dialog. Both long stages draw a bar: `hashFile` reports its fraction on the breath it already takes every 4 MB, because hashing a 120 MB APK in JavaScript is minutes on a cheap tablet and a still bar reads as a stuck app. `useUpdate().check()` runs a check on demand, past the four-hour interval, and returns what it found; `UpdateRow` on Settings is its only caller, sitting under the version row so a caregiver on the telephone can have the app look without closing and reopening it. D-52 |
| Local database | ✅ `expo-sqlite` + `drizzle-orm` — `src/db/`. All nine device tables from `data-model.md` §1, plus `remote_session` (migration v2, D-34): `patient`, `device`, `game_session`, `session_event`, `reminder`, `reminder_event`, `person`, `memory_item`, `sync_queue`; plus `memory_subject` (migration v3, D-45) and `memory_question` (migration v4, D-46 — one set of recognition questions per language, cascading off the subject it is about). Opened synchronously but lazily (`db()`, on first use); hand-written DDL versioned by `PRAGMA user_version` in `migrations.ts`; `device` row and its `seq` counter ensured at open. **Native module — the dev build must be rebuilt after pulling this.** D-24 |
| Games stack | `src/app/games/` pushed over the tabs, entered from the **Games tab** or a block of tiles on Today (D-41); `src/components/games/` holds `GameCatalogue` (the one list of playable games, shared by Today and the games list), `GameCard`, `GameGrid`, `GameFrame`, `GameSummary`, `MemoryCard`, `MemoryBoard`, `ItemGrid`, `MissingOptions` and the shared `Symbols` table — D-18, D-19, D-30 |

### Screens 🟡

| Screen | State |
|---|---|
| **Today** | ✅ greeting, date and the day's plan are real. Reminders come from the `reminder` table: the next one is a raised card — big time, one "I have done this" button — and the rest of the day is one grouped list of rows under it, in time order, where a done row stays put with a tick and the time it was done. "Add a reminder" opens a dialog — words, kind, time, and how often: every day, some days, or once on a date the reader picks from Android's own calendar (D-42, D-43) — that writes the row. Under the day sits the games block: a 2×2 grid of square tiles — the first three games in `GameCatalogue` by name, and a fourth tile onto the full list. Nothing here touches the network. D-25 |
| **Memories** | ✅ the family's memory subjects, grouped under **People**, **Places** and **Things** — three cards to a row, each a photograph read off local flash with the name and the relationship under it, an empty category left out entirely, and the category's own mark drawn where a photograph has not arrived. A category shows two rows and no more: five subjects and a **See all** tile in the sixth cell, which pushes `memories/[kind]` — the category in full, same grid, same cards — on top of the tabs. The tile is only drawn when something is actually behind it. Synced down as a full snapshot and never sent back up; photos cached to the document directory by their stable object key. Nothing here touches the network. `src/lib/memory-subjects.ts`, `src/lib/media-cache.ts`, `src/hooks/use-memory-subjects.ts`, `src/components/memories/`. D-45. **Still `EmptyState` for `memory_item`** — the shared-photo-and-story feed is a separate table and nothing draws it yet |
| **Help** | 🟡 calls the caregiver for real — name and number ride on the cached care link, resolved from Clerk (D-49). No button when there is no number. `TODO: backup contacts (`person` is unsynced) + notify dashboard` |
| **Settings** | ✅ platform-shaped list: account row on top, grouped setting rows, sign-out on its own card. Under Safety and help sits **Refresh this phone** (D-48) — a confirmed reset that pushes the outbox, empties every content table, deletes the media cache and pulls the whole set back down; refused outright when the push cannot reach the server, so nothing is cleared that could not be fetched again. `src/lib/reset.ts`, `src/db/reset.ts`, `clearMedia()` in `src/lib/media-cache.ts` |
| **Games** | ✅ list of games at `(tabs)/games.tsx` — now a tab of its own, in the slot People held — mapped from `GameCatalogue`, also reached from the fourth tile of the games grid on Today; three cards on it — `decisions.md` D-18, D-41 |
| **Matching pairs** | 🟡 plays end to end: four square boards (4×4, 6×6, 8×8, 12×12), face-up preview under a draining bar and no buttons, flip (a third card settles the pair already up rather than waiting), matches held on the board, a win dialog with confetti onto the next board. Every board is measured (D-22) — turns, pairs found, time per turn, finished or put down — and the win dialog shows pairs found, turns taken, the share of turns that were right, and roughly how long it took, with a full metric dump under `__DEV__` (D-23). Framed by `GameFrame` — cross, board name, settings — not `Screen` (D-19). 8×8 and 12×12 scroll sideways on a phone — cards are clamped at the touch floor. Every session — finished or put down — is written to `game_session` with its `sync_queue` entry in one transaction (D-24) |
| **Find what is missing** | ✅ plays end to end: four boards (6, 9, 12 and 16 things, one missing on the first two and two on the last two), everything shown under a draining bar with no buttons, then the same grid back in a fresh order with a dashed question-mark tile where each missing thing stood. The answer is one of 3–5 large options — **pictures on the two easy rungs, names on the two hard ones** (D-30). **The options are things the board never showed**, so none of them is visible to check against and the answer has to be remembered rather than searched for. A wrong option is tinted and stays put, tries are unlimited, and the line under the bar says the thing tapped was not one of them rather than that the reader was wrong. A named thing drops back into its own gap in green and stays. Framed by `GameFrame`, measured and stored like any other board. Known cost: the 16-tile board and its five word options do not both fit on a small phone — `GameFrame` scrolls |
| **People and places you know** | ✅ plays end to end, on the family's own photographs. Opens on a preparing board — one bar, no buttons, nothing to decide — behind which `POST /quiz/generate` shows the memory subjects' pictures to Gemini and gets back gentle questions, written into `memory_question` and asked offline from then on (D-46). Four rungs, and the dial is **which way round the question is asked**: `about_photo` puts the photograph on screen and offers words, `find_photo` gives the words and offers photographs whose decoys are chosen on the device from subjects it actually holds. Bottom rung is all photo-first, the middle two mix, the top is all find-the-face. A wrong option is tinted and stays put, tries are unlimited, no timer. Framed by `GameFrame`, measured and stored like any other board, and the engine picks the opening rung and the one offered next. **Two gaps**: a device that has never once reached the endpoint has no questions and says so plainly rather than falling back to a template, and the generation call fires from the game screen rather than at enrolment where the signal is |
| **Notifications** | 🟡 describes behaviour that does not exist yet |
| **Profile** | ✅ first name, last name, phone number and photo are editable and saved to Clerk — `decisions.md` D-13 |

### Localisation ✅ (translations unreviewed)

| Item | Notes |
|---|---|
| `i18next` + `react-i18next` + `expo-localization` | `src/i18n/index.ts`; init is synchronous, all catalogues in the bundle |
| English, Hindi, Bengali, Assamese | `src/i18n/locales/*.json`, key-identical, `en.json` is the typed contract |
| Language choice, stored and offline | `use-language.tsx` (`smaran.language` in secure store), `account/language.tsx` |
| Every screen and component translated | no English string literals left outside the catalogues. The 86 symbol names live at `games.symbols.*`, shared by both games (D-30). `setup.*` is the newest block, in all four (D-38) |
| Dates and numbers | `useLocale()`, Latin digits pinned — `decisions.md` D-12 |

**Not done:** no native speaker has reviewed the Hindi, Bengali or Assamese copy. They are
drafted, key-complete and consistent, and good enough to demo — but a review pass by people
who speak them belongs before submission. No language beyond these four; the next one on a
script the platform does not ship (Meitei Mayek) also needs a bundled font.

### Core capability ⬜

| Item | Blocking |
|---|---|
| Local SQLite + Drizzle | ✅ done — see Foundation above. Sessions persist, and the sync queue now drains (D-33) |
| Cognitive games | 🟡 three games (Matching pairs, Find what is missing, People and places you know), four rungs each, no longer fixed — the opening board and the one offered next both come from the engine (D-26). Every board is measured (D-22) and the row is stored (D-24). The rest of the deliverable is more games, not more plumbing |
| Adaptive difficulty engine | 🟡 `lib/adaptive.ts` — pure, rule-based, reads this reader's own recent rounds and returns a rung plus a reason code (D-26). Wired into **both** games at both ends: the opening board and the offer after a finished one, with the reason said in four languages. Each game's history is read narrowed to its own `gameId`, so the two ladders never see each other (D-30). **Missing:** there are still no tests |
| Reminders (medicine / hydration / activity / appointments) | 🟡 definitions, a day's occurrences and adherence events all work on-device and are wired to Today (D-25), a **caregiver can add, edit and retire them** from the API and have the phone take the change (D-34), and a reminder the reader adds on the phone now **syncs up to the dashboard** (D-36). **Missing:** `expo-notifications`, so nothing fires when the app is closed and `reminder.notification_ids` stays `[]`; no way to edit or delete a reminder *on the phone* once added — the device may create one and only create one. The days mask, and a single date instead of one, are now the reader's to choose (D-42, D-43) |
| Voice prompts (TTS) | `expo-speech` not installed |
| Sync queue + upload | 🟡 **works end to end, both ways** — up through `src/db/queue.ts` + `src/lib/sync.ts` against `POST /sync/*` (D-33), down through `GET /sync/pull` for caregiver reminders and post-reinstall history (D-34). **Missing:** people and memories still do not come down; and there is still no connectivity trigger — draining happens on app open and on return to the foreground, not when the radio comes back |

---

## `apps/api` — backend 🟡

| Item | State |
|---|---|
| FastAPI app, uvicorn on `:8080` | ✅ |
| `/health` + `/auth/health`, `/users/health`, `/care/health`, `/dashboard/health`, `/sync/health` | ✅ — health checks |
| ruff config, feature-folder layout | ✅ |
| Settings from env / `.env` | ✅ `src/core/config.py`, pydantic-settings; `.env.example` is the template |
| Clerk token verification | ✅ `src/features/auth/service.py` — `authenticate`, `require_auth`, `require_caregiver`, `require_roles`, `granted_roles` |
| Route guards | ✅ `@auth_required` / `@caregiver_required` in `decorators.py`; `requires_auth` / `requires_caregiver` / `optional_auth` in `dependencies.py` |
| Role self-enrolment | ✅ `POST /auth/caregiver-role` and `POST /auth/patient-role` — a signed-in Clerk user with **no** role yet claims one. Both go through `self_enroll()`, which is idempotent and refuses an account that already holds a different role, so neither route can widen access. `PATIENT_ROLE` joins `CAREGIVER_ROLE` in settings. Called by the dashboard's `/welcome` page after sign-up and by the phone's `useRoleEnrolment()` on first session — D-28 |
| Clerk user profile resolution | ✅ `src/core/clerk.py` resolves names, email, avatars from Clerk Backend API |
| `GET /users/me` | ✅ `@auth_required`; returns Clerk id, granted roles, `is_caregiver`, the caller's own `smaran_id` from `roles` (null until they have a row), and linked `patient` row |
| Care links (`/care`) | ✅ `src/features/care/` — `GET`/`POST /care/link` for the patient's phone (where my link stands; ask the caregiver holding this Smaran id to look after me, landing as `pending`), `GET /care/requests` and `POST /care/requests/{link_id}` for the caregiver (who is waiting; accept or turn them down). `POST /care/link` is idempotent, refuses a caregiver account, and is where a self-signed-up reader first gets a `patients` row — which is what stops `/sync/*` 409ing forever. **`features/dashboard/service.py` now filters every caregiver read on `status = 'active'`** (six queries), so a `pending` row grants nothing. Verified against a throwaway Postgres: the unknown number, the idempotent second ask, pending granting nothing, a stranger's approval refused, approval, revocation and the ask after it. `GET /care/link` also returns the caregiver's name and phone from Clerk, on an `active` link only — the Help screen calls it. D-38, D-49 |
| Dashboard API for Caregiver Web PWA | ✅ Full suite under `/dashboard`: summary stats, patient CRUD, memory subjects CRUD, progress/session summaries, trend rollups, casual play logs, activity feed, notifications & baseline attention flags. Now fully unified with synced `SessionEvent` (`session_events` table) records from patient devices. |
| SQLAlchemy models | ✅ `src/features/database/models.py` — `Role`, `Patient`, `PatientCaregiver`, `MemorySubject`, `MemoryAsset`, `GameSession`, `QuestionEvent`, `CasualPlayLog` |
| Memory media store | ✅ `memory_assets` + `core/storage.py` + three routes under `/dashboard/patients/{id}/memories`: `POST /assets` uploads a picture and writes it to the bucket in one request, `GET /assets` lists with a signed `view_url`, `DELETE /assets/{id}` soft-deletes. `list_memory_subjects` resolves `photo_url` from a subject's newest ready asset. The dashboard's Add a Memory Subject form uploads for real — it used to inline the picture as a base64 data URL into `memory_subjects.photo_url`. Migration `0003` creates the table. The provider hosting the bucket signs a GET or a HEAD but never a PUT, so the picture goes to the API rather than being PUT to the bucket directly by the browser — the presign/confirm two-step and its CORS-specific error handling (D-39, D-40) are gone, replaced by one synchronous upload (D-42). When the bucket has `S3_MEMORIES_PUBLIC_BASE_URL` configured, a successful upload also
writes that permanent URL onto `memory_subjects.photo_url` directly — the column is no
longer always `null` in a deployment with a public bucket, though `_attach_subject_photos`
still resolves it fresh on every read regardless, for rows uploaded before a public base
existed (D-45). **The phone's down-sync is still not built** — D-32, D-42, D-45 |
| Migrations | ⬜ Alembic is a dependency but there is no `alembic/`; `init_db()` calls `create_all` on startup |
| SQLAlchemy models | ✅ `src/features/database/models.py` — the dashboard's own tables, **plus a server table for every device table that crosses the sync boundary**: `devices`, `session_events`, `reminders`, `reminder_events`, `people`, `memory_items`, and `enrolled_at`/`enrolled_by` on `patients`. `roles.smaran_id` is the nine-digit shareable id (sequence from 100,000,000) and `patient_caregivers.status` is the `pending`/`active`/`revoked` link state it feeds — schema (D-37); `/care` now reads and writes both (D-38). Nothing writes them yet; this is the schema `/sync/*` is owed. **`session_events` is the server's copy of the device's `game_session` — one row per round — and the dashboard now reads it for all live progress & analytics.** D-32 |
| Migrations | ✅ `apps/api/alembic/`, two revisions (`0001_baseline`, `0002_smaran_id_and_caregiver_status`), `task db:migrate`. `init_db()` no longer calls `create_all` — it checks the database is reachable and migrated, and prints the command if it is not. **The earlier note here was wrong**: `create_all` *does* create missing tables on an existing database (`checkfirst=True`); what it never does is add a column to a table that already exists, which is why deployed databases had the synced tables but not `patients.enrolled_at`/`enrolled_by`, and failed every sync call. `0001` is idempotent and reconciles all three states that exist in the wild; `0002` is an ordinary migration on top of it, adding `roles.smaran_id` and `patient_caregivers.status` and backfilling both before their constraints go on. D-35, D-37 |
| TimescaleDB hypertable + continuous aggregates | ⬜ |
| Sync ingest (`POST /sync/sessions`, `POST /sync/reminder-events`) | ✅ `src/features/sync/` — authenticated, idempotent on `(device_id, seq)`, one insert per row inside its own savepoint so a bad row is named in `rejected` and the rest of the batch still lands. Registers the device on its first call; 409 if nobody has enrolled it against a patient yet, 403 if it belongs to another one. Verified against a throwaway Postgres: duplicate batches, partial retries, seq collisions, one bad row among good ones, and a device reused by a second account. D-33 |
| Reminder up-sync (`POST /sync/reminders`) | ✅ creations only, `ON CONFLICT DO NOTHING` so a stale device retry can never revert a caregiver's edit — verified. `kind` and `schedule` validated; copy deliberately uncapped. D-36 |
| Down-sync (`GET /sync/pull?since=&restore=`) | 🟡 **built for reminders, memory subjects and history** — changed reminder definitions since a server-issued watermark, retirements included as `deleted: true` rather than by absence, plus this patient's last 200 rounds across every device they have used when `restore=true`. Verified against a throwaway Postgres: first pull, quiet pull, an edit and a retirement, the caregiver's own list hiding the retired row, a two-device history restore in order, and an unlinked caregiver refused. `subjects` carries the complete active set of `memory_subjects` on every pull rather than a delta — the table has no `updated_at` and is hard-deleted, so there is nothing a watermark could compare and no tombstone a removal could arrive as — each paired with its newest ready asset as a fetchable `photo_url` and a stable `photo_key`. **Missing:** `people` and `memory_items` (nothing draws them yet). D-34, D-45 |
| Caregiver reminder CRUD | ✅ `GET`/`POST /dashboard/patients/{id}/reminders`, `PATCH`/`DELETE .../{reminder_id}`. Delete is **soft** — a hard one is invisible to a watermark and the phone would show the reminder forever. `kind` and the `HH:MM\|1111111` schedule are validated at the door against exactly what the device can draw and parse. D-34 |
| AI Patient Insights | ✅ `POST /dashboard/patients/{id}/ai-insights` powered by Google Gemini Flash with personal-baseline clinical framing and automatic deterministic fallback. Telemetry aggregates 30-day cognitive performance, circadian reminder adherence, and engagement metrics into actionable caregiver observations and suggestions. |
| Caregiver reminder CRUD | ✅ `GET`/`POST /dashboard/patients/{id}/reminders`, `PATCH`/`DELETE .../{reminder_id}`. Delete is **soft** — a hard one is invisible to a watermark and the phone would show the reminder forever. `kind` and the schedule — `HH:MM\|1111111` or the one-off `HH:MM@YYYY-MM-DD` (D-43) — are validated at the door against exactly what the device can draw and parse. D-34 |

The Caregiver Web Dashboard backend is fully built, typed, linted, and reflected in the OpenAPI contract.

---

## `apps/web` — caregiver dashboard 🟡

Real UI across a dashboard, patients, memories, activity, notifications and settings.
Tailwind v4, Recharts and framer-motion are in.

| Item | State |
|---|---|
| Auth (Clerk) | ✅ `ClerkProvider` in the root layout, `proxy.ts` protecting every non-public route, `<SignIn>`/`<SignUp>` at `/login` and `/signup`, working sign-out in Settings. A new sign-up is forced through `/welcome`, which claims the caregiver role from the API before the dashboard is asked for — D-28 |
| API client | ✅ `lib/api.ts` (transport) + `lib/api-server.ts` `api()` + `hooks/use-api.ts` `useApi()` — D-27 |
| Screens fed by the API | ✅ Dashboard, Patients, Patient Detail (Overview, Memory Subjects, Reminders tab, Progress, Casual Play), Patient Edit Modal, Add Memory flow, Add Reminder Modal / Reminders Manager, and Activity are fully wired to live API endpoints (`/dashboard/summary`, `/dashboard/patients/*`, `/dashboard/activity`). Memory Subjects: Edit and Remove — `MemorySubjectCard`'s two buttons, previously decorative — now call `PATCH`/`DELETE .../memories/{id}`; Edit can also replace the photo, through the same upload endpoint the Add flow uses. `PatientMemoriesTab` + `usePatientMemories` (`lib/api/`) took the memories tab client-side, mirroring the pattern `PatientRemindersTab` + `usePatientReminders` already established for the Reminders tab; the Overview tab's count still comes from the server-rendered fetch in `page.tsx`, so that one stays. |
| Screens fed by the API | ✅ Dashboard, Patients, Patient Detail (Overview, Memory Subjects, Reminders tab, Progress, Casual Play), Patient Edit Modal, Add Memory flow, Add Reminder Modal / Reminders Manager, and Activity are fully wired to live API endpoints (`/dashboard/summary`, `/dashboard/patients/*`, `/dashboard/activity`). `ReminderList` and `ReminderForm` read and write both schedule shapes — weekly, and the one-off `HH:MM@YYYY-MM-DD` a phone can now send up (D-43). |
| Identity on screen | 🟡 the header shows the real Clerk user; Settings still renders the mock caregiver |
| Data fetching/caching | ⬜ TanStack Query not installed |
| Landing page APK link | ✅ `lib/github.ts` `getLatestApkDownloadUrl()` (server-only, hourly-revalidated `fetch`) resolves the `.apk` asset off the newest non-draft, non-prerelease GitHub release; `app/page.tsx` is now a server component that fetches it and hands it to `components/landing/LandingPage.tsx` (the old page body, unchanged otherwise). Falls back to the repo's releases page if GitHub is unreachable or no release has an APK yet — no more hand-pasted download URL to update per release. |

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
| Tests | ⬜ none, anywhere. The sync and migration work was verified with throwaway scripts against a Docker Postgres, and `lib/version.ts` the same way against the live releases API; none of it is committed as a suite, and that is the gap |
| CI | ⬜ none |
| Root `README.md` | ✅ overview, logo, Taskfile quick reference, app/web workflow, docs links, blank Credits. Git guidelines moved to `docs/git_guidelines.md`; API endpoints documented in `docs/api-endpoints.md` |

---

## Next — ordered by what unblocks the most

*Superseded until 2026-09-03 by `prototype-path.md`. Resume here afterwards.*

1. ~~**Local persistence** (`expo-sqlite` + Drizzle)~~ — done 2026-09-01, D-24.
2. ~~**Persist the session rows.**~~ — done 2026-09-01. Neither caller needed editing, as
   D-22 intended.
3. ~~**Adaptive engine v1** as a pure module reading `recentSessions()`~~ — done 2026-09-01,
   D-26, and wired into both games at both ends (D-30). What is *not* done: no tests behind it,
   and the reason sentence is the only thing the reader ever sees of it, which is by design
   but has not been read aloud yet — that is the `expo-speech` pass.
4. **Reminders** — the store and the Today UI are done (D-25). What is left is
   `expo-notifications` for local scheduling with no server dependency, and a way to edit
   or remove a reminder that has been added.
5. ~~**API ingest**~~ — done 2026-09-01, D-33. `POST /sync/sessions` and
   `POST /sync/reminder-events` upsert on `(device_id, seq, ended_at)`. ~~Alembic~~ done
   too, D-35 — run `task db:migrate` against any existing database before the first sync.
6. ~~**Sync client**~~ — done 2026-09-01, D-33 (up) and D-34 (down: caregiver reminders and
   post-reinstall history). What is left: a connectivity trigger (needs `netinfo` or
   `expo-network`); `people`/`memory_items` coming down — the People tab was removed
   for Games (D-41), so that screen needs a home first, though photo caching is now
   solved (`lib/media-cache.ts`, D-45); and reminder definitions going **up**, so a reminder
   added on the phone is not invisible to the caregiver.
7. **Dashboard** — TanStack Query + Recharts against the aggregation endpoints, personal
   baseline only.
8. **TTS** — voice output, keyed the same way as the string catalogue so a prompt and its
   audio cannot drift. Strings are already externalised (D-12), which was the hard half.

## Open questions

- **Enrollment flow.** Clerk gives a sign-in; the PS wants a caregiver to enrol a device
  once and hand it over. That flow is undesigned. See `decisions.md` D-01.
- **Who reviews the Hindi, Bengali and Assamese translations**, and which language is
  fifth? (Answered for the first four — `decisions.md` D-12.)
- ~~**Do People/Memories sync down?**~~ Answered for memory subjects (D-45): they ride the
  same `/sync/pull` batch as reminders, as a full snapshot rather than a watermarked delta,
  and their photos are cached to the document directory by a stable object key. `people` and
  `memory_items` still take the same road when something draws them. What is left open on
  the server: `memory_subjects` has no `updated_at` and no soft delete, which is the only
  reason that stream cannot be incremental.
