# API contract

Base: `http://localhost:8080` in dev. FastAPI generates OpenAPI at `/docs` — **that is the
contract**; this file is the design intent and the queue of what to build.

---

## 1. What exists today

| Method | Path | Returns / Purpose |
|---|---|---|
| GET | `/health` | `{"status": "ok"}` |
| GET | `/auth/health` | `{"feature": "auth", "status": "ok"}` |
| POST | `/auth/caregiver-role` | `RoleGrantOut` — grant caregiver role to signed-in user |
| GET | `/users/health` | `{"feature": "user", "status": "ok"}` |
| GET | `/users/me` | `UserProfile` — the signed-in caller. **Authenticated** (`@auth_required`) |
| GET | `/dashboard/health` | `{"feature": "dashboard", "status": "ok"}` |
| GET | `/dashboard/summary` | `DashboardSummaryOut` — high-level stats cards & patient overviews |
| GET | `/dashboard/patients` | `list[PatientCardOut]` — patients linked to current caregiver |
| POST | `/dashboard/patients` | `PatientCardOut` — register and link a new patient |
| GET | `/dashboard/patients/{id}` | `PatientDetailOut` — patient profile and summary stats |
| PATCH | `/dashboard/patients/{id}` | `PatientDetailOut` — update patient metadata or relationship |
| DELETE | `/dashboard/patients/{id}` | `{"status": "deleted"}` — remove patient linkage |
| GET | `/dashboard/patients/{id}/memories` | `list[MemorySubjectOut]` — list memory subjects |
| POST | `/dashboard/patients/{id}/memories` | `MemorySubjectOut` — add a person/place/object memory subject |
| PATCH | `/dashboard/patients/{id}/memories/{sid}` | `MemorySubjectOut` — update memory subject |
| DELETE | `/dashboard/patients/{id}/memories/{sid}` | `{"status": "deleted"}` — remove memory subject |
| GET | `/dashboard/patients/{id}/progress` | `PatientProgressOut` — session summaries and activity breakdown |
| GET | `/dashboard/patients/{id}/trends` | `list[TrendPointOut]` — daily rolled-up accuracy/response times |
| GET | `/dashboard/patients/{id}/casual-play` | `list[CasualPlayOut]` — non-scored casual game sessions |
| POST | `/dashboard/patients/{id}/casual-play` | `CasualPlayOut` — record casual play |
| GET | `/dashboard/activity` | `ActivityFeedOut` — question attempts feed |
| GET | `/dashboard/notifications` | `list[NotificationOut]` — activity completions and alerts |
| GET | `/dashboard/patients/{id}/flags` | `list[AttentionFlagOut]` — personal baseline deviation flags |
| GET | `/sync/health` | `{"feature": "sync", "status": "ok"}` |
| POST | `/sync/sessions` | `SyncAckOut` — ingest a batch of game rounds. **Authenticated** |
| POST | `/sync/reminder-events` | `SyncAckOut` — ingest a batch of reminder outcomes. **Authenticated** |
| POST | `/sync/reminders` | `SyncAckOut` — ingest reminders the reader created on the phone. **Authenticated** |
| GET | `/sync/pull` | `PullOut` — changed reminders, and history for a reinstalled phone. **Authenticated** |
| GET | `/dashboard/patients/{id}/reminders` | `list[ReminderOut]` — reminders in force for a patient |
| POST | `/dashboard/patients/{id}/reminders` | `ReminderOut` — set up a reminder |
| PATCH | `/dashboard/patients/{id}/reminders/{rid}` | `ReminderOut` — change one, or switch it off |
| DELETE | `/dashboard/patients/{id}/reminders/{rid}` | `{"status": "deleted"}` — retire one (soft) |

`GET /users/me` is the only real route; the rest are health probes. It answers for both
audiences — a patient gets their `patients` row, a caregiver gets `patient: null` and a
`caregiver` role — so neither client has to know which shape to expect before it asks.

```jsonc
// GET /users/me   Authorization: Bearer <clerk session jwt>
{
  "user_id": "user_2ab…",        // Clerk's id, the value every person-shaped column holds
  "roles": ["caregiver"],        // from the `roles` table only, never from a token claim (D-14)
  "is_caregiver": true,
  "smaran_id": 100000042,        // the nine-digit shareable id from `roles` (D-37); null until enrolled
  "patient": {                   // null for a caregiver, and for a device not yet enrolled
    "id": "b91bf55d-…",
    "dob": "1948-03-09",
    "address": "Shillong, Meghalaya",
    "contact_number": "+91 90000 00000",
    "preferred_language": "as"
  }
}
```

**No name, photo or email.** Those live in Clerk and the clients already hold them without
asking us (D-13, D-20). What this returns is what only the server knows.

**The patient app must not put this on a screen's path.** It is a sign-in / sync-time read
into local storage; a device that has never reached it still has to open, play and remind
normally (§2.1).

---

## 2. Proposed — mostly **NOT BUILT**

Grouped by the feature folder they belong in. Everything here is unbuilt **except the two
`/sync` ingest routes**, which shipped on 2026-09-01 (D-33) and are kept in this section
because the contract notes under them are the design intent for the whole feature, down-sync
included. Their state is in the table.

### `features/auth`

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/enroll` | Caregiver provisions a patient device. Returns patient id + device credential. The one flow that needs connectivity |
| POST | `/auth/device/token` | Refresh a device credential |
| GET | `/auth/me` | Resolve the caller — caregiver or device |

Identity has to line up with Clerk on mobile (`decisions.md` D-01); how is open work.

### `features/user`

| Method | Path | Purpose |
|---|---|---|
| PATCH | `/users/me` | Update name/photo — **caregiver only**, the patient app is read-only here (`account/profile.tsx` TODO) |
| GET | `/users/{patient_id}/people` | The circle — backs the People tab |
| GET | `/users/{patient_id}/memories` | Shared photos and stories — backs Memories |
| GET | `/users/{patient_id}/reminders` | Server-authoritative reminder definitions |

### `features/sync`

| Method | Path | Purpose | State |
|---|---|---|---|
| POST | `/sync/sessions` | Ingest a batch of game sessions | ✅ D-33 |
| POST | `/sync/reminder-events` | Ingest a batch of reminder outcomes | ✅ D-33 |
| POST | `/sync/reminders` | Ingest reminders created on the phone — **creations only** | ✅ D-36 |
| GET | `/sync/pull?since=&restore=` | Down-sync: reminders changed since a watermark, plus history on request | 🟡 D-34 — reminders and sessions built; people and memories not |

**Ingest contract.** Both POSTs take a batch and are idempotent — upsert on
`(device_id, seq)` (`decisions.md` D-09). A retried or duplicated batch is a no-op.

```jsonc
// POST /sync/sessions
{
  "device_id": "dev_01H…",
  "sessions": [
    {
      "id": "ses_01H…",
      "seq": 412,
      "game_id": "pattern-match",
      "difficulty": 3,
      "started_at": "2026-08-29T09:14:02Z",
      "ended_at":   "2026-08-29T09:17:40Z",
      "accuracy": 0.82,
      "avg_response_ms": 2140,
      "attempts": 22,
      "correct": 18,
      "total": 22,
      "consistency": 0.71,
      "completed": true
    }
  ]
}
```

```jsonc
// 200 — every row in the batch is accounted for: accepted + duplicates + rejected == n
{
  "accepted": 1,
  "duplicates": 0,
  "rejected": [],          // [{ "id": "…", "reason": "plain language, about the row" }]
  "last_seq": 412          // highest seq held for this device, across BOTH streams
}
```

Rules, all of them built (D-33): accept a **partial** batch rather than rejecting the whole
thing on one bad row, and name the rejects. Never return an error that would make a device
drop unsynced data. A `duplicates` count is a success, not a warning — it is what a retry is
supposed to produce.

**As built**, in addition to the sketch above: the batch envelope also carries an optional
`app_version`; a batch is capped at 200 rows; the device registers itself on its first call,
so nothing provisions a `devices` row by hand. The failure statuses are load-bearing and the
client branches on them — **409** nobody has enrolled this device against a patient yet
(a state enrollment fixes, so the queue waits), **403** the device belongs to a different
patient, **422** the phone is running a build this server cannot parse. Only 422 is ever
given up on, and only after five attempts.

`last_seq` is **diagnostic**. The client does not advance on it: the two streams share one
`seq` counter, so a batch of sessions says nothing about a reminder event numbered between
them. What is still owed is whatever is left in the device's `sync_queue`, and
`device.last_synced_seq` is set from that — the lowest still-queued `seq` minus one.

**Pull contract** (built, D-34). One round trip, because a phone gets one unreliable moment
of connectivity.

```jsonc
// GET /sync/pull?since=2026-08-29T09:00:00Z&restore=false
{
  "synced_at": "2026-09-01T11:02:41Z",   // the server's clock; send it back as `since`
  "reminders": [
    { "id": "…", "kind": "medicine", "title": "…", "detail": null,
      "schedule": "21:00|1111111", "active": true, "deleted": false }
  ],
  "sessions": [],            // only when `restore=true`
  "sessions_truncated": false
}
```

Rules:

- **Reminders are server-authoritative** — the device replaces what it holds, no merge
  (`data-model.md` §3 rule 2). Only ids named in the response are written or removed, so a
  reminder the reader added on the phone is never collateral. The phone may **create** a
  reminder (`POST /sync/reminders`, D-36) and never change one: ingest is
  `ON CONFLICT DO NOTHING`, so a stale queued batch cannot revert a caregiver's edit.
- **A retirement arrives as `deleted: true`, never as an absence.** A hard delete is invisible
  to a watermark and a phone that was switched off would show the reminder forever.
- **`since` is the server's own `synced_at`, echoed back** — never the device's clock, which
  can be wrong by hours.
- **`restore=true` is the reinstall case**, asked once (when the device has no `last_pulled_at`).
  It returns up to 200 rounds across every device the patient has used, newest first, **without
  `seq`** — they are not this device's facts and are never sent back up.

### `features/dashboard`

Caregiver-facing, authenticated, always scoped to an enrolled patient.

| Method | Path | Returns |
|---|---|---|
| GET | `/dashboard/patients` | Patients this caregiver is enrolled on |
| GET | `/dashboard/patients/{id}/summary` | Today at a glance: last active, sessions, adherence, open flags |
| GET | `/dashboard/patients/{id}/trends?metric=&from=&to=` | Time series from the continuous aggregate — accuracy, response time, consistency |
| GET | `/dashboard/patients/{id}/baseline` | The patient's own trailing window, so the client can draw the band |
| GET | `/dashboard/patients/{id}/adherence?from=&to=` | Reminder outcomes over time |
| GET | `/dashboard/patients/{id}/flags` | Sustained deviations from that patient's own baseline |

**Every trend response carries the patient's own baseline band, never a cohort comparison**
(`decisions.md` D-08). Flags are advisory observations, worded for a family member — not
diagnoses.

The patient app also needs `GET /dashboard` for the Today screen's day plan
(`(tabs)/index.tsx` TODO) — and that call must be **optional**: Today has to render from
local data with the radio off.

---

## 3. Conventions

- Paths are lower-kebab, plural collections. Prefixes and tags live in `main.py`; routers
  carry no prefix of their own.
- Every request and response body is a Pydantic model in the feature's `schemas.py`. No bare
  dicts on new endpoints — the OpenAPI schema is what the clients are generated against.
- Timestamps are ISO 8601 UTC with `Z` on the wire; epoch ms on the device
  (`data-model.md` §3).
- Errors use FastAPI's `HTTPException` with a plain-language `detail`. Nothing patient-
  identifying in an error body, a URL, or a log line (`AGENTS.md` §2.5).
- Every caregiver-facing route is authenticated and scoped by enrollment. There is no such
  thing as an unauthenticated patient-data endpoint.
- Pagination on collections: `?limit=&cursor=`, cursor opaque.
