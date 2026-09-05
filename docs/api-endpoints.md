# API Endpoints

`apps/api` is a FastAPI service. It generates a live OpenAPI schema at `/docs`
(Swagger UI) and `/openapi.json` when the server is running — **that is the
authoritative contract**. This file is a hand-maintained overview of what
exists, kept close to the router code in `apps/api/src/features/*/router.py`.

Base URL in development: `http://localhost:8080`.

For the deeper design intent behind sync, quiz generation, and the
not-yet-built routes, see `artifacts/api-contract.md` in this repository.

---

## Conventions

- Every route except `/health` and the per-feature `/*/health` checks
  requires a Clerk session token: `Authorization: Bearer <clerk_session_jwt>`.
- **Authenticated** — any signed-in user. **Caregiver** — a signed-in user
  who holds the caregiver role (`@caregiver_required`), and only for
  patients they are actively linked to.
- Timestamps are ISO 8601 UTC on the wire.
- Errors are FastAPI `HTTPException`s with a plain-language `detail`. No
  patient-identifying data ever appears in an error body, a URL, or a log
  line.
- Request and response bodies are Pydantic models (`schemas.py` per
  feature) — no bare dicts.

---

## System

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Service liveness check |

Every feature router below also exposes its own `GET /<prefix>/health`
(e.g. `/auth/health`, `/sync/health`) returning `{"feature": "...", "status": "ok"}`.

---

## `/auth` — role enrolment

A signed-in Clerk account has no Smaran role until it claims one. Both
routes are idempotent and refuse to grant a role to an account that already
holds a different one.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/caregiver-role` | Authenticated | Grant the caregiver role to the signed-in user. Called once by the web dashboard, right after sign-up |
| POST | `/auth/patient-role` | Authenticated | Grant the patient role to the signed-in user. Called once by the phone, after its first session becomes active |

---

## `/users` — the signed-in caller

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/users/me` | Authenticated | Resolve the caller: Clerk id, granted roles, `smaran_id`, and their linked `patient` row (`null` for a caregiver) |

`GET /users/me` answers for both audiences from one shape, so neither
client has to know in advance which one it will get. On the patient app
this is a sign-in / sync-time read into local storage — never on a
screen's render path.

---

## `/care` — linking a patient to a caregiver

The mechanism behind the phone's Smaran-id setup screen and the
dashboard's incoming-request list. Patient routes need only a valid
session; caregiver routes need the caregiver role.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/care/link` | Authenticated | Where the signed-in patient's own link stands: `none`, `pending`, `active`, or `revoked` |
| POST | `/care/link` | Authenticated | Ask the caregiver holding a given nine-digit Smaran id to look after the signed-in patient. Idempotent — lands as `pending` |
| GET | `/care/requests` | Caregiver | Patients currently waiting on this caregiver to accept them |
| POST | `/care/requests/{link_id}` | Caregiver | Accept (`active`) or turn down (`revoked`) a pending request — the only route that actually grants a caregiver access to a patient |

---

## `/quiz` — recognition-game question generation

Optional by contract. The recognition game plays offline from whatever
questions are already stored on the device; this route is only what
writes a better set for next time.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/quiz/generate` | Authenticated (patient device) | Show this patient's own memory-subject photographs to Gemini and write back gentle recognition questions, keyed by subject + form + language so a repeat call replaces rather than duplicates |

---

## `/sync` — the offline device's only required contact with the server

The patient app never needs to reach these at a particular time — nothing
a reader sees waits on a network call. Both ingest routes are idempotent,
upserting on `(device_id, seq)`, so a retried batch is a no-op.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/sync/sessions` | Authenticated | Ingest a batch of finished game rounds (`game_session` rows) from one device |
| POST | `/sync/reminder-events` | Authenticated | Ingest a batch of reminder outcomes (done / missed) from one device |
| POST | `/sync/reminders` | Authenticated | Ingest reminders the reader created **on the phone** — creation only; the phone can never edit or retire one this way |
| GET | `/sync/pull?since=&restore=` | Authenticated | Down-sync: reminders changed since a server-issued watermark (retirements arrive as `deleted: true`), plus this patient's game history across every device when `restore=true` (the reinstall case) |

Failure statuses the client branches on for the two POST ingest routes:
**409** — the device has not been enrolled against a patient yet (the
queue waits for enrolment); **403** — the device belongs to a different
patient; **422** — the payload is from a build the server cannot parse
(the only status ever given up on, after five attempts).

---

## `/dashboard` — the caregiver web app

Every route below requires the caregiver role and is scoped to patients
the caller is actively linked to.

### Summary

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/summary` | Homepage stats and patient overview cards |

### Patients

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/patients` | List patients linked to the caregiver |
| POST | `/dashboard/patients` | Register a new patient and link them to the caregiver |
| GET | `/dashboard/patients/{id}` | Full patient profile, stats, and relationship |
| PATCH | `/dashboard/patients/{id}` | Update patient info or relationship metadata |
| POST | `/dashboard/patients/{id}/deregister` | Permanently revoke the caregiver link (the patient's Smaran id no longer logs in with this caregiver) |
| DELETE | `/dashboard/patients/{id}` | Remove the patient linkage and their records |

### Memory subjects (people, places, things)

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/patients/{id}/memories?kind=` | List memory subjects, optionally filtered by `person` / `place` / `object` |
| POST | `/dashboard/patients/{id}/memories` | Create a memory subject |
| PATCH | `/dashboard/patients/{id}/memories/{subject_id}` | Update details or toggle active status |
| DELETE | `/dashboard/patients/{id}/memories/{subject_id}` | Remove a memory subject |

### Memory media

| Method | Path | Purpose |
|---|---|---|
| POST | `/dashboard/patients/{id}/memories/assets` | Upload a picture (multipart form) and record it against the bucket in one request |
| GET | `/dashboard/patients/{id}/memories/assets` | List stored memory photographs, newest first |
| DELETE | `/dashboard/patients/{id}/memories/assets/{asset_id}` | Soft-delete a stored memory |

### Reminders

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/patients/{id}/reminders?include_inactive=` | List reminders set up for a patient |
| POST | `/dashboard/patients/{id}/reminders` | Set up a reminder (`kind`, `title`, `detail`, `schedule`) |
| PATCH | `/dashboard/patients/{id}/reminders/{reminder_id}` | Change a reminder, or switch it off with `active: false` |
| DELETE | `/dashboard/patients/{id}/reminders/{reminder_id}` | Retire a reminder (soft — a phone that was offline still learns it is gone) |

`schedule` is `HH:MM|1111111` (a 24-hour time plus a Sunday-first days
mask) for a repeating reminder, or `HH:MM@YYYY-MM-DD` for one that happens
once.

### Progress & analytics

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/patients/{id}/progress` | Session history, accuracy rollups, activity-type breakdown |
| GET | `/dashboard/patients/{id}/trends?from=&to=` | Daily rolled-up accuracy / response-time points for charts |
| GET | `/dashboard/patients/{id}/flags` | Advisory attention flags, computed against the patient's own baseline — never a cross-patient score |
| GET or POST | `/dashboard/patients/{id}/ai-insights` | On-demand AI (Google Gemini Flash) clinical and routine observations, framed against this patient's own historical baseline, with a deterministic fallback when the model is unavailable |

### Casual play

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/patients/{id}/casual-play` | List non-scored casual sessions (chess, sudoku, etc.) |
| POST | `/dashboard/patients/{id}/casual-play` | Record a casual play session |

### Activity feed & notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/dashboard/activity?patient_id=&limit=&offset=` | Paginated feed of question attempts, across all linked patients or one |
| GET | `/dashboard/notifications` | Recent session completions, new memory subjects, attention alerts |

---

## Not yet built

Sketched in `artifacts/api-contract.md` but with no route behind them yet:
`POST /auth/enroll`, `POST /auth/device/token`, `GET /auth/me`,
`PATCH /users/me`, `GET /users/{patient_id}/people`,
`GET /users/{patient_id}/memories`. Down-sync of `people` and
`memory_items` is also outstanding — see `artifacts/progress.md` for the
current state of every feature before relying on something described here.
