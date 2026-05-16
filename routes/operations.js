// routes/operations.js — SOP engine: library, instances, automations, audit, AI
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../database/init.js';
import { getActiveProvider } from '../providers/index.js';
import { logInfo } from '../services/logger.js';

const router = Router();

function parseJSON(s, fallback) { try { return JSON.parse(s); } catch { return fallback; } }

function recordAudit(db, { kind, actor, entity_kind, entity_id, summary, details }) {
  try {
    db.prepare(`INSERT INTO audit_events (id, kind, actor, entity_kind, entity_id, summary, details) VALUES (?,?,?,?,?,?,?)`)
      .run(uuid(), kind, actor || '', entity_kind || '', entity_id || '', summary, JSON.stringify(details || {}));
  } catch {}
}

// ══════════════════════════════════════════════════════════════
//  SOP LIBRARY
// ══════════════════════════════════════════════════════════════

router.get('/sops', (req, res) => {
  const db = getDb();
  const { category, q } = req.query;
  let sql = 'SELECT * FROM sops WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  if (q) { sql += ' AND (title LIKE ? OR description LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  sql += ' ORDER BY category, title';
  const sops = db.prepare(sql).all(...params).map(s => ({ ...s, tags: parseJSON(s.tags, []) }));
  res.json({ sops, total: sops.length });
});

router.get('/sops/:slug', (req, res) => {
  const db = getDb();
  const sop = db.prepare('SELECT * FROM sops WHERE slug = ? OR id = ?').get(req.params.slug, req.params.slug);
  if (!sop) return res.status(404).json({ error: 'SOP not found' });
  const steps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY position').all(sop.id).map(st => ({ ...st, checklist: parseJSON(st.checklist, []) }));
  res.json({ ...sop, tags: parseJSON(sop.tags, []), steps });
});

router.post('/sops', (req, res) => {
  const { title, category, description, default_owner, estimated_duration, tags, steps } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  const db = getDb();
  const slug = (req.body.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
  if (db.prepare('SELECT id FROM sops WHERE slug = ?').get(slug)) {
    return res.status(409).json({ error: 'A SOP with this slug already exists' });
  }

  const id = uuid();
  db.prepare(`INSERT INTO sops (id, title, slug, category, description, default_owner, estimated_duration, tags) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, title, slug, category || 'general', description || '', default_owner || '', estimated_duration || '', JSON.stringify(tags || []));

  (steps || []).forEach((step, idx) => {
    db.prepare(`INSERT INTO sop_steps (id, sop_id, position, title, description, owner, due_offset_days, checklist) VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(), id, idx + 1, step.title || `Step ${idx + 1}`, step.description || '', step.owner || '', step.due_offset_days || 0, JSON.stringify(step.checklist || []));
  });

  recordAudit(db, { kind: 'sop.created', summary: `SOP created: ${title}`, entity_kind: 'sop', entity_id: id });
  res.json({ id, slug });
});

router.patch('/sops/:id', (req, res) => {
  const db = getDb();
  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
  if (!sop) return res.status(404).json({ error: 'SOP not found' });

  const allowed = ['title', 'category', 'description', 'default_owner', 'estimated_duration', 'published'];
  const updates = []; const params = [];
  for (const k of allowed) if (req.body[k] !== undefined) { updates.push(`${k} = ?`); params.push(req.body[k]); }
  if (req.body.tags) { updates.push('tags = ?'); params.push(JSON.stringify(req.body.tags)); }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  updates.push(`updated_at = datetime('now')`, `version = version + 1`);
  params.push(sop.id);
  db.prepare(`UPDATE sops SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  recordAudit(db, { kind: 'sop.updated', summary: `SOP updated: ${sop.title}`, entity_kind: 'sop', entity_id: sop.id });
  res.json({ success: true });
});

router.delete('/sops/:id', (req, res) => {
  const db = getDb();
  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(req.params.id);
  if (!sop) return res.status(404).json({ error: 'SOP not found' });
  db.prepare('DELETE FROM sop_steps WHERE sop_id = ?').run(sop.id);
  db.prepare('DELETE FROM sops WHERE id = ?').run(sop.id);
  recordAudit(db, { kind: 'sop.deleted', summary: `SOP deleted: ${sop.title}`, entity_kind: 'sop', entity_id: sop.id });
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
//  AI SOP GENERATOR
// ══════════════════════════════════════════════════════════════

router.post('/sops/ai-generate', async (req, res) => {
  const { topic, context } = req.body;
  if (!topic) return res.status(400).json({ error: 'topic required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        category: { type: 'string' },
        description: { type: 'string' },
        default_owner: { type: 'string', enum: ['anes', 'denis', 'either'] },
        estimated_duration: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              owner: { type: 'string', enum: ['anes', 'denis', ''] },
              due_offset_days: { type: 'number' },
              checklist: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'checklist'],
          },
        },
      },
      required: ['title', 'steps'],
    };

    const prompt = `Generate a Standard Operating Procedure (SOP) for Cloz Digital, a premium web design agency in Bosnia.

Topic: ${topic}
${context ? `Context: ${context}` : ''}

Team:
- Anes — backend, system architecture, UI/UX, automation, product
- Denis — SEO, content, outreach, email responses, campaigns, marketing

Generate 5-10 actionable steps with concrete checklists per step. Assign each step to anes, denis, or leave blank for "either". Add realistic due_offset_days (calendar days from kickoff).

Be specific, not generic.`;

    const result = await provider.generateStructured(prompt, schema, {
      temperature: 0.4, maxTokens: 3000, task: 'content-generate',
    });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/sops/ai-improve', async (req, res) => {
  const { slug } = req.body;
  const db = getDb();
  const sop = db.prepare('SELECT * FROM sops WHERE slug = ?').get(slug);
  if (!sop) return res.status(404).json({ error: 'SOP not found' });
  const steps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY position').all(sop.id);

  try {
    const provider = getActiveProvider();
    const stepSummary = steps.map((s, i) => `${i + 1}. ${s.title} (owner: ${s.owner || '—'})`).join('\n');
    const prompt = `Review this SOP and suggest specific improvements.

SOP: ${sop.title}
Category: ${sop.category}
Description: ${sop.description}

Current steps:
${stepSummary}

Provide:
1. Missing steps (if any)
2. Redundancies to remove
3. Clearer owner assignments
4. Automation opportunities
5. Bottleneck warnings

Be specific and actionable.`;
    const result = await provider.generate(prompt, { temperature: 0.5, maxTokens: 1500, task: 'content-generate' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════════════════
//  INSTANCES — Running workflows
// ══════════════════════════════════════════════════════════════

router.get('/instances', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT * FROM sop_instances WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY started_at DESC LIMIT 200';
  const rows = db.prepare(sql).all(...params);
  res.json({ instances: rows });
});

router.post('/instances', (req, res) => {
  const { sop_id, sop_slug, reference_kind, reference_id, reference_label, assignee, due_at } = req.body;
  const db = getDb();
  const sop = sop_id
    ? db.prepare('SELECT * FROM sops WHERE id = ?').get(sop_id)
    : db.prepare('SELECT * FROM sops WHERE slug = ?').get(sop_slug);
  if (!sop) return res.status(404).json({ error: 'SOP not found' });

  const id = uuid();
  db.prepare(`INSERT INTO sop_instances (id, sop_id, sop_title, reference_kind, reference_id, reference_label, assignee, due_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, sop.id, sop.title, reference_kind || '', reference_id || '', reference_label || '', assignee || sop.default_owner || '', due_at || '');

  const steps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY position').all(sop.id);
  steps.forEach(s => {
    db.prepare(`INSERT INTO sop_instance_steps (id, instance_id, step_id, position, title, owner) VALUES (?,?,?,?,?,?)`)
      .run(uuid(), id, s.id, s.position, s.title, s.owner || sop.default_owner || '');
  });

  recordAudit(db, { kind: 'instance.started', summary: `Started: ${sop.title}`, entity_kind: 'instance', entity_id: id });
  res.json({ id });
});

router.get('/instances/:id', (req, res) => {
  const db = getDb();
  const inst = db.prepare('SELECT * FROM sop_instances WHERE id = ?').get(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Instance not found' });
  const steps = db.prepare('SELECT * FROM sop_instance_steps WHERE instance_id = ? ORDER BY position').all(inst.id)
    .map(s => ({ ...s, checklist_state: parseJSON(s.checklist_state, []) }));
  // Also pull source-step checklists for display
  const sourceSteps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY position').all(inst.sop_id);
  const sourceMap = Object.fromEntries(sourceSteps.map(s => [s.id, parseJSON(s.checklist, [])]));
  const enriched = steps.map(s => ({ ...s, checklist: sourceMap[s.step_id] || [] }));
  res.json({ instance: inst, steps: enriched });
});

router.patch('/instance-steps/:id', (req, res) => {
  const { status, notes, checklist_state, completed_by } = req.body;
  const db = getDb();
  const step = db.prepare('SELECT * FROM sop_instance_steps WHERE id = ?').get(req.params.id);
  if (!step) return res.status(404).json({ error: 'Step not found' });

  const updates = []; const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  if (checklist_state) { updates.push('checklist_state = ?'); params.push(JSON.stringify(checklist_state)); }
  if (status === 'done') {
    updates.push(`completed_at = datetime('now')`, 'completed_by = ?');
    params.push(completed_by || '');
  }
  params.push(step.id);
  db.prepare(`UPDATE sop_instance_steps SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  // Recompute instance progress
  const all = db.prepare('SELECT status FROM sop_instance_steps WHERE instance_id = ?').all(step.instance_id);
  const done = all.filter(s => s.status === 'done').length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const newStatus = pct === 100 ? 'completed' : 'in_progress';
  db.prepare(`UPDATE sop_instances SET progress_pct = ?, status = ?, completed_at = CASE WHEN ? = 100 THEN datetime('now') ELSE '' END WHERE id = ?`)
    .run(pct, newStatus, pct, step.instance_id);
  res.json({ progress_pct: pct, status: newStatus });
});

router.post('/instances/:id/complete', (req, res) => {
  const db = getDb();
  db.prepare(`UPDATE sop_instances SET status = 'completed', progress_pct = 100, completed_at = datetime('now') WHERE id = ?`).run(req.params.id);
  recordAudit(db, { kind: 'instance.completed', summary: 'Workflow marked complete', entity_kind: 'instance', entity_id: req.params.id });
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
//  AUTOMATIONS
// ══════════════════════════════════════════════════════════════

const TRIGGER_EVENTS = [
  'proposal.accepted', 'invoice.overdue', 'lead.qualified', 'domain.expiring',
  'ssl.expiring', 'ticket.critical', 'inquiry.received', 'maintenance.due',
];

router.get('/automations', (_req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM sop_automations ORDER BY created_at DESC').all();
  res.json({ automations: rows, trigger_events: TRIGGER_EVENTS });
});

router.post('/automations', (req, res) => {
  const { name, trigger_event, sop_id, conditions, enabled } = req.body;
  if (!name || !trigger_event || !sop_id) return res.status(400).json({ error: 'name, trigger_event, sop_id required' });
  if (!TRIGGER_EVENTS.includes(trigger_event)) return res.status(400).json({ error: `Invalid trigger. Allowed: ${TRIGGER_EVENTS.join(', ')}` });

  const db = getDb();
  const sop = db.prepare('SELECT id FROM sops WHERE id = ? OR slug = ?').get(sop_id, sop_id);
  if (!sop) return res.status(404).json({ error: 'SOP not found' });

  const id = uuid();
  db.prepare(`INSERT INTO sop_automations (id, name, trigger_event, sop_id, conditions, enabled) VALUES (?,?,?,?,?,?)`)
    .run(id, name, trigger_event, sop.id, JSON.stringify(conditions || {}), enabled === false ? 0 : 1);
  res.json({ id });
});

router.patch('/automations/:id', (req, res) => {
  const { enabled } = req.body;
  const db = getDb();
  db.prepare('UPDATE sop_automations SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.params.id);
  res.json({ success: true });
});

router.delete('/automations/:id', (req, res) => {
  getDb().prepare('DELETE FROM sop_automations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Fire an automation (used by other parts of the system, or admin testing)
router.post('/automations/fire', (req, res) => {
  const { event, reference } = req.body;
  const db = getDb();
  const matches = db.prepare('SELECT * FROM sop_automations WHERE trigger_event = ? AND enabled = 1').all(event || '');
  const fired = [];
  for (const a of matches) {
    const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(a.sop_id);
    if (!sop) continue;
    const id = uuid();
    db.prepare(`INSERT INTO sop_instances (id, sop_id, sop_title, reference_kind, reference_id, reference_label, assignee) VALUES (?,?,?,?,?,?,?)`)
      .run(id, sop.id, sop.title, reference?.kind || event, reference?.id || '', reference?.label || '', sop.default_owner || '');
    const steps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY position').all(sop.id);
    steps.forEach(s => db.prepare(`INSERT INTO sop_instance_steps (id, instance_id, step_id, position, title, owner) VALUES (?,?,?,?,?,?)`)
      .run(uuid(), id, s.id, s.position, s.title, s.owner || sop.default_owner || ''));
    db.prepare('UPDATE sop_automations SET times_triggered = times_triggered + 1, last_triggered_at = datetime(\'now\') WHERE id = ?').run(a.id);
    fired.push({ instance_id: id, sop: sop.title });
    recordAudit(db, { kind: 'automation.fired', summary: `Automation fired: ${a.name}`, entity_kind: 'instance', entity_id: id, details: { event, reference } });
    logInfo(`Automation fired: ${a.name} -> ${sop.title}`, { category: 'job', event_type: 'automation' });
  }
  res.json({ fired });
});

// ══════════════════════════════════════════════════════════════
//  DASHBOARD + AUDIT
// ══════════════════════════════════════════════════════════════

router.get('/dashboard', (_req, res) => {
  const db = getDb();
  const counts = {
    sops: db.prepare('SELECT COUNT(*) as c FROM sops').get()?.c || 0,
    active_instances: db.prepare("SELECT COUNT(*) as c FROM sop_instances WHERE status = 'in_progress'").get()?.c || 0,
    completed_instances: db.prepare("SELECT COUNT(*) as c FROM sop_instances WHERE status = 'completed'").get()?.c || 0,
    automations: db.prepare('SELECT COUNT(*) as c FROM sop_automations WHERE enabled = 1').get()?.c || 0,
  };
  const recent_instances = db.prepare('SELECT * FROM sop_instances ORDER BY started_at DESC LIMIT 10').all();
  const recent_audit = db.prepare(`SELECT * FROM audit_events WHERE kind LIKE 'sop.%' OR kind LIKE 'instance.%' OR kind LIKE 'automation.%' ORDER BY created_at DESC LIMIT 15`).all();
  res.json({ counts, recent_instances, recent_audit });
});

router.get('/audit', (req, res) => {
  const db = getDb();
  const { kind, limit = 100 } = req.query;
  let sql = 'SELECT * FROM audit_events WHERE 1=1';
  const params = [];
  if (kind) { sql += ' AND kind LIKE ?'; params.push(`${kind}%`); }
  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(Math.min(parseInt(limit) || 100, 500));
  const rows = db.prepare(sql).all(...params).map(r => ({ ...r, details: parseJSON(r.details, {}) }));
  res.json({ events: rows });
});

// AI insights for operations
router.post('/insights', async (req, res) => {
  try {
    const db = getDb();
    const active = db.prepare(`SELECT sop_title, status, progress_pct, started_at, assignee FROM sop_instances WHERE status = 'in_progress' ORDER BY started_at`).all();
    const recentDone = db.prepare(`SELECT sop_title, completed_at FROM sop_instances WHERE status = 'completed' AND completed_at > datetime('now', '-30 days') ORDER BY completed_at DESC LIMIT 20`).all();
    const automations = db.prepare(`SELECT name, trigger_event, times_triggered FROM sop_automations WHERE enabled = 1`).all();

    const prompt = `You are the operations advisor for Cloz Digital. Review the current state and provide actionable insights.

Active workflows: ${active.length}
${active.slice(0, 10).map(a => `- ${a.sop_title} (${a.progress_pct}% by ${a.assignee || 'unassigned'})`).join('\n') || '(none)'}

Completed in last 30 days: ${recentDone.length}
${recentDone.slice(0, 10).map(r => `- ${r.sop_title}`).join('\n') || '(none)'}

Active automations: ${automations.length}
${automations.map(a => `- ${a.name} (${a.trigger_event}, fired ${a.times_triggered}x)`).join('\n') || '(none)'}

Provide:
1. Bottlenecks — workflows stuck or slow
2. Priority recommendations for the next 7 days
3. Automation opportunities not yet wired up
4. SOPs we should consider documenting

Be concrete and Bosnia/Cloz-specific.`;

    const provider = getActiveProvider();
    const result = await provider.generate(prompt, { temperature: 0.4, maxTokens: 1500, task: 'dashboard-briefing' });
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
