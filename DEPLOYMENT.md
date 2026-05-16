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

## PostgreSQL migration roadmap (Phase 2)

A full migration to Railway PostgreSQL is the long-term answer for multi-user
scale, off-host backups, and standard SQL tooling. It is a substantial
multi-day rewrite touching every route file. **It is NOT required for
production durability** — a mounted Volume gives you durable storage today.

### Why we haven't shipped PG yet

- `sql.js` exposes a **synchronous** API. `pg` is async. Every endpoint
  needs to be rewritten with `await`. There are ~25 route files with
  hundreds of `db.prepare(...).get/all/run` calls.
- Many queries use SQLite-specific syntax (`datetime('now', '-7 days')`,
  `json_extract`, `LIKE` casing, etc.) that doesn't translate 1:1.
- The migration must be done with care to avoid data loss.

### Planned migration

1. **Adapter layer** (`db/adapter.js`):
   - Detect `DATABASE_URL` → use `pg`.
   - Otherwise → use the current sql.js wrapper.
   - Both implement the same `{ prepare(), exec(), transaction() }` surface.
2. **SQL dialect helper** — translate the half-dozen SQLite-specific
   functions (`datetime('now', ...)` → `NOW() + INTERVAL ...`,
   `json_extract` → `->>`, etc.).
3. **Route-by-route migration** — convert each route to `await` calls.
4. **One-time data move** — `scripts/migrate-to-pg.js` reads the existing
   SQLite file and writes to PostgreSQL via the same adapter.
5. **Switchover** — set `DATABASE_URL` on Railway, redeploy. Adapter routes
   reads/writes to PG. Old SQLite file kept as backup.

Tracking the work explicitly will be cleaner than rushing it in one push.

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
