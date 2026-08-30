# Data model — **PROPOSED**

No schema exists in code yet: `apps/mobile` has no SQLite, `apps/api` has no ORM. This is
the agreed design to build against. Update this file as tables land, and mark them ✅.

Two stores, deliberately different shapes:

- **Device (SQLite + Drizzle)** — the write path. Small, denormalised, fast to append,
  never blocks on the network. It is the source of truth until a row syncs.
- **Server (PostgreSQL + TimescaleDB)** — the read path. Normalised, plus a hypertable for
  session events feeding continuous aggregates for the dashboard.

---

## 1. Device — SQLite

### `patient`
One row. The person holding the phone.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | server patient id, set at enrollment |
| `display_name` | text | what `recall` and greetings use |
| `preferred_language` | text | BCP-47; drives i18n and TTS voice |
| `enrolled_at` | integer | epoch ms |

### `device`
One row. Identity for sync.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | generated once, `expo-crypto`, never regenerated |
| `next_seq` | integer | monotonic counter; the `seq` half of the dedupe key |
| `last_synced_seq` | integer | server-acknowledged watermark |
| `last_synced_at` | integer | epoch ms, nullable |

### `game_session` — the core record
One row per completed session. **Immutable once written.**

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | client-generated uuid |
| `seq` | integer | from `device.next_seq`, unique per device |
| `game_id` | text | e.g. `pattern-match`, `daily-recall` |
| `difficulty` | integer | the level the adaptive engine chose |
| `started_at` / `ended_at` | integer | epoch ms |
| `accuracy` | real | 0–1 |
| `avg_response_ms` | integer | mean across attempts |
| `attempts` | integer | total interactions |
| `correct` / `total` | integer | raw counts, kept so metrics can be recomputed |
| `consistency` | real | inverse variance of response time, 0–1 |
| `completed` | integer | 0/1 — abandoned sessions still record, never penalised |

Store the raw counts, not just the ratios. Definitions of "accuracy" will change; the
underlying facts should not need re-collection.

### `session_event` — optional detail
Per-attempt rows for a session. Useful for replay and for a future model. Prune on a
retention window; never sync unless a session is flagged for review.

| Column | Type |
|---|---|
| `id` text PK · `session_id` text FK · `index` integer · `prompt` text · `response` text · `correct` integer · `response_ms` integer |

### `reminder`
| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `kind` | text | `medicine` · `hydration` · `activity` · `appointment` |
| `title` / `detail` | text | shown and spoken |
| `schedule` | text | rrule-ish or a simple time-of-day + days mask |
| `active` | integer | 0/1 |
| `notification_ids` | text | JSON array of scheduled `expo-notifications` ids, so a change can cancel cleanly |

### `reminder_event`
| Column | Type | Notes |
|---|---|---|
| `id` text PK · `reminder_id` text FK · `seq` integer · `due_at` integer · `acknowledged_at` integer nullable · `outcome` text | `done` · `snoozed` · `missed` |

Adherence is computed from these. They sync like sessions and use the same `seq` counter.

### `person`
Synced **down** from the family. Read-only on device. Backs the People tab and the Help
contact.

| Column | Type |
|---|---|
| `id` text PK · `name` text · `relationship` text · `photo_uri` text · `phone` text · `is_primary_contact` integer · `sort` integer |

Photos are cached to the filesystem at sync; the tab must render from cache offline.

### `memory_item`
Synced down. Backs the Memories tab.

| Column | Type |
|---|---|
| `id` text PK · `kind` text (`photo`/`audio`/`story`) · `caption` text · `media_uri` text · `created_at` integer · `shared_by` text |

### `sync_queue`
| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincr | drain order |
| `entity` | text | `game_session` · `reminder_event` |
| `entity_id` | text | |
| `seq` | integer | copied from the row, so a retry sends the same key |
| `payload` | text | JSON snapshot, so the queue is self-contained |
| `attempts` | integer | backoff counter |
| `created_at` | integer | |

**Write the row and enqueue it in one transaction.** A session that exists without a queue
entry is a silently lost sync.

---

## 2. Server — PostgreSQL + TimescaleDB

### Relational
- `patients` — id, display name, preferred language, enrolled_at, enrolled_by
- `caregivers` — id, name, contact, auth subject
- `enrollments` — caregiver ↔ patient, role, created_at
- `devices` — id, patient_id, last_seen_at, app_version
- `people` / `memory_items` — the down-sync content, owned by caregivers
- `reminders` — the server-authoritative definitions devices pull

### Hypertable: `session_events`

```sql
SELECT create_hypertable('session_events', 'ended_at');
CREATE UNIQUE INDEX ON session_events (device_id, seq);
```

Columns mirror `game_session` plus `patient_id` and `device_id`. `(device_id, seq)` is the
idempotency key — ingest is an upsert on it, so a retried batch is a no-op
(`decisions.md` D-09).

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
