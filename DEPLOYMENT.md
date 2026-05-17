# Cloz Digital — Deployment & Persistence Guide

This document covers Railway deployment, **how to make data permanent**, backup
strategy, and the roadmap to PostgreSQL.

---

## TL;DR — Why data was disappearing

Cloz Digital currently uses **sql.js** (SQLite-in-WASM) with the database file
written to `${DATA_DIR}/cloz-admin.db`.

On Railway, every redeploy spins up a fresh container with an ephemeral
filesystem. **Anything written to disk that is not on a mounted Volume is wiped.**

If you don't attach a Volume and point `DATA_DIR` at it, every push to GitHub
resets your data.

The fix takes 2 minutes (steps below). Once done, redeploys are safe.

---

## Step 1 — Attach a Volume on Railway

1. Open your Cloz Digital service on Railway.
2. Click **Settings → Volumes → New Volume**.
3. Mount path: `/data`
4. Size: 1 GB is plenty for now (you can grow it later).
5. Click **Add**.

## Step 2 — Set `DATA_DIR`

In **Variables** tab, add:

```
DATA_DIR=/data
APP_URL=https://cloz.digital
```

If the variables already exist, make sure they match exactly.

## Step 3 — Redeploy and verify

After the redeploy, watch the build logs. You should see:

```
─────────────────────────────────────
Storage:    /data/cloz-admin.db
DATA_DIR:   /data
File:       (created or sized)
Persistent: yes (mounted volume detected)
```

If you see a `⚠️ STORAGE WARNINGS` block, the volume isn't mounted or
`DATA_DIR` isn't set correctly.

## Step 4 — Confirm via the diagnostic endpoint

Once deployed, hit:

```
GET https://cloz.digital/api/admin/data/storage
```

Expected response:

```json
{
  "dbPath": "/data/cloz-admin.db",
  "dataDir": "/data",
  "fileExists": true,
  "persistent": true,
  "isRailway": true,
  "isProduction": true,
  "warnings": []
}
```

If `warnings` is non-empty, something is misconfigured.

---

## Backup & Export

The app exposes admin data endpoints for full-database backups.

### Download a JSON backup

```
GET https://cloz.digital/api/admin/data/export?download=1
```

This returns a complete JSON dump of every table. Save it somewhere safe.
Schedule this weekly (cron job, GitHub Action, or any uptime monitor).

### Restore from a backup

```
POST https://cloz.digital/api/admin/data/import
Content-Type: application/json

{ ... contents of an export file ... }
```

The import is **additive and defensive**:
- It never drops tables.
- It never deletes rows.
- It skips rows whose `id` already exists.
- It reports per-table inserted / skipped / error counts.

### Database health snapshot

```
GET https://cloz.digital/api/admin/data/health
```

Returns row counts per table, storage info, and total row count. Useful for
"is the data still there?" checks after deploys.

---

## What's persisted today

Everything created in Management or by clients persists to
`${DATA_DIR}/cloz-admin.db`:

- Clients (CRM) + leads + pipeline + deals
- Invoices + payments + retainers + revenue
- Inquiries (homepage contact form submissions)
- Mail accounts + IMAP sync data + sent queue + templates + contacts
- Portal clients + magic links + tickets + ticket messages + assets +
  messages + invoices + maintenance reports + approvals + proposals + activity
- SOPs + steps + instances + automations + audit events
- Legal templates + generated documents + versions + cookie consents +
  privacy requests
- Activity logs (every API call, errors, AI usage)
- Config + prompts + features + tools + schemas
- Marketing / analytics summaries (computed live from the above)

Data that lives in browser `localStorage` (not server-side):
- Operator user selection (Anes/Denis personalization)
- Cookie consent preference
- Some Content Studio brand kits / autosave state
- The legacy Zustand "management store" (used by some older pages that
  haven't been migrated to the backend yet — sample data, snapshots)

Browser localStorage is per-user, per-device. It is not lost on Railway
redeploys but is lost if a user clears their browser data.

---

## Persistence Center

There is a live dashboard at `/management/persistence` that shows:

- Volume mount status (and refuses to start the server in production
  without a recognised persistent path — see "Startup safety" below).
- Per-table row counts and last-write timestamps.
- An audit log of every mutation hitting the API.
- Write-proof markers you can drop before a deploy and check after.
- All snapshot files on disk, downloadable.
- PostgreSQL ping (when `DATABASE_URL` is set).

## Audit log

Every `POST/PATCH/PUT/DELETE` against `/api/*` is captured in the
`persistence_audit` table — actor, route, action, entity, status, latency,
and a 400-character body snapshot. Non-blocking; never affects responses.
Visible in the Persistence Center → Audit Log tab.

## Automated snapshots

The snapshot scheduler (`database/snapshotScheduler.js`) takes one full JSON
dump on boot and then one every 24 hours into `${DATA_DIR}/backups/`. Files
named `cloz-snapshot-YYYY-MM-DD.json`, retained 14 days. Tunable via:

| Variable | Default | Purpose |
|---|---|---|
| `BACKUPS_ENABLED` | `1` | Set to `0` to disable the scheduler. |
| `BACKUP_INTERVAL_MS` | `86400000` (24h) | How often to snapshot. |
| `BACKUP_RETENTION_DAYS` | `14` | How long to keep snapshots. |

Manual snapshot: POST `/api/persistence/snapshots`.

## Startup safety

On boot, `server.js` calls `enforcePersistence()`:

- In production + on Railway + without a persistent volume → the process
  exits with a clear error before any writes can happen.
- Emergency override: set `ALLOW_EPHEMERAL_STORAGE=1`. The app starts but
  prints a loud warning.

This prevents the most common production data-loss scenario.

## PostgreSQL migration roadmap

A full migration to Railway PostgreSQL is the long-term answer for
multi-user scale, off-host backups, and standard SQL tooling.

**Current state on disk (2026-05-18):**
- `database/pgAdapter.js` exists. It connects to `DATABASE_URL` and
  exposes an async `pg`-backed wrapper with the same surface as the
  sql.js wrapper.
- `scripts/migrate-to-pg.js` copies every row from SQLite to PG. It is
  idempotent (`ON CONFLICT DO NOTHING`) and safe to re-run.
- The Persistence Center shows the PG connection status when configured.

**What is NOT yet done:**
- The runtime request path still uses sql.js. Roughly 650
  `db.prepare(...).get/all/run` call sites across 26 route files need
  to become `await` before the runtime can switch.
- Several SQLite-specific helpers (`datetime('now','-7 days')`,
  `json_extract`, etc.) need dialect translation.

**Cutover sequence (when you're ready):**

1. Provision PostgreSQL on Railway and copy `DATABASE_URL` into the
   service's Variables.
2. `npm install pg`.
3. Run `node scripts/migrate-to-pg.js` once. It moves every row from
   `${DATA_DIR}/cloz-admin.db` into PG, skipping rows that already exist
   in the destination.
4. Land the route-by-route async refactor as its own focused project.
   The audit log + snapshot system + Persistence Center already exist
   and will continue working through the cutover.
5. When the last route is async, swap `database/init.js → getDb()` to
   return `pgWrapper()` from `database/pgAdapter.js`. Keep the SQLite
   file on the volume as a permanent backup.

---

## Environment variable reference

| Variable | Required | What it does |
|---|---|---|
| `APP_URL` | Yes | Canonical public URL. Used in every email link. Set to `https://cloz.digital`. |
| `DATA_DIR` | **Yes on Railway** | Directory where the database file lives. Set to `/data` (or your mounted volume path). |
| `ADMIN_PASSWORD` | Yes | Bootstrapping admin password. |
| `MANAGEMENT_PASSWORD_STEP_1` | Yes | First management password. |
| `MANAGEMENT_PASSWORD_STEP_2` | Yes | Second management password. |
| `CEREBRAS_API_KEY` | Yes | AI provider key. |
| `RESEND_API_KEY` | Recommended | Required for sending emails (portal magic links, inquiry notifications, etc.). |
| `GOOGLE_MAPS_API_KEY` | Optional | Enables real-business discovery in Client Scout. |
| `MAIL_ENCRYPTION_KEY` | Optional | Override for at-rest mail credential encryption. |
| `PORTAL_FROM` | Optional | Override for portal email "from" address. |
| `PORTAL_INTERNAL_TO` | Optional | Comma-separated list of internal recipients for new portal tickets. |
| `INQUIRY_FROM` | Optional | Override for inquiry email "from" address. |
| `INQUIRY_INTERNAL_TO` | Optional | Comma-separated list of internal recipients for new inquiries. |

---

## Test that redeploys are safe

1. Open the admin panel, create a test client (`/management/clients`).
2. Note the time. Hit `/api/admin/data/health` → record the count of
   `client_scout_leads`.
3. Push any code change to `main` to trigger a Railway redeploy.
4. After the deploy finishes, hit `/api/admin/data/health` again.
5. The count should match. Your test client should still appear in the
   admin panel.

If counts don't match, the Volume isn't mounted correctly.
