import { Router } from 'express';
import { getDb } from '../database/init.js';
import { log as activityLog } from '../services/logger.js';

const router = Router();

/**
 * Legacy addLog bridge — writes to both old `logs` table
 * and the new `activity_logs` table for unified observability.
 */
export function addLog(type, message, details = '') {
  const safe = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
  const sanitized = safe.replace(/AIza[A-Za-z0-9_-]{30,}/g, '****REDACTED****');
  try { getDb().prepare('INSERT INTO logs (type, message, details) VALUES (?, ?, ?)').run(type, message, sanitized); } catch {}

  // Bridge: determine category from message content
  const lowerMsg = message.toLowerCase();
  let category = 'system';
  let event_type = '';
  if (lowerMsg.includes('[ai]') || lowerMsg.includes('briefing') || lowerMsg.includes('analysis') || lowerMsg.includes('draft') || lowerMsg.includes('summary') || lowerMsg.includes('suggestion') || lowerMsg.includes('insight') || lowerMsg.includes('outreach generated') || lowerMsg.includes('content generated')) {
    category = 'ai'; event_type = 'ai_operation';
  } else if (lowerMsg.includes('mail') || lowerMsg.includes('email') || lowerMsg.includes('imap') || lowerMsg.includes('smtp') || lowerMsg.includes('resend') || lowerMsg.includes('reply sent')) {
    category = 'mail'; event_type = 'mail_activity';
  } else if (lowerMsg.includes('scout') || lowerMsg.includes('scan') || lowerMsg.includes('website review') || lowerMsg.includes('rebuild prompt') || lowerMsg.includes('lead ')) {
    category = 'scout'; event_type = 'scout_activity';
  } else if (lowerMsg.includes('test')) {
    category = 'api'; event_type = 'api_request';
  } else if (lowerMsg.includes('audit') || lowerMsg.includes('review completed')) {
    category = 'audit_lab'; event_type = 'audit_review';
  }

  // Extract latency if present
  const latencyMatch = message.match(/\((\d+)ms\)/);
  const duration_ms = latencyMatch ? parseInt(latencyMatch[1]) : 0;

  // Extract model info if present
  const modelMatch = message.match(/\[([^\]]+?)\/([^\]]+?)\]/);
  const provider = modelMatch ? modelMatch[1] : '';
  const model = modelMatch ? modelMatch[2] : '';

  try {
    activityLog({
      level: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
      category,
      event_type,
      message,
      details: sanitized ? { raw: sanitized } : {},
      success: type !== 'error',
      duration_ms,
      provider,
      model,
    });
  } catch {}
}

router.get('/', (req, res) => {
  const db = getDb();
  const limit = parseInt(req.query.limit) || 100;
  const type = req.query.type;
  const logs = type
    ? db.prepare('SELECT * FROM logs WHERE type = ? ORDER BY created_at DESC LIMIT ?').all(type, limit)
    : db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').all(limit);
  const stats = {
    total: db.prepare('SELECT COUNT(*) as c FROM logs').get().c,
    errors: db.prepare("SELECT COUNT(*) as c FROM logs WHERE type = 'error'").get().c,
    warnings: db.prepare("SELECT COUNT(*) as c FROM logs WHERE type = 'warning'").get().c,
  };
  res.json({ logs, stats });
});

router.post('/clear', (req, res) => {
  getDb().prepare('DELETE FROM logs').run();
  res.json({ ok: true });
});

export default router;
