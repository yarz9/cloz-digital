import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Database path ──
// In production (Railway), DATA_DIR points to a mounted persistent volume (e.g. /data).
// Locally, defaults to project root.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const dbPath = path.join(DATA_DIR, 'cloz-admin.db');

export function getDbPath() {
  return dbPath;
}

let db = null;
let SQL = null;

// Wrapper to provide better-sqlite3-compatible API over sql.js
function wrapDb(rawDb) {
  function saveToFile() {
    const data = rawDb.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  }

  // Auto-save every 5 seconds if there are changes
  let dirty = false;
  setInterval(() => { if (dirty) { saveToFile(); dirty = false; } }, 5000);

  return {
    prepare(sql) {
      return {
        run(...params) {
          rawDb.run(sql, params);
          dirty = true;
          return { changes: rawDb.getRowsModified(), lastInsertRowid: 0 };
        },
        get(...params) {
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            return row;
          }
          stmt.free();
          return undefined;
        },
        all(...params) {
          const results = [];
          const stmt = rawDb.prepare(sql);
          stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            results.push(row);
          }
          stmt.free();
          return results;
        },
      };
    },
    exec(sql) {
      rawDb.exec(sql);
      dirty = true;
    },
    pragma(str) {
      try { rawDb.run(`PRAGMA ${str}`); } catch {}
    },
    transaction(fn) {
      return (...args) => {
        rawDb.run('BEGIN');
        try {
          fn(...args);
          rawDb.run('COMMIT');
          dirty = true;
        } catch (e) {
          rawDb.run('ROLLBACK');
          throw e;
        }
      };
    },
    close() {
      saveToFile();
      rawDb.close();
    },
    _save: saveToFile,
  };
}

export async function initDatabase() {
  if (db) return db;

  SQL = await initSqlJs();

  let rawDb;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(buffer);
  } else {
    rawDb = new SQL.Database();
  }

  db = wrapDb(rawDb);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      body TEXT NOT NULL,
      description TEXT DEFAULT '',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS features (
      key TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      parameters TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schemas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      schema TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS client_scout_leads (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      country_code TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      website_url TEXT DEFAULT '',
      google_maps_url TEXT DEFAULT '',
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      has_website INTEGER DEFAULT 0,
      website_score INTEGER DEFAULT 0,
      seo_score INTEGER DEFAULT 0,
      mobile_score INTEGER DEFAULT 0,
      conversion_score INTEGER DEFAULT 0,
      opportunity_score INTEGER DEFAULT 0,
      outreach_priority TEXT DEFAULT '',
      website_issues TEXT DEFAULT '[]',
      reasoning TEXT DEFAULT '',
      suggested_package TEXT DEFAULT '',
      pain_points TEXT DEFAULT '[]',
      what_to_sell TEXT DEFAULT '',
      contact_channels TEXT DEFAULT '[]',
      outreach_email TEXT DEFAULT '',
      outreach_viber TEXT DEFAULT '',
      outreach_channel TEXT DEFAULT '',
      outreach_style TEXT DEFAULT '',
      source_hash TEXT DEFAULT '',
      scouting_mode TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'new',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Mail System Tables ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_accounts (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      title TEXT DEFAULT '',
      signature TEXT DEFAULT '',
      imap_host TEXT DEFAULT '',
      imap_port INTEGER DEFAULT 993,
      imap_user TEXT DEFAULT '',
      imap_pass TEXT DEFAULT '',
      smtp_host TEXT DEFAULT '',
      smtp_port INTEGER DEFAULT 587,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mail_messages (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      thread_id TEXT DEFAULT '',
      folder TEXT DEFAULT 'inbox',
      from_name TEXT DEFAULT '',
      from_email TEXT DEFAULT '',
      to_emails TEXT DEFAULT '[]',
      cc_emails TEXT DEFAULT '[]',
      bcc_emails TEXT DEFAULT '[]',
      subject TEXT DEFAULT '',
      body_text TEXT DEFAULT '',
      body_html TEXT DEFAULT '',
      snippet TEXT DEFAULT '',
      labels TEXT DEFAULT '[]',
      is_read INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      is_draft INTEGER DEFAULT 0,
      is_sent INTEGER DEFAULT 0,
      has_attachments INTEGER DEFAULT 0,
      attachments TEXT DEFAULT '[]',
      in_reply_to TEXT DEFAULT '',
      references_ids TEXT DEFAULT '[]',
      scheduled_at TEXT DEFAULT '',
      sent_at TEXT DEFAULT '',
      received_at TEXT DEFAULT '',
      priority TEXT DEFAULT 'normal',
      sentiment TEXT DEFAULT '',
      ai_summary TEXT DEFAULT '',
      ai_category TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mail_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      subject TEXT DEFAULT '',
      body TEXT DEFAULT '',
      default_account TEXT DEFAULT 'general',
      variables TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mail_contacts (
      id TEXT PRIMARY KEY,
      name TEXT DEFAULT '',
      email TEXT UNIQUE NOT NULL,
      company TEXT DEFAULT '',
      type TEXT DEFAULT 'lead',
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      last_contacted TEXT DEFAULT '',
      message_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mail_send_queue (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      scheduled_at TEXT DEFAULT '',
      attempted_at TEXT DEFAULT '',
      error TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Migrate mail_accounts table (add new columns) ──
  const mailAccountMigrations = [
    ['account_name', "TEXT DEFAULT ''"],
    ['description', "TEXT DEFAULT ''"],
    ['imap_username', "TEXT DEFAULT ''"],
    ['imap_password_encrypted', "TEXT DEFAULT ''"],
    ['imap_encryption', "TEXT DEFAULT 'ssl_tls'"],
    ['smtp_username', "TEXT DEFAULT ''"],
    ['smtp_password_encrypted', "TEXT DEFAULT ''"],
    ['smtp_encryption', "TEXT DEFAULT 'ssl_tls'"],
    ['sync_enabled', 'INTEGER DEFAULT 0'],
    ['sync_interval_minutes', 'INTEGER DEFAULT 15'],
    ['sync_sent', 'INTEGER DEFAULT 0'],
    ['download_attachments', 'INTEGER DEFAULT 0'],
    ['is_default', 'INTEGER DEFAULT 0'],
    ['inbox_folder', "TEXT DEFAULT 'INBOX'"],
    ['sent_folder', "TEXT DEFAULT 'Sent'"],
    ['drafts_folder', "TEXT DEFAULT 'Drafts'"],
    ['trash_folder', "TEXT DEFAULT 'Trash'"],
    ['spam_folder', "TEXT DEFAULT 'Spam'"],
    ['last_imap_test_at', "TEXT DEFAULT ''"],
    ['last_smtp_test_at', "TEXT DEFAULT ''"],
    ['last_sync_at', "TEXT DEFAULT ''"],
    ['updated_at', "TEXT DEFAULT (datetime('now'))"],
  ];
  for (const [col, typedef] of mailAccountMigrations) {
    try {
      rawDb.run(`ALTER TABLE mail_accounts ADD COLUMN ${col} ${typedef}`);
    } catch {
      // Column already exists — ignore
    }
  }

  // ── Migrate existing client_scout_leads table (add columns that may be missing) ──
  const migrations = [
    ['conversion_score', 'INTEGER DEFAULT 0'],
    ['contact_channels', "TEXT DEFAULT '[]'"],
    ['outreach_viber', "TEXT DEFAULT ''"],
    ['source_hash', "TEXT DEFAULT ''"],
    // Phase 3: Google Places + enhanced scoring
    ['place_id', "TEXT DEFAULT ''"],
    ['lat', 'REAL DEFAULT 0'],
    ['lng', 'REAL DEFAULT 0'],
    ['business_status', "TEXT DEFAULT ''"],
    ['types', "TEXT DEFAULT '[]'"],
    ['trust_score', 'INTEGER DEFAULT 0'],
    ['urgency_score', 'INTEGER DEFAULT 0'],
    ['best_sales_angle', "TEXT DEFAULT ''"],
    ['objection_prediction', "TEXT DEFAULT ''"],
    ['revenue_potential', "TEXT DEFAULT '{}'"],
    ['risk_factors', "TEXT DEFAULT '[]'"],
    ['website_review', "TEXT DEFAULT '{}'"],
    ['outreach_whatsapp', "TEXT DEFAULT ''"],
    ['outreach_linkedin', "TEXT DEFAULT ''"],
    ['followup_1', "TEXT DEFAULT ''"],
    ['followup_2', "TEXT DEFAULT ''"],
    ['followup_3', "TEXT DEFAULT ''"],
  ];
  for (const [col, typedef] of migrations) {
    try {
      rawDb.run(`ALTER TABLE client_scout_leads ADD COLUMN ${col} ${typedef}`);
    } catch {
      // Column already exists — ignore
    }
  }

  // Save initial state
  db._save();

  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}
