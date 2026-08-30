# Architecture

How Smaran is put together. Sections marked **PLANNED** describe agreed design that has no
code yet — check `progress.md` before calling into anything from those sections.

---

## 1. Shape

```
┌──────────────────────── device, no network required ────────────────────────┐
│                                                                             │
│   Patient app (Expo / React Native)                                         │
│                                                                             │
│   games ──▶ session events ──▶ local SQLite ──▶ sync queue                  │
│     ▲                              │                    │                   │
│     └──── difficulty ◀── adaptive engine (pure, on-device)                  │
│                                    │                    │                   │
│   reminders ◀── local notifications                     │                   │
│   voice prompts ◀── on-device TTS                       │                   │
└─────────────────────────────────────────────────────────┼───────────────────┘
                                                          │
                                       when connectivity returns, on app open
                                       or user action — never a background
                                       task we depend on
                                                          │
                                                          ▼
┌───────────────────────────── server ────────────────────────────────────────┐
│   FastAPI  ──▶ dedupe by (device_id, seq) ──▶ PostgreSQL + TimescaleDB      │
│      │                                              │                       │
│      └──▶ aggregation endpoints ◀── continuous aggregates                   │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   ▼
                     Caregiver dashboard (Next.js PWA)
                     trends · adherence · attention flags
                     caches last sync — works offline too
```

**The boundary is the whole design.** Everything left of the sync arrow runs with the radio
off. A network call introduced upstream of sync is a regression, not a feature. See
`AGENTS.md` §2.1.

---

## 2. Stack

### `apps/mobile` — patient app · **partially built**

| Concern | Choice | Status |
|---|---|---|
| Framework | Expo SDK 57, React Native 0.86, React 19 | built |
| Language | TypeScript, `strict` | built |
| Routing | `expo-router` v57, typed routes, React Compiler on | built |
| Native UI | `@expo/ui` (SwiftUI / Jetpack Compose) via `NativeHost` | built |
| Theme | hand-rolled tokens in `src/theme` | built |
| Auth | **Clerk** (`@clerk/expo`, hosted auth) | built — see `decisions.md` D-01 |
| Secure storage | `expo-secure-store` (Clerk token cache) | built |
| Local DB | `expo-sqlite` + **Drizzle ORM** | **PLANNED — not installed** |
| Notifications | `expo-notifications`, local only | **PLANNED** |
| Voice | on-device TTS (`expo-speech`) | **PLANNED** |
| i18n | `i18next` + `react-i18next` + `expo-localization`, all catalogues bundled | built — English, Hindi, Bengali, Assamese |
| Lint/format | Biome 2.5 | built |

### `apps/web` — caregiver dashboard · **scaffold only**

| Concern | Choice | Status |
|---|---|---|
| Framework | Next.js 16, App Router | scaffold |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | wired, unused |
| Data | TanStack Query | **PLANNED — not installed** |
| Charts | Recharts | **PLANNED — not installed** |
| Auth | shared with the API | **PLANNED** |
| PWA / offline cache | service worker, cache last sync | **PLANNED** |
| Lint/format | Biome 2.4 | built |

### `apps/api` — backend · **skeleton only**

| Concern | Choice | Status |
|---|---|---|
| Framework | FastAPI + Pydantic v2, Python 3.13 | skeleton |
| Server | uvicorn, `:8080`, reload in dev | built |
| ORM | SQLAlchemy | **PLANNED — not installed** |
| Migrations | Alembic | **PLANNED — not installed** |
| Relational store | PostgreSQL | **PLANNED** |
| Time-series | TimescaleDB hypertable + continuous aggregates | **PLANNED** |
| Contract | OpenAPI, auto-generated | free with FastAPI |
| Lint/format | ruff, 100 cols | built |

Deviating from this table needs a reason recorded in `decisions.md`.

---

## 3. The offline / sync boundary

Use this to place a change.

**On-device, must work offline:**
game rendering · session capture · difficulty adjustment · local persistence · reminder
scheduling and firing · voice prompts · every patient-facing screen · sign-in *state*
(the session is already cached; re-authentication is not an offline requirement because
it must never be asked for).

**Server-side, may assume network:**
receiving synced batches · deduplication · aggregation and trend computation · attention
flags · caregiver auth · enrollment · everything the dashboard reads.

**On the line:** initial enrollment (a caregiver does it once, with connectivity, before
the device is handed over) and content the family pushes down (People, Memories) — these
sync down opportunistically and must render from cache when the radio is off.

---

## 4. Patient app structure

```
apps/mobile/src/
├── app/                       expo-router routes
│   ├── _layout.tsx            root gate: splash hold, providers, Stack.Protected guards
│   ├── landing.tsx            signed-out: swipeable intro + sign in
│   ├── recall.tsx             signed-in, once per launch: type your own name
│   ├── +native-intent.ts      catches the smaran:// deep link from hosted auth
│   ├── +not-found.tsx
│   ├── (tabs)/                Today · People · Memories · Help · Settings
│   └── account/               pushed screens: profile, appearance, notifications
├── components/
│   ├── ui/                    the design system — compose from here first
│   └── landing/               screens for the intro pager
├── hooks/                     use-theme, use-appearance, use-color-scheme, use-recall
└── theme/                     colors · typography · layout · appearance tokens
```

### The root gate

`_layout.tsx` holds the splash screen until *both* Clerk and the stored appearance
preferences have loaded, so no screen ever paints half-authenticated or in the wrong theme.
It then routes by guard:

| Guard | Destination |
|---|---|
| `!isSignedIn` | `landing` |
| `isSignedIn && !isRecalled` | `recall` |
| `isSignedIn && isRecalled` | `(tabs)`, `account` |

It also hands React Navigation our tokens and paints the window background, so the frame
between screen transitions is our canvas rather than white.

### Theme

One dial governs the whole UI: `UIScale` in `theme/layout.ts` (currently `0.75`). Spacing,
radii, touch targets and type sizes all run through `scale()`, so the app can be tightened
or loosened from one constant. **That only holds if nothing hardcodes a pixel value.**

Touch targets are clamped so scaling can never take them below the 48pt platform floor.
Type floors at 18pt before scaling. The palette clears WCAG AAA (7:1) on its documented
pairings — which a raw hex literal in a component silently opts out of.

The reader controls two things, and deliberately only two: theme mode
(system / light / dark) and text size (normal / large / largest, as multipliers on top of
the OS setting).

---

## 5. Sync protocol — **PLANNED**

1. A finished session is written to local SQLite **and** appended to a sync queue in the
   same transaction. The write never awaits the network.
2. The queue is drained on app open, on connectivity regained, and on explicit user action.
   Never on an assumed background task (`AGENTS.md` §2.2).
3. Each event carries `(device_id, seq)` — a monotonic per-device sequence. The server
   upserts on that pair, so a retried or duplicated batch is idempotent.
4. The client advances its watermark only on server acknowledgement. A partial batch is
   safe to resend in full.
5. Conflict resolution: session events are immutable facts, so there are no conflicts.
   Mutable records (profile, reminder settings) are server-authoritative — the device takes
   what it is given.

---

## 6. Adaptive engine — **PLANNED**

```
adjustDifficulty(recentSessions: SessionStats[], current: Difficulty) → Difficulty
```

Pure. No I/O, no storage handle, no clock, no ambient randomness. Everything it needs comes
in as an argument, so v1's rules can be replaced by a model without touching game or
storage code.

v1 is rule-based, on-device, and reads accuracy, response time, attempts, and consistency
against **this patient's own recent history** — never a cross-patient norm
(`AGENTS.md` §2.4). The rule engine is a deliberate choice, not a shortcut: there is no
patient data to train on yet, and it must run with the network off.

---

## 7. Product surface beyond the problem statement

The mobile app has grown a companion framing that `plan.md` does not describe. It is
intentional and it maps back to the rubric:

| Tab | What it is | Rubric link |
|---|---|---|
| **Today** | The day's plan — the answer to "what am I meant to be doing?" | daily routine recall, reminders |
| **People** | Familiar faces: who they are, the relationship, how to reach them | object/person recognition, isolation |
| **Memories** | Photos, voice notes and stories the family shared | emotional engagement |
| **Help** | One unmistakable way to reach a person, above the fold | caregiver alerting |
| **Settings** | Account, appearance, notifications | accessible UI |

Cognitive games — the rubric's centrepiece — have no home in this navigation yet. Placing
them is an open design question; see `progress.md`.
