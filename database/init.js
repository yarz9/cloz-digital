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

  // ══════════════════════════════════════════════════════════════
  //  OPERATIONS / SOP ENGINE
  // ══════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS sops (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT DEFAULT '',
      default_owner TEXT DEFAULT '',
      estimated_duration TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      published INTEGER DEFAULT 1,
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sop_steps (
      id TEXT PRIMARY KEY,
      sop_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      owner TEXT DEFAULT '',
      due_offset_days INTEGER DEFAULT 0,
      checklist TEXT DEFAULT '[]',
      required INTEGER DEFAULT 1,
      depends_on TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sop_steps_sop ON sop_steps(sop_id);

    CREATE TABLE IF NOT EXISTS sop_instances (
      id TEXT PRIMARY KEY,
      sop_id TEXT NOT NULL,
      sop_title TEXT NOT NULL,
      reference_kind TEXT DEFAULT '',
      reference_id TEXT DEFAULT '',
      reference_label TEXT DEFAULT '',
      status TEXT DEFAULT 'in_progress',
      assignee TEXT DEFAULT '',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT '',
      due_at TEXT DEFAULT '',
      progress_pct INTEGER DEFAULT 0,
      notes TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_sop_instances_status ON sop_instances(status);

    CREATE TABLE IF NOT EXISTS sop_instance_steps (
      id TEXT PRIMARY KEY,
      instance_id TEXT NOT NULL,
      step_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      owner TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      checklist_state TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      completed_at TEXT DEFAULT '',
      completed_by TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_sop_instance_steps_instance ON sop_instance_steps(instance_id);

    CREATE TABLE IF NOT EXISTS sop_automations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_event TEXT NOT NULL,
      sop_id TEXT NOT NULL,
      conditions TEXT DEFAULT '{}',
      enabled INTEGER DEFAULT 1,
      times_triggered INTEGER DEFAULT 0,
      last_triggered_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      actor TEXT DEFAULT '',
      entity_kind TEXT DEFAULT '',
      entity_id TEXT DEFAULT '',
      summary TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_events_kind ON audit_events(kind);
    CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
  `);

  // ══════════════════════════════════════════════════════════════
  //  LEGAL & COMPLIANCE
  // ══════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS legal_templates (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'public',
      body TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      effective_date TEXT DEFAULT '',
      published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS legal_documents (
      id TEXT PRIMARY KEY,
      template_slug TEXT DEFAULT '',
      client_id TEXT DEFAULT '',
      title TEXT NOT NULL,
      kind TEXT DEFAULT 'generated',
      body TEXT NOT NULL,
      params TEXT DEFAULT '{}',
      version INTEGER DEFAULT 1,
      effective_date TEXT DEFAULT '',
      signed_by TEXT DEFAULT '',
      signed_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_legal_documents_client ON legal_documents(client_id);

    CREATE TABLE IF NOT EXISTS legal_versions (
      id TEXT PRIMARY KEY,
      template_slug TEXT NOT NULL,
      version INTEGER NOT NULL,
      body TEXT NOT NULL,
      effective_date TEXT DEFAULT '',
      change_note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_legal_versions_slug ON legal_versions(template_slug);

    CREATE TABLE IF NOT EXISTS cookie_consents (
      id TEXT PRIMARY KEY,
      visitor_id TEXT NOT NULL,
      necessary INTEGER DEFAULT 1,
      analytics INTEGER DEFAULT 0,
      marketing INTEGER DEFAULT 0,
      policy_version TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_cookie_consents_visitor ON cookie_consents(visitor_id);

    CREATE TABLE IF NOT EXISTS privacy_requests (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      name TEXT DEFAULT '',
      email TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      assignee TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_privacy_requests_status ON privacy_requests(status);
  `);

  // ══════════════════════════════════════════════════════════════
  //  CLIENT PORTAL — A private workspace per client.
  //  Phase-1 schema. Real file storage and e-sig integration land in Phase 2/3.
  // ══════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS portal_clients (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      email TEXT UNIQUE NOT NULL,
      phone TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      website TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      brand_colors TEXT DEFAULT '{}',
      brand_fonts TEXT DEFAULT '{}',
      voice_guidelines TEXT DEFAULT '',
      package TEXT DEFAULT '',
      hosting_provider TEXT DEFAULT '',
      domain_registrar TEXT DEFAULT '',
      domain_expiry TEXT DEFAULT '',
      ssl_expiry TEXT DEFAULT '',
      mrr REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      access_token TEXT UNIQUE,
      welcome_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_clients_email ON portal_clients(email);
    CREATE INDEX IF NOT EXISTS idx_portal_clients_token ON portal_clients(access_token);

    CREATE TABLE IF NOT EXISTS portal_magic_links (
      token TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS portal_tickets (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'general',
      status TEXT DEFAULT 'open',
      assignee_email TEXT DEFAULT '',
      ai_summary TEXT DEFAULT '',
      satisfaction_rating INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      closed_at TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_portal_tickets_client ON portal_tickets(client_id);
    CREATE INDEX IF NOT EXISTS idx_portal_tickets_status ON portal_tickets(status);

    CREATE TABLE IF NOT EXISTS portal_ticket_messages (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      author TEXT NOT NULL,
      author_name TEXT DEFAULT '',
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_ticket_messages_ticket ON portal_ticket_messages(ticket_id);

    CREATE TABLE IF NOT EXISTS portal_assets (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'file',
      url TEXT DEFAULT '',
      description TEXT DEFAULT '',
      folder TEXT DEFAULT '',
      size_bytes INTEGER DEFAULT 0,
      mime_type TEXT DEFAULT '',
      uploaded_by TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_assets_client ON portal_assets(client_id);

    CREATE TABLE IF NOT EXISTS portal_messages (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      author TEXT NOT NULL,
      author_name TEXT DEFAULT '',
      body TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_messages_client ON portal_messages(client_id);

    CREATE TABLE IF NOT EXISTS portal_invoices (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      invoice_number TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'BAM',
      status TEXT DEFAULT 'pending',
      description TEXT DEFAULT '',
      pdf_url TEXT DEFAULT '',
      issued TEXT DEFAULT '',
      due TEXT DEFAULT '',
      paid TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_invoices_client ON portal_invoices(client_id);

    CREATE TABLE IF NOT EXISTS portal_maintenance_reports (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      period TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      details TEXT DEFAULT '{}',
      published INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_maint_client ON portal_maintenance_reports(client_id);

    CREATE TABLE IF NOT EXISTS portal_approvals (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      kind TEXT DEFAULT 'design',
      preview_url TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      decision_notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      decided_at TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_portal_approvals_client ON portal_approvals(client_id);

    CREATE TABLE IF NOT EXISTS portal_proposals (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      total REAL DEFAULT 0,
      currency TEXT DEFAULT 'BAM',
      status TEXT DEFAULT 'sent',
      signed_at TEXT DEFAULT '',
      signature_name TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_proposals_client ON portal_proposals(client_id);

    CREATE TABLE IF NOT EXISTS portal_activity (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_portal_activity_client ON portal_activity(client_id);
  `);

  // ══════════════════════════════════════════════════════════════
  //  SERVICE DESK — internal notes, tasks, conversions, merges
  // ══════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_desk_notes (
      id TEXT PRIMARY KEY,
      request_type TEXT NOT NULL,
      request_id TEXT NOT NULL,
      author TEXT DEFAULT '',
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sd_notes_req ON service_desk_notes(request_type, request_id);

    CREATE TABLE IF NOT EXISTS service_desk_tasks (
      id TEXT PRIMARY KEY,
      client_id TEXT DEFAULT '',
      source_request_type TEXT DEFAULT '',
      source_request_id TEXT DEFAULT '',
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      assignee TEXT DEFAULT '',
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_at TEXT DEFAULT '',
      checklist TEXT DEFAULT '[]',
      effort_estimate TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_sd_tasks_status ON service_desk_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_sd_tasks_assignee ON service_desk_tasks(assignee);
    CREATE INDEX IF NOT EXISTS idx_sd_tasks_client ON service_desk_tasks(client_id);
  `);

  // ── Migrate portal_tickets: assignee / SLA / merge / tags / effort ──
  const ticketMigrations = [
    ['assignee_name',  "TEXT DEFAULT ''"],
    ['sla_due_at',     "TEXT DEFAULT ''"],
    ['escalated',      "INTEGER DEFAULT 0"],
    ['merged_into',    "TEXT DEFAULT ''"],
    ['effort_estimate',"TEXT DEFAULT ''"],
    ['tags',           "TEXT DEFAULT '[]'"],
    ['source',         "TEXT DEFAULT 'portal'"],
    ['last_admin_view_at', "TEXT DEFAULT ''"],
    ['first_response_at',  "TEXT DEFAULT ''"],
    ['attachments',    "TEXT DEFAULT '[]'"],
  ];
  for (const [col, typedef] of ticketMigrations) {
    try { rawDb.run(`ALTER TABLE portal_tickets ADD COLUMN ${col} ${typedef}`); } catch {}
  }

  // ── Migrate portal_clients: expanded discovery / preferences profile ──
  const clientMigrations = [
    ['goals',                    "TEXT DEFAULT ''"],
    ['requested_services',       "TEXT DEFAULT '[]'"],
    ['business_challenges',      "TEXT DEFAULT ''"],
    ['discovery_notes',          "TEXT DEFAULT ''"],
    ['communication_preferences',"TEXT DEFAULT ''"],
    ['account_manager',          "TEXT DEFAULT ''"],
    ['priority_level',           "TEXT DEFAULT 'standard'"],
    ['niche',                    "TEXT DEFAULT ''"],
    ['monthly_retainer',         "REAL DEFAULT 0"],
  ];
  for (const [col, typedef] of clientMigrations) {
    try { rawDb.run(`ALTER TABLE portal_clients ADD COLUMN ${col} ${typedef}`); } catch {}
  }

  // ── Migrate portal_messages: subject + admin tracking ──
  const messageMigrations = [
    ['subject',       "TEXT DEFAULT ''"],
    ['handled',       "INTEGER DEFAULT 0"],
    ['handled_at',    "TEXT DEFAULT ''"],
    ['handled_by',    "TEXT DEFAULT ''"],
  ];
  for (const [col, typedef] of messageMigrations) {
    try { rawDb.run(`ALTER TABLE portal_messages ADD COLUMN ${col} ${typedef}`); } catch {}
  }

  // ══════════════════════════════════════════════════════════════
  //  CRM FINANCE — Invoices, Payments, Retainers (management-scope)
  //
  //  Separate from portal_invoices (which are per-client billing
  //  surfaced inside the Client Portal). These tables back the
  //  internal Revenue / Billing / Payments dashboards.
  // ══════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT DEFAULT '',
      client_id TEXT DEFAULT '',
      client_name TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'BAM',
      status TEXT DEFAULT 'draft',
      description TEXT DEFAULT '',
      line_items TEXT DEFAULT '[]',
      tax_amount REAL DEFAULT 0,
      issued_date TEXT DEFAULT '',
      due_date TEXT DEFAULT '',
      paid_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_crm_invoices_status ON crm_invoices(status);
    CREATE INDEX IF NOT EXISTS idx_crm_invoices_client ON crm_invoices(client_id);
    CREATE INDEX IF NOT EXISTS idx_crm_invoices_issued ON crm_invoices(issued_date);

    CREATE TABLE IF NOT EXISTS crm_payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT DEFAULT '',
      client_id TEXT DEFAULT '',
      client_name TEXT DEFAULT '',
      amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'BAM',
      method TEXT DEFAULT 'bank_transfer',
      reference TEXT DEFAULT '',
      received_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_crm_payments_invoice ON crm_payments(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_crm_payments_received ON crm_payments(received_date);

    CREATE TABLE IF NOT EXISTS crm_retainers (
      id TEXT PRIMARY KEY,
      client_id TEXT DEFAULT '',
      client_name TEXT DEFAULT '',
      package TEXT DEFAULT '',
      monthly_amount REAL DEFAULT 0,
      currency TEXT DEFAULT 'BAM',
      status TEXT DEFAULT 'active',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      billing_day INTEGER DEFAULT 1,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_crm_retainers_status ON crm_retainers(status);
    CREATE INDEX IF NOT EXISTS idx_crm_retainers_client ON crm_retainers(client_id);

    CREATE TABLE IF NOT EXISTS crm_forecast_snapshots (
      id TEXT PRIMARY KEY,
      generated_at TEXT DEFAULT (datetime('now')),
      generated_by TEXT DEFAULT '',
      horizon_months INTEGER DEFAULT 6,
      summary TEXT DEFAULT '',
      breakdown TEXT DEFAULT '[]',
      assumptions TEXT DEFAULT '',
      model TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_crm_forecast_generated ON crm_forecast_snapshots(generated_at);
  `);

  // ══════════════════════════════════════════════════════════════
  //  PERSISTENCE / AUDIT — write-capture log + write-proof marker
  // ══════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS persistence_audit (
      id TEXT PRIMARY KEY,
      ts TEXT DEFAULT (datetime('now')),
      actor TEXT DEFAULT '',
      method TEXT DEFAULT '',
      route TEXT DEFAULT '',
      action TEXT DEFAULT '',
      entity_type TEXT DEFAULT '',
      entity_id TEXT DEFAULT '',
      ip TEXT DEFAULT '',
      status INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      summary TEXT DEFAULT '',
      diff TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_audit_ts ON persistence_audit(ts);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON persistence_audit(entity_type, entity_id);

    CREATE TABLE IF NOT EXISTS persistence_markers (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now')),
      kind TEXT DEFAULT 'manual',
      payload TEXT DEFAULT '',
      created_by TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_markers_created ON persistence_markers(created_at);

    CREATE TABLE IF NOT EXISTS persistence_snapshots (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now')),
      path TEXT NOT NULL,
      bytes INTEGER DEFAULT 0,
      table_count INTEGER DEFAULT 0,
      row_count INTEGER DEFAULT 0,
      trigger TEXT DEFAULT 'scheduled',
      ok INTEGER DEFAULT 1,
      error TEXT DEFAULT ''
    );
  `);

  // ══════════════════════════════════════════════════════════════
  //  KNOWLEDGE CENTER — KB, Academy, Playbooks, Prompts, Copilot, RAG
  // ══════════════════════════════════════════════════════════════
  db.exec(`
    CREATE TABLE IF NOT EXISTS kb_articles (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      body TEXT DEFAULT '',
      excerpt TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      visibility TEXT DEFAULT 'internal',
      author TEXT DEFAULT '',
      version INTEGER DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      favorite_count INTEGER DEFAULT 0,
      parent_id TEXT DEFAULT '',
      reviewer TEXT DEFAULT '',
      review_due TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      published_at TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status);
    CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON kb_articles(category);

    CREATE TABLE IF NOT EXISTS kb_article_versions (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT DEFAULT '',
      body TEXT DEFAULT '',
      author TEXT DEFAULT '',
      change_note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_article_versions_article ON kb_article_versions(article_id);

    CREATE TABLE IF NOT EXISTS kb_comments (
      id TEXT PRIMARY KEY,
      article_id TEXT NOT NULL,
      author TEXT DEFAULT '',
      body TEXT NOT NULL,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_comments_article ON kb_comments(article_id);

    CREATE TABLE IF NOT EXISTS kb_favorites (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      article_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_fav_user_article ON kb_favorites(user_name, article_id);

    CREATE TABLE IF NOT EXISTS kb_courses (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      description TEXT DEFAULT '',
      level TEXT DEFAULT 'beginner',
      est_minutes INTEGER DEFAULT 30,
      cover_emoji TEXT DEFAULT '📘',
      published INTEGER DEFAULT 1,
      author TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_lessons (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      video_url TEXT DEFAULT '',
      attachment_url TEXT DEFAULT '',
      est_minutes INTEGER DEFAULT 5,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_lessons_course ON kb_lessons(course_id);

    CREATE TABLE IF NOT EXISTS kb_quizzes (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      question TEXT NOT NULL,
      options TEXT DEFAULT '[]',
      answer_index INTEGER DEFAULT 0,
      explanation TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_quizzes_lesson ON kb_quizzes(lesson_id);

    CREATE TABLE IF NOT EXISTS kb_enrollments (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      status TEXT DEFAULT 'in_progress',
      progress_pct INTEGER DEFAULT 0,
      enrolled_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT DEFAULT '',
      certificate_id TEXT DEFAULT ''
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_enrollments_user_course ON kb_enrollments(user_name, course_id);

    CREATE TABLE IF NOT EXISTS kb_lesson_progress (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      quiz_score INTEGER DEFAULT 0,
      quiz_total INTEGER DEFAULT 0,
      completed_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_kb_lprog_user_lesson ON kb_lesson_progress(user_name, lesson_id);

    CREATE TABLE IF NOT EXISTS kb_certificates (
      id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_title TEXT NOT NULL,
      score INTEGER DEFAULT 0,
      issued_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_playbooks (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      summary TEXT DEFAULT '',
      body TEXT DEFAULT '',
      steps TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      author TEXT DEFAULT '',
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_prompts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      body TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      use_count INTEGER DEFAULT 0,
      author TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_search_log (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      user_name TEXT DEFAULT '',
      result_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_search_log_created ON kb_search_log(created_at);

    CREATE TABLE IF NOT EXISTS kb_copilot_sessions (
      id TEXT PRIMARY KEY,
      user_name TEXT DEFAULT '',
      title TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kb_copilot_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      sources TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_copilot_msgs_session ON kb_copilot_messages(session_id);

    CREATE TABLE IF NOT EXISTS kb_chunks (
      id TEXT PRIMARY KEY,
      doc_type TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      doc_title TEXT DEFAULT '',
      chunk_index INTEGER DEFAULT 0,
      content TEXT NOT NULL,
      tokens_lower TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc ON kb_chunks(doc_type, doc_id);

    CREATE TABLE IF NOT EXISTS kb_content_assets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      kind TEXT DEFAULT 'document',
      url TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      description TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      author TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // ── Localization overrides (admin edits to bundled dictionary) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS i18n_overrides (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      lang TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_by TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_i18n_overrides_key_lang ON i18n_overrides(key, lang);
  `);

  // Migrate inquiries: add lang column
  try { rawDb.run(`ALTER TABLE inquiries ADD COLUMN lang TEXT DEFAULT 'en'`); } catch {}

  // ── Public Inquiries (homepage contact form) ──
  db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      business_name TEXT DEFAULT '',
      current_website TEXT DEFAULT '',
      service_needed TEXT DEFAULT '',
      message TEXT DEFAULT '',
      source TEXT DEFAULT 'website_contact_form',
      status TEXT DEFAULT 'new',
      priority TEXT DEFAULT 'medium',
      ai_score INTEGER DEFAULT 0,
      ai_package TEXT DEFAULT '',
      ai_project_value INTEGER DEFAULT 0,
      ai_followup TEXT DEFAULT '',
      ai_notes TEXT DEFAULT '',
      created_lead_id TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      notification_sent INTEGER DEFAULT 0,
      auto_reply_sent INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
    CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);
    CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
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
    // Phase 4: real-data verification (OSM/Google discovery + synthetic flag)
    ['source', "TEXT DEFAULT ''"],
    ['verified', 'INTEGER DEFAULT 0'],
    ['synthetic', 'INTEGER DEFAULT 0'],
    ['osm_id', "TEXT DEFAULT ''"],
    ['osm_type', "TEXT DEFAULT ''"],
  ];
  for (const [col, typedef] of migrations) {
    try {
      rawDb.run(`ALTER TABLE client_scout_leads ADD COLUMN ${col} ${typedef}`);
    } catch {
      // Column already exists — ignore
    }
  }

  // ── One-time data migration: mark legacy AI-generated leads as synthetic ──
  // Any pre-existing lead without a populated `source` column was created before
  // OSM integration and is therefore AI-generated. Mark it synthetic so it's
  // hidden by default. Idempotent: only affects rows where source is blank.
  try {
    rawDb.run(`UPDATE client_scout_leads
      SET synthetic = 1, verified = 0
      WHERE (source IS NULL OR source = '') AND synthetic = 0`);
  } catch {
    // Table may not exist on a fresh install — that's fine
  }

  // Save initial state
  db._save();

  return db;
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}
