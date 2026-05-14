import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../database/init.js';

const router = Router();

const parse = (s) => ({ ...s, schema: JSON.parse(s.schema || '{}') });

router.get('/', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM schemas ORDER BY category, name').all().map(parse));
});

router.post('/', (req, res) => {
  const { name, category, schema, description } = req.body;
  if (!name || !schema) return res.status(400).json({ error: 'name and schema required' });
  const id = uuid();
  getDb().prepare('INSERT INTO schemas (id, name, category, schema, description) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, category || 'general', JSON.stringify(schema), description || '');
  res.json(parse(getDb().prepare('SELECT * FROM schemas WHERE id = ?').get(id)));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM schemas WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name, category, schema, description } = req.body;
  db.prepare(`UPDATE schemas SET name=?, category=?, schema=?, description=?, updated_at=datetime('now') WHERE id=?`)
    .run(name ?? existing.name, category ?? existing.category, JSON.stringify(schema ?? JSON.parse(existing.schema)), description ?? existing.description, req.params.id);
  res.json(parse(db.prepare('SELECT * FROM schemas WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM schemas WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
