# Prototype path — 2 days, one person

**As of 2026-09-01** · demo target **2026-09-03** · full deadline 2026-09-20 unchanged.

One person is building all of this, across three stacks. That single fact set the plan —
not the pillar list, not the rubric. There is no parallelism to spend, so the plan is a
straight line with hard timeboxes, and it is ordered by *what has no fallback if time runs
out* rather than by what is most important.

This file overrides `progress.md` §Next until the demo is done. Read `AGENTS.md` §2 first:
nothing here suspends the five rules, and every shortcut below is named as a shortcut.

---

## The budget, stated honestly

Two days solo is about **14 working hours**, not 16 and not 20 — context-switching between
Expo, FastAPI and Next.js costs real time, and a demo you have never rehearsed is a demo
that fails. The plan below is 13.5 hours with **no slack**. That is why every task has a
timebox and a stated fallback: when a box is blown, take the fallback and move on. Do not
finish a task past its box because it is nearly done. Nearly done is how the last task
never gets started.

---

## What the demo is

1. **The patient app in a judge's hands** — offline, four languages, a game that plays.
2. **Adaptive difficulty, visibly** — the game gets easier or harder from this patient's
   own history, and the judge can *see* that it did.
3. **The caregiver dashboard on a laptop beside it** — real charts off real endpoints.

**Ordered 1 → 2 → 3, and that is the build order too.** The reason is not importance — it
is that pillars 1 and 2 have no fallback, and pillar 3 does. `apps/web` is already ~2,600
lines of finished UI running on `lib/mock-data.ts`; if day 2 collapses entirely, the
dashboard still *demos* — it just isn't live, and you say so. Nothing in the patient app
has that property. So the mobile work goes first, while you are fresh, and the dashboard
takes whatever is left.

---

## Cut

Beyond the obvious cuts (sync, `/sync/sessions`, Alembic, Timescale, Drizzle, games 2 and
3, translation review, PWA, tests, CI), being solo cuts three more that a four-person plan
kept:

| Cut | Why |
|---|---|
| **Reminders** (`expo-notifications`) | 4 hours for a notification banner. It is rubric capability 5 and it hurts to drop, but it is not one of the three pillars and it is the single biggest block of time that isn't |
| **Activity feed and notifications pages** on web | They stay on `mock-data.ts`. Do not open them in the demo |
| **Memory-subject CRUD wiring** on web | Same — the UI exists, leave it on mock |

Also do not: refactor anything you touch, migrate a screen to Uniwind, tidy the
commented-out `headerAction` in `(tabs)/index.tsx`, or fix the `apps/packages/*` workspace
glob. All of it is correct work and all of it is free time you do not have.

---

## Day 1 — mobile only · ~7h

One stack, one editor, no context switches. This day delivers pillars 1 and 2 outright.

### 1 · Persist game sessions — **2h** ⏱

`expo-sqlite`, one `game_session` table shaped like `data-model.md` §1, hand-written SQL,
no ORM. Replace the array *inside* `src/lib/game-history.ts`: `remember()` becomes an
insert, `recentSessions()` a query ordered by `ended_at desc`. **No caller changes** — that
module was built as this exact seam, which is why this is 2 hours and not a day.

*Done when:* play three boards, force-quit, reopen, `recentSessions()` still returns three.
*Fallback at 2h:* a JSON blob through `expo-file-system` behind the identical two
functions. Nothing above `game-history.ts` can tell the difference, including the engine.

### 2 · Adaptive engine v1 — **2h** ⏱

`src/lib/adaptive.ts`. Pure, per `AGENTS.md` §6 — in: `SessionStats[]` for one game; out: a
difficulty rung and a plain-language reason. Rules only, no model, no I/O, no clock.
Compare the last run against **this reader's own** recent mean of accuracy, response time
and completion (`AGENTS.md` §2.4 — no population score anywhere, not even as a constant).

Keep the rules embarrassingly simple. Three branches is enough: comfortably above their own
recent average → up a rung; well below → down a rung; otherwise → hold. A judge cannot see
sophistication here, only behaviour.

*Done when:* three synthetic histories typed by hand return three different rungs.

### 3 · Wire it in and make it visible — **1.5h** ⏱

Matching pairs opens on the engine's rung instead of always `LEVELS[0]`. The win dialog's
next-board button names the next rung and gives the reason in one warm sentence — a new key
in all four catalogues (`AGENTS.md` §2.3: no English literal, no concatenated fragments).

**This half-hour of copy is pillar 2.** An engine that adapts silently scores zero in a
five-minute demo. If the box is blown, cut the engine's subtlety, never the sentence.

### 4 · Voice output — **1h** ⏱

`expo-speech` on **two** surfaces only: the Today greeting and the win-dialog summary.
Speak the same i18n keys the screen renders so audio and text cannot drift (`decisions.md`
D-12). A speaker control that is always available and never required.

Capability 3 is a hard requirement currently reading ⬜; one hour moves it to 🟡 honestly.
Do not attempt whole-screen narration, and do not touch voice input.

### 5 · Rehearse the mobile half — **0.5h** ⏱

On the real device, in airplane mode, twice. This is where you find that the fourth board
crashes, not in the room.

**End of day 1 you have a demo.** Everything after this is upside.

---

## Day 2 — API seed, then web · ~6.5h

### 6 · Seed script — **1.5h** ⏱

`apps/api/scripts/seed_demo.py`, plain SQLAlchemy inserts against the existing models. One
caregiver, two patients, ~30 days of sessions with a believable arc — one patient steady,
one drifting — so the trend chart and the attention flags both have something to say.

Two patients is the whole point: a single patient makes a chart, two make a story.

### 7 · Clerk on the web — **1.5h, hard stop** ⏱ ⚠

**This is the riskiest task in the plan and the only one that can sink day 2.** `apps/web`
has no Clerk today — `@clerk/nextjs` is not installed, there is no `.env`, and the login
and signup pages are mock. Every `/dashboard` endpoint is caregiver-guarded
(`features/auth/dependencies.py`), so without a token the dashboard reads nothing.

Install `@clerk/nextjs`, follow the App Router quickstart, fetch from **server components**
with `auth().getToken()`. Then grant your account the caregiver role through the existing
`POST /auth/caregiver-role`.

*Fallback at 90 minutes, no negotiation:* a **localhost-only** dev bearer token in
`.env.local`, read by the API client and sent as `Authorization: Bearer`. Never merged,
never deployed, and never an unauthenticated endpoint — `AGENTS.md` §2.5 holds regardless
of the clock. Add a `TODO` naming this file and move on.

### 8 · Web API client + the two pages that matter — **2.5h** ⏱

`apps/web/lib/api.ts` mirroring the mobile one. Then retire `mock-data.ts` from exactly two
places: **the dashboard summary** and **one patient's detail page**. Leave the patient list
on mock if it fights you; leave activity and notifications on mock regardless.

`lib/types.ts` is the shape both sides agree on — where it disagrees with the API's Pydantic
models, **fix the web side**. The OpenAPI schema is the contract (`AGENTS.md` §5).

### 9 · One real chart — **1h** ⏱

`SessionAccuracyChart` off `/patients/{id}/trends`. Every axis is this patient against their
own past: no cohort line, no target band, no "average user". If `ActivityBreakdown` comes
free, take it; if not, leave it.

*Done when:* the chart moves when the seed data changes.

---

## Before you sleep on day 2 — **1h**

- [ ] **Z1** Full rehearsal, end to end, tablet and laptop, twice.
- [ ] **Z2** Bring `progress.md` and `capabilities.md` back into line with the code. Both
      are already stale — they describe `apps/web` as unmodified `create-next-app` and
      capability 1 as having no code. The submission is judged partly on documentation and
      a knowledge base that lies about the build is worse than none. Half an hour.

---

## Tracker

- [x] 1 — SQLite session store behind `game-history.ts` · 2h
- [x] 2 — `adaptive.ts` v1, pure, rules · 2h
- [x] 3 — opening rung from the engine + the visible reason, four languages · 1.5h
- [ ] 4 — `expo-speech` on greeting and summary · 1h
- [ ] 5 — rehearse the mobile half on the device · 0.5h
- [ ] 6 — API seed script, two patients, 30 days · 1.5h
- [ ] 7 — Clerk on web (hard stop 1.5h → dev-token fallback) · 1.5h
- [ ] 8 — web API client; summary + patient detail off real endpoints · 2.5h
- [ ] 9 — trend chart on `/patients/{id}/trends` · 1h
- [ ] Z1 — full rehearsal, twice · 0.5h
- [ ] Z2 — `progress.md` + `capabilities.md` truthful again · 0.5h

---

## Demo script — five minutes

1. **Hand over the tablet, in airplane mode.** Today screen, warm greeting, the date. Tap
   the speaker — it reads aloud. Switch to Assamese — the whole app moves, still offline.
2. **Play matching pairs.** Small board, finish it, confetti, the summary. Play a second,
   quickly.
3. **The app offers a bigger board and says why.** ← pillar 2, the moment that matters.
   Say out loud: this compares them against *their own* last few rounds, never against
   other patients — there is no population norm for this cohort and inventing one would be
   dishonest.
4. **Force-quit, reopen, play again.** It still knows them. That is the local database, and
   that is offline-first being true rather than claimed.
5. **Turn to the laptop.** Dashboard summary, one patient, their trend over thirty days.
6. **Name the seam if asked:** the dashboard reads a seeded database; the sync client that
   would carry step 4's rows into step 5 is the next thing built, and the queue it drains is
   already designed (`api-contract.md`).

Never claim sync works. The gap is one endpoint; the lie is not worth it.

---

## If you fall behind

Drop in this order, and stop dropping the moment you are back on schedule:

1. **Task 9** — demo the dashboard summary alone, no chart.
2. **Task 8** — dashboard stays on `mock-data.ts`. Show it as finished UI against a built
   API and say plainly it is not yet wired. It still reads as real work, because it is.
3. **Tasks 6 and 7** — skip the web day entirely.
4. **Task 4** — voice.

**Never drop tasks 1, 2, 3 or 5.** A patient app that plays, adapts visibly, remembers
across launches and has been rehearsed is a complete demo on its own. Three half-wired
surfaces is not.
