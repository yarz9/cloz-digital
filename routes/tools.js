import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../database/init.js';

const router = Router();

const parse = (t) => ({ ...t, parameters: JSON.parse(t.parameters || '{}'), enabled: !!t.enabled });

router.get('/', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM tools ORDER BY name').all().map(parse));
});

router.post('/', (req, res) => {
  const { name, description, parameters } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = uuid();
  getDb().prepare('INSERT INTO tools (id, name, description, parameters) VALUES (?, ?, ?, ?)')
    .run(id, name, description || '', JSON.stringify(parameters || {}));
  res.json(parse(getDb().prepare('SELECT * FROM tools WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, description, parameters, enabled } = req.body;
  db.prepare(`UPDATE tools SET name=?, description=?, parameters=?, enabled=?, updated_at=datetime('now') WHERE id=?`)
    .run(name ?? existing.name, description ?? existing.description, JSON.stringify(parameters ?? JSON.parse(existing.parameters)), (enabled ?? existing.enabled) ? 1 : 0, req.params.id);
  res.json(parse(db.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM tools WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
