import { Router } from 'express';
import { getDb } from '../database/init.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM features ORDER BY key').all());
});

router.post('/', (req, res) => {
  const db = getDb();
  const stmt = db.prepare(`UPDATE features SET enabled = ?, updated_at = datetime('now') WHERE key = ?`);
  const tx = db.transaction(() => {
    for (const [key, enabled] of Object.entries(req.body)) {
      stmt.run(enabled ? 1 : 0, key);
    }
  });
  tx();
  res.json({ ok: true, features: db.prepare('SELECT * FROM features ORDER BY key').all() });
});

router.put('/:key', (req, res) => {
  const { enabled } = req.body;
  if (enabled === undefined) return res.status(400).json({ error: 'enabled required' });
  getDb().prepare(`UPDATE features SET enabled = ?, updated_at = datetime('now') WHERE key = ?`).run(enabled ? 1 : 0, req.params.key);
  res.json(getDb().prepare('SELECT * FROM features WHERE key = ?').get(req.params.key));
});

router.get('/export', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM features ORDER BY key').all());
});

router.post('/import', (req, res) => {
  const { features } = req.body;
  if (!Array.isArray(features)) return res.status(400).json({ error: 'Expected { features: [...] }' });
  const db = getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO features (key, enabled, updated_at) VALUES (?, ?, datetime('now'))`);
  const tx = db.transaction(() => { for (const f of features) stmt.run(f.key, f.enabled ? 1 : 0); });
  tx();
  res.json({ ok: true, count: features.length });
});

export default router;
