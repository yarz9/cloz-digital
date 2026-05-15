import { getDb } from '../database/init.js';
import { randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════
//  CENTRAL LOGGING SERVICE — Cloz Digital Observability Platform
// ══════════════════════════════════════════════════════════════

const LEVELS = ['debug', 'info', 'success', 'warning', 'error', 'critical', 'security', 'audit'];

const CATEGORIES = [
  'system', 'auth', 'ai', 'mail', 'scout', 'billing', 'client',
  'audit_lab', 'database', 'api', 'ui', 'job', 'security',
];

// Sensitive patterns to redact
const REDACT_PATTERNS = [
  /AIza[A-Za-z0-9_-]{30,}/g,                    // Google API keys
  /sk-[A-Za-z0-9]{20,}/g,                        // OpenAI keys
  /re_[A-Za-z0-9]{20,}/g,                        // Resend keys
  /password["']?\s*[:=]\s*["'][^"']+["']/gi,     // Passwords in strings
  /bearer\s+[A-Za-z0-9._-]+/gi,                  // Bearer tokens
  /(?:IBAN|iban)\s*[:=]?\s*[A-Z]{2}\d{2}[A-Z0-9]{10,30}/g, // IBAN numbers
];

function redactSensitive(text) {
  if (!text) return text;
  let result = typeof text === 'string' ? text : JSON.stringify(text);
  for (const pattern of REDACT_PATTERNS) {
    result = result.replace(pattern, '****REDACTED****');
  }
  return result;
}

/**
 * Create the activity_logs table if it doesn't exist.
 */
export function ensureActivityLogsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      level TEXT NOT NULL DEFAULT 'info',
      category TEXT NOT NULL DEFAULT 'system',
      event_type TEXT DEFAULT '',
      action TEXT DEFAULT '',
      title TEXT DEFAULT '',
      message TEXT NOT NULL,
      details TEXT DEFAULT '{}',
      entity_type TEXT DEFAULT '',
      entity_id TEXT DEFAULT '',
      route TEXT DEFAULT '',
      method TEXT DEFAULT '',
      user_identifier TEXT DEFAULT '',
      session_id TEXT DEFAULT '',
      ip_address TEXT DEFAULT '',
      user_agent TEXT DEFAULT '',
      duration_ms INTEGER DEFAULT 0,
      success INTEGER DEFAULT 1,
      status_code INTEGER DEFAULT 0,
      error_code TEXT DEFAULT '',
      stack_trace TEXT DEFAULT '',
      model TEXT DEFAULT '',
      provider TEXT DEFAULT '',
      tokens_used INTEGER DEFAULT 0,
      cost_estimate REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON activity_logs(level);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_category ON activity_logs(category);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type ON activity_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
  `);
}

/**
 * Core log function — all helpers route through this.
 * Logging failures NEVER throw or break the application.
 */
export function log(entry) {
  try {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    const safeDetails = redactSensitive(
      typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || {})
    );
    const safeMessage = redactSensitive(entry.message || '');
    const safeStack = redactSensitive(entry.stack_trace || '');

    db.prepare(`INSERT INTO activity_logs (
      id, timestamp, level, category, event_type, action, title, message, details,
      entity_type, entity_id, route, method, user_identifier, session_id,
      ip_address, user_agent, duration_ms, success, status_code, error_code,
      stack_trace, model, provider, tokens_used, cost_estimate
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id,
      entry.timestamp || now,
      entry.level || 'info',
      entry.category || 'system',
      entry.event_type || '',
      entry.action || '',
      entry.title || '',
      safeMessage,
      safeDetails,
      entry.entity_type || '',
      entry.entity_id || '',
      entry.route || '',
      entry.method || '',
      entry.user_identifier || '',
      entry.session_id || '',
      entry.ip_address || '',
      entry.user_agent || '',
      entry.duration_ms || 0,
      entry.success !== false ? 1 : 0,
      entry.status_code || 0,
      entry.error_code || '',
      safeStack,
      entry.model || '',
      entry.provider || '',
      entry.tokens_used || 0,
      entry.cost_estimate || 0,
    );

    // Also write to legacy logs table for backward compat
    db.prepare('INSERT INTO logs (type, message, details) VALUES (?, ?, ?)').run(
      entry.level || 'info',
      safeMessage,
      safeDetails,
    );
  } catch (err) {
    // Never break the app due to logging failure
    console.error('[Logger] Failed to write log:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════
//  TYPED HELPER FUNCTIONS
// ════════════════════════════════════════════════════���═════════

export function logInfo(message, opts = {}) {
  log({ level: 'info', message, ...opts });
}

export function logSuccess(message, opts = {}) {
  log({ level: 'success', message, ...opts });
}

export function logWarning(message, opts = {}) {
  log({ level: 'warning', message, ...opts });
}

export function logError(message, opts = {}) {
  log({ level: 'error', message, success: false, ...opts });
}

export function logCritical(message, opts = {}) {
  log({ level: 'critical', message, success: false, ...opts });
  console.error(`[CRITICAL] ${message}`);
}

export function logSecurity(message, opts = {}) {
  log({ level: 'security', message, category: 'security', ...opts });
}

export function logAudit(message, opts = {}) {
  log({ level: 'audit', message, category: 'audit', ...opts });
}

// ── Domain-Specific Helpers ──

export function logAI(message, opts = {}) {
  log({ level: 'info', category: 'ai', event_type: 'ai_operation', message, ...opts });
}

export function logMail(message, opts = {}) {
  log({ level: 'info', category: 'mail', event_type: 'mail_activity', message, ...opts });
}

export function logBilling(message, opts = {}) {
  log({ level: 'info', category: 'billing', event_type: 'billing_activity', message, ...opts });
}

export function logClient(message, opts = {}) {
  log({ level: 'info', category: 'client', event_type: 'client_activity', message, ...opts });
}

export function logScout(message, opts = {}) {
  log({ level: 'info', category: 'scout', event_type: 'scout_activity', message, ...opts });
}

export function logAuth(message, opts = {}) {
  log({ level: 'info', category: 'auth', event_type: 'auth_event', message, ...opts });
}

export function logJob(message, opts = {}) {
  log({ level: 'info', category: 'job', event_type: 'background_job', message, ...opts });
}

export function logAPI(message, opts = {}) {
  log({ level: 'info', category: 'api', event_type: 'api_request', message, ...opts });
}

// ── Request context helper ──
export function extractRequestContext(req) {
  return {
    route: req.originalUrl || req.url,
    method: req.method,
    ip_address: req.ip || req.headers?.['x-forwarded-for'] || '',
    user_agent: (req.headers?.['user-agent'] || '').slice(0, 200),
    session_id: req.cookies?.mgmt_session || '',
  };
}
