# Data model

**Device: ✅ built** (2026-09-01) — all nine tables exist in `apps/mobile/src/db/schema.ts`,
created by `src/db/migrations.ts`. See `decisions.md` D-24.
**Server: 🟡** — `apps/api` has SQLAlchemy models, `memory_assets` among them and wired to
a real upload path (D-39), but no
migrations, no hypertable and no continuous aggregates; §2 below is otherwise still the
design to build against.
**Server: 🟡** — `apps/api/src/features/database/models.py` now has a SQLAlchemy model for
every table that crosses the sync boundary (D-32), and `POST /sync/sessions` /
`POST /sync/reminder-events` write `devices`, `session_events` and `reminder_events` (D-33).
`GET /sync/pull` syncs `reminders` back down and restores `session_events` to a reinstalled
phone (D-34), and **Alembic owns the schema** — `task db:migrate` (D-35). Still missing: the
hypertable itself, the continuous aggregates, and the other two down-sync tables (`people`,
`memory_items`).

Update this file as tables land, and mark them ✅.

Two stores, deliberately different shapes:

- **Device (SQLite + Drizzle)** — the write path. Small, denormalised, fast to append,
  never blocks on the network. It is the source of truth until a row syncs.
- **Server (PostgreSQL + TimescaleDB)** — the read path. Normalised, plus a hypertable for
  session events feeding continuous aggregates for the dashboard.

---

## 1. Device — SQLite

### `patient` ✅
One row. The person holding the phone.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | server patient id, set at enrollment |
| `display_name` | text | what `recall` and greetings use |
| `preferred_language` | text | BCP-47; drives i18n and TTS voice |
| `enrolled_at` | integer | epoch ms |

### `device` ✅
One row. Identity for sync.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | generated once, `expo-crypto`, never regenerated |
| `next_seq` | integer | monotonic counter; the `seq` half of the dedupe key |
| `last_synced_seq` | integer | lowest still-queued `seq` minus one (D-33) |
| `last_synced_at` | integer | epoch ms, nullable |
| `last_pulled_at` | integer | **the server's** clock at the last pull, echoed back as `since`; null means "never pulled", which is what asks for a restore (D-34) |

### `game_session` ✅ — the core record
One row per completed session. **Immutable once written.**

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | client-generated uuid |
| `seq` | integer | from `device.next_seq`, unique per device |
| `game_id` | text | e.g. `pattern-match`, `daily-recall` |
| `difficulty` | integer | the level the adaptive engine chose |
| `started_at` / `ended_at` | integer | epoch ms |
| `duration_ms` | integer | wall clock, pauses included |
| `time_on_task_ms` | integer | the same round with the pauses taken out |
| `attempts` | integer | total interactions |
| `correct` / `total` | integer | raw counts, kept so metrics can be recomputed |
| `completed` | integer | 0/1 — abandoned sessions still record, never penalised |
| `accuracy` | real | of the attempts made, the share that were right, 0–1 |
| `precision` | real, null | how close the run came to the fewest attempts it could take; null when the game has no such floor |
| `completion` | real | how much of the round was finished, 0–1 |
| `avg_response_ms` | integer | mean across attempts |
| `median_response_ms` | integer | the middle attempt, unmoved by one walked-away turn |
| `consistency` | real, null | one minus the coefficient of variation of response time, 0–1; null under two attempts |
| `longest_streak` | integer | longest run of right answers in a row |

Unique index on `seq`; index on `(game_id, ended_at)` — the one query the engine makes.

The columns are `SessionStats` in `lib/game-stats.ts`, field for field, so a closed session
is written as-is and reads back as the same object (D-22, D-24).

Store the raw counts, not just the ratios. Definitions of "accuracy" will change; the
underlying facts should not need re-collection. The measured numbers that *cannot* be
recomputed from the counts — time on task, the median turn, the longest streak — are
columns for the same reason.

### `remote_session` ✅ — history that is not this device's
`game_session` minus `seq`, pulled down after a reinstall (D-34). Read by the adaptive engine
alongside `game_session` and **never queued, never sent up** — these rounds are already on the
server. Safe to drop and re-pull; nothing here is owed to anyone.

Index on `(game_id, ended_at)`, the same query the engine makes.

### `session_event` ✅ — optional detail
Per-attempt rows for a session. Useful for replay and for a future model. Prune on a
retention window; never sync unless a session is flagged for review.

| Column | Type |
|---|---|
| `id` text PK · `session_id` text FK · `index` integer · `prompt` text · `response` text · `correct` integer · `response_ms` integer |

### `reminder` ✅
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `kind` | text | `medicine` · `hydration` · `activity` · `appointment` |
| `title` / `detail` | text | shown and spoken |
| `schedule` | text | rrule-ish or a simple time-of-day + days mask |
| `active` | integer | 0/1 |
| `notification_ids` | text | JSON array of scheduled `expo-notifications` ids, so a change can cancel cleanly |

### `reminder_event` ✅
| Column | Type | Notes |
|---|---|---|
| `id` text PK · `reminder_id` text FK · `seq` integer · `due_at` integer · `acknowledged_at` integer nullable · `outcome` text | `done` · `snoozed` · `missed` |

Adherence is computed from these. They sync like sessions and use the same `seq` counter.

### `person` ✅
Synced **down** from the family. Read-only on device. Backs the People tab and the Help
contact.

| Column | Type |
|---|---|
| `id` text PK · `name` text · `relationship` text · `photo_uri` text · `phone` text · `is_primary_contact` integer · `sort` integer |

Photos are cached to the filesystem at sync; the tab must render from cache offline.

### `memory_item` ✅
Synced down. Backs the Memories tab.

| Column | Type |
|---|---|
| `id` text PK · `kind` text (`photo`/`audio`/`story`) · `caption` text · `media_uri` text · `created_at` integer · `shared_by` text |

### `sync_queue` ✅
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincr | drain order |
| `entity` | text | `game_session` · `reminder_event` · `reminder` (creations only, D-36) |
| `entity_id` | text | |
| `seq` | integer | copied from the row, so a retry sends the same key |
| `payload` | text | JSON snapshot, so the queue is self-contained |
| `attempts` | integer | backoff counter |
| `created_at` | integer | |

**Write the row and enqueue it in one transaction.** A session that exists without a queue
entry is a silently lost sync.

Drained by `src/lib/sync.ts` over `src/db/queue.ts` (D-33). A queue row is deleted only on a
response that accounts for it, and deleting it never touches the `game_session` or
`reminder_event` it describes — this is an outbox, not the record.

---

## 2. Server — PostgreSQL + TimescaleDB

All of §2's tables exist as SQLAlchemy models and are created by `alembic/versions/0001_baseline.py`
(D-35). None of the Timescale machinery does — `create_hypertable` needs to run in a migration
**before** `session_events` holds meaningful data, because it rewrites the table.

### `memory_assets` ✅ — the media the family uploads
One row per object in the memory bucket. **The row is the record; the bucket holds the
bytes and neither knows about the other except through `bucket` + `object_key`.** The
dashboard PUTs a file straight at the bucket with a presigned URL and the phone GETs it
back the same way, so media never crosses `apps/api` (`decisions.md` D-32).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `patient_id` | uuid FK → `patients` | CASCADE; whose memory it is |
| `subject_id` | uuid FK → `memory_subjects`, null | SET NULL. Set when the picture *is* a recognition subject's photo |
| `kind` | text | `photo` · `audio` · `story` — the device's `memory_item.kind`, spelled the same |
| `bucket` | text | On the row, not only in config: a deployment's bucket can change and old rows must still resolve |
| `object_key` | text | What S3 answers to. **Ours to generate, never the uploaded filename** |
| `file_name` | text, null | The picture's name as the caregiver knows it — what the dashboard lists and what a download saves as |
| `content_type` / `size_bytes` / `etag` | text / int / text | `etag` is how the phone's media cache knows a file is stale without spending a download |
| `description` | text, null | The caption the phone shows and, once there is TTS, reads aloud. Never a clinical note (§3.6) |
| `status` | text | `pending` → `ready` (or `failed`). The row exists before the object does |
| `uploaded_at` | timestamptz, null | Set when the PUT is confirmed |
| `is_active` | bool | Soft delete — see below |
| `uploaded_by` | text | Clerk id |
| `created_at` / `updated_at` | timestamptz | `updated_at` is the down-sync watermark, so every edit must move it |

Unique on `(bucket, object_key)`; index on `(patient_id, updated_at)` — the down-sync
query, and the only one. `patient_id` has no index of its own: the composite leads on it.

**The phone syncs down `ready` rows only.** A `pending` row names bytes that may never
arrive, and a device that caches one shows a gap where a face should be.

**Deletes are soft.** Down-sync is watermark-based, so a device can never learn about a row
that is simply gone — it would keep showing a removed picture forever. Flipping `is_active`
is what tells it to drop the cached file.

### Hypertable: `session_events`
### Relational
- `patients` ✅ — id, `user_id` (Clerk), dob, address, contact number, preferred language,
  `enrolled_at`, `enrolled_by`. **No display name** — D-20 wins over the earlier line here:
  the server mirrors nothing about a person, the device holds the name it greets with, and
  Clerk holds it for anyone with an account
- `roles` ✅ / `patient_caregivers` ✅ — the enrollment link, keyed by Clerk id. There is no
  `caregivers` table and there will not be one (D-20). `roles.smaran_id` is the nine-digit
  number a person reads out so a caregiver can be linked to them, drawn from the
  `smaran_id_seq` sequence that starts at 100,000,000 (D-37). `patient_caregivers.status`
  is `pending` · `active` · `revoked` — a link typed in from a Smaran id is `pending` until
  it is approved, so the id alone grants nothing
- `devices` ✅ — id (the device's own uuid), patient_id, app_version, `last_synced_seq`
  (the watermark every ingest response reports), last_seen_at, enrolled_at
- `people` ✅ / `memory_items` ✅ — the down-sync content, owned by caregivers
- `reminders` ✅ — the server-authoritative definitions devices pull, with caregiver CRUD
  behind `/dashboard/patients/{id}/reminders` and a **soft** delete (D-34). A phone may also
  *create* one through `POST /sync/reminders`, and only create it — no `device_id`/`seq`
  here, because a client-generated uuid already makes that insert idempotent (D-36)

The three down-sync tables carry `updated_at` **and `deleted_at`**: `GET /sync/pull?since=`
has to tell a device that has been off for a week about a row that was removed as well as
one that was added, and a hard delete is silent to a watermark. The append-only streams are
not soft-deleted — nothing ever removes a fact.

`memory_subjects` (the faces a recall game asks about) and `memory_items` (what the
Memories tab shows) are different tables on purpose. So are `people` and `memory_subjects`:
one is someone to reach, the other is someone to be asked about, and the same human is
often both.

### Hypertable: `session_events` 🟡 *(table ✅, hypertable ⬜)*

```sql
SELECT create_hypertable('session_events', 'ended_at');
```

Columns mirror the device's `game_session` — `SessionStats` field for field — plus
`patient_id`, `device_id` and `received_at`, the server's own clock on arrival.

**This is the server's copy of `game_session`, not of the device's `session_event`.** The
name collides and the collision has bitten already: per-attempt detail stays on the phone
(§1), one row here is a whole round. It is also not `game_sessions`, the older
caregiver-authored activity record the dashboard reads today.

`(device_id, seq)` is the idempotency key — ingest is an upsert on it, so a retried batch is
a no-op (`decisions.md` D-09). **Both keys carry `ended_at`**: the primary key is
`(id, ended_at)` and the unique constraint is `(device_id, seq, ended_at)`, because
Timescale refuses a hypertable whose unique indexes do not include the partitioning column.
A retry sends the queued JSON snapshot byte for byte, so the extra column is as
deterministic as the other two (D-32).

`reminder_events.reminder_id` is a **plain uuid with no foreign key** — every reminder is
device-created today, so its definition has no row here and the constraint would refuse the
insert. An event is evidence and has to land. Do not add the constraint (D-32).

### Continuous aggregates

Rolled up per patient, per game, per day. These are the dashboard's read path — it must
never scan raw events.

```sql
CREATE MATERIALIZED VIEW session_daily
WITH (timescaledb.continuous) AS
SELECT patient_id,
       game_id,
       time_bucket('1 day', ended_at) AS day,
       avg(accuracy)         AS accuracy,
       avg(avg_response_ms)  AS response_ms,
       avg(consistency)      AS consistency,
       count(*)              AS sessions
FROM session_events
GROUP BY patient_id, game_id, day;
```

### Baseline & flags

A patient's **baseline** is a trailing window (proposed: 14 days) of their own
`session_daily` rows. An **attention flag** is a sustained deviation from that baseline —
sustained, so one bad afternoon does not alarm a family. Never a cross-patient comparison
(`decisions.md` D-08).

Flags are advisory. The dashboard should word them as observations a caregiver might look
into, never as a diagnosis or a clinical claim.

---

## 3. Rules

1. **Session records are immutable facts.** Append only. No conflict resolution needed.
2. **Mutable records are server-authoritative** — the device takes what it is given.
3. **Store raw counts alongside derived metrics.** Definitions will change.
4. **Timestamps are epoch ms integers on device**, `timestamptz` on the server. Never a
   local-time string.
5. **Ids are client-generated uuids** so a row exists and is referenceable with the radio
   off.
6. **No free-text clinical notes on the patient device.** Nothing that reads as a medical
   record belongs in a store this size and this exposed (`AGENTS.md` §2.5).
