import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../database/init.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { category } = req.query;
  const prompts = category
    ? db.prepare('SELECT * FROM prompts WHERE category = ? ORDER BY title').all(category)
    : db.prepare('SELECT * FROM prompts ORDER BY category, title').all();
  res.json(prompts);
});

router.get('/export', (req, res) => {
  res.json(getDb().prepare('SELECT * FROM prompts ORDER BY category, title').all());
});

router.post('/import', (req, res) => {
  const { prompts } = req.body;
  if (!Array.isArray(prompts)) return res.status(400).json({ error: 'Expected { prompts: [...] }' });
  const db = getDb();
  const stmt = db.prepare(`INSERT OR REPLACE INTO prompts (id, title, slug, category, body, description, active, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`);
  const tx = db.transaction(() => {
    for (const p of prompts) stmt.run(p.id || uuid(), p.title, p.slug, p.category, p.body, p.description || '', p.active ?? 1);
  });
  tx();
  res.json({ ok: true, count: prompts.length });
});

router.post('/', (req, res) => {
  const { title, slug, category, body, description } = req.body;
  if (!title || !slug || !body) return res.status(400).json({ error: 'title, slug, body required' });
  const id = uuid();
  getDb().prepare('INSERT INTO prompts (id, title, slug, category, body, description) VALUES (?, ?, ?, ?, ?, ?)').run(id, title, slug, category || 'general', body, description || '');
  res.json(getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id));
});

router.put('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { title, slug, category, body, description, active } = req.body;
  db.prepare(`UPDATE prompts SET title=?, slug=?, category=?, body=?, description=?, active=?, updated_at=datetime('now') WHERE id=?`)
    .run(title ?? existing.title, slug ?? existing.slug, category ?? existing.category, body ?? existing.body, description ?? existing.description, active ?? existing.active, req.params.id);
  res.json(db.prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM prompts WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

router.post('/:id/duplicate', (req, res) => {
  const orig = getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(req.params.id);
  if (!orig) return res.status(404).json({ error: 'Not found' });
  const id = uuid();
  getDb().prepare('INSERT INTO prompts (id, title, slug, category, body, description) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, orig.title + ' (copy)', orig.slug + '-' + Date.now(), orig.category, orig.body, orig.description);
  res.json(getDb().prepare('SELECT * FROM prompts WHERE id = ?').get(id));
});

export default router;
