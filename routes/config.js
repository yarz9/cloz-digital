import { Router } from 'express';
import { getDb } from '../database/init.js';
import { getActiveProvider, listProviders } from '../providers/index.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all();
  const config = rows.reduce((o, r) => { o[r.key] = r.value; return o; }, {});
  const provider = getActiveProvider();
  res.json({
    config,
    activeProvider: {
      name: provider.name,
      hasKey: provider.hasApiKey(),
      maskedKey: provider.getMaskedKey(),
      keySource: provider.getKeySource(),
      models: provider.getModels(),
    },
    providers: listProviders(),
  });
});

router.post('/', (req, res) => {
  const db = getDb();
  const allowed = ['provider', 'model', 'temperature', 'maxTokens', 'timeout', 'retries'];
  const stmt = db.prepare(`INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);
  let count = 0;
  for (const key of allowed) {
    if (req.body[key] !== undefined) { stmt.run(key, String(req.body[key])); count++; }
  }
  if (!count) return res.status(400).json({ error: 'No valid fields' });
  const config = db.prepare('SELECT key, value FROM config').all().reduce((o, r) => { o[r.key] = r.value; return o; }, {});
  res.json({ ok: true, config });
});

export default router;
