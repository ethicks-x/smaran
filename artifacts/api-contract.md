# API contract

Base: `http://localhost:8080` in dev. FastAPI generates OpenAPI at `/docs` — **that is the
contract**; this file is the design intent and the queue of what to build.

---

## 1. What exists today

| Method | Path | Returns |
|---|---|---|
| GET | `/health` | `{"status": "ok"}` |
| GET | `/auth/health` | `{"feature": "auth", "status": "ok"}` |
| GET | `/users/health` | `{"feature": "user", "status": "ok"}` |
| GET | `/dashboard/health` | `{"feature": "dashboard", "status": "ok"}` |
| GET | `/users/me` | `UserProfile` — the signed-in caller. **Authenticated** (`@auth_required`) |

`GET /users/me` is the only real route; the rest are health probes. It answers for both
audiences — a patient gets their `patients` row, a caregiver gets `patient: null` and a
`caregiver` role — so neither client has to know which shape to expect before it asks.

```jsonc
// GET /users/me   Authorization: Bearer <clerk session jwt>
{
  "user_id": "user_2ab…",        // Clerk's id, the value every person-shaped column holds
  "roles": ["caregiver"],        // from the `roles` table only, never from a token claim (D-14)
  "is_caregiver": true,
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

## 2. Proposed — **NOT BUILT**

Grouped by the feature folder they belong in.

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

### `features/sync`  *(new folder)*

| Method | Path | Purpose |
|---|---|---|
| POST | `/sync/sessions` | Ingest a batch of game sessions |
| POST | `/sync/reminder-events` | Ingest a batch of reminder outcomes |
| GET | `/sync/pull?since=` | Down-sync: people, memories, reminders changed since a watermark |

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
// 200 — always report the watermark so the client can advance safely
{ "accepted": 1, "duplicates": 0, "last_seq": 412 }
```

Rules: accept a **partial** batch rather than rejecting the whole thing on one bad row, and
name the rejects. The client advances its watermark only on this response. Never return an
error that would make a device drop unsynced data.

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
