import { Router } from 'express';
import { getDb } from '../database/init.js';

const router = Router();

export function addLog(type, message, details = '') {
  const safe = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
  const sanitized = safe.replace(/AIza[A-Za-z0-9_-]{30,}/g, '****REDACTED****');
  try { getDb().prepare('INSERT INTO logs (type, message, details) VALUES (?, ?, ?)').run(type, message, sanitized); } catch {}
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
