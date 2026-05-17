// routes/serviceDesk.js — Unified Service Desk over portal_tickets,
// portal_messages, portal_assets (recent uploads), and portal_approvals.
//
// Endpoints:
//   GET    /requests                      Unified feed with filters
//   GET    /metrics                       Counts per tab (inbox/open/urgent/etc.)
//   GET    /requests/:type/:id            Detail (with messages, notes, client)
//   POST   /requests/:type/:id/reply      Reply (portal + optional email)
//   POST   /requests/:type/:id/notes      Add internal note
//   GET    /requests/:type/:id/notes      List internal notes
//   PATCH  /requests/:type/:id            Assign / status / priority / escalate / SLA / tags
//   POST   /requests/:type/:id/merge      Merge into another request
//   POST   /requests/:type/:id/convert    Convert into task | sop | invoice | proposal
//   POST   /requests/:type/:id/ai         AI: summary | suggest_reply | urgency | assignee | effort | upsell | checklist
//   GET    /tasks                         List service-desk tasks
//   PATCH  /tasks/:id                     Update task
//   POST   /sla-check                     Re-evaluate SLA + escalate (cron-style)

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../database/init.js';
import { getActiveProvider } from '../providers/index.js';
import { sendViaResend, isResendConfigured } from '../services/mailService.js';
import { logInfo, logError } from '../services/logger.js';
import { buildUrl } from '../config/urls.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────
function parseJSON(s, fb) { if (!s) return fb; try { return JSON.parse(s); } catch { return fb; } }
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function recordPortalActivity(db, clientId, kind, message) {
  try {
    db.prepare(`INSERT INTO portal_activity (id, client_id, kind, message) VALUES (?,?,?,?)`)
      .run(uuid(), clientId, kind, message);
  } catch {}
}

// Standard priority → SLA hours (target first response)
const SLA_HOURS = { urgent: 2, high: 8, medium: 24, low: 72 };

function computeSlaDue(createdAtIso, priority) {
  const h = SLA_HOURS[priority] ?? 24;
  const d = createdAtIso ? new Date(createdAtIso) : new Date();
  return new Date(d.getTime() + h * 3600 * 1000).toISOString();
}

// Normalize any source row into a unified "request" envelope
function normalizeTicket(row, client) {
  const tags = parseJSON(row.tags, []);
  const isOverdue = row.sla_due_at && new Date(row.sla_due_at) < new Date() && !['closed','resolved'].includes(row.status);
  return {
    type: 'ticket',
    id: row.id,
    client_id: row.client_id,
    client_name: client?.business_name || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.email || '',
    subject: row.subject,
    body: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    assignee: row.assignee_name || '',
    assignee_email: row.assignee_email || '',
    sla_due_at: row.sla_due_at || '',
    escalated: !!row.escalated,
    overdue: !!isOverdue,
    satisfaction_rating: row.satisfaction_rating || 0,
    ai_summary: row.ai_summary || '',
    effort_estimate: row.effort_estimate || '',
    merged_into: row.merged_into || '',
    tags,
    attachments: parseJSON(row.attachments, []),
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed_at: row.closed_at || '',
    source: row.source || 'portal',
  };
}
function normalizeMessage(row, client) {
  return {
    type: 'message',
    id: row.id,
    client_id: row.client_id,
    client_name: client?.business_name || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.email || '',
    subject: row.subject || `Message from ${client?.business_name || 'client'}`,
    body: row.body,
    category: 'general',
    priority: 'medium',
    status: row.handled ? 'completed' : 'open',
    assignee: row.handled_by || '',
    sla_due_at: '',
    escalated: false,
    overdue: false,
    satisfaction_rating: 0,
    ai_summary: '',
    tags: [],
    attachments: [],
    created_at: row.created_at,
    updated_at: row.created_at,
    source: 'message',
  };
}
function normalizeApproval(row, client) {
  return {
    type: 'approval',
    id: row.id,
    client_id: row.client_id,
    client_name: client?.business_name || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.email || '',
    subject: `Approval needed: ${row.title}`,
    body: row.notes || '',
    category: row.kind || 'approval',
    priority: 'high',
    status: row.status === 'pending' ? 'awaiting_client' : 'completed',
    assignee: '',
    sla_due_at: '',
    escalated: false,
    overdue: false,
    satisfaction_rating: 0,
    ai_summary: '',
    tags: [],
    attachments: row.preview_url ? [{ url: row.preview_url, name: 'Preview' }] : [],
    created_at: row.created_at,
    updated_at: row.decided_at || row.created_at,
    source: 'approval',
  };
}
function normalizeAsset(row, client) {
  return {
    type: 'asset',
    id: row.id,
    client_id: row.client_id,
    client_name: client?.business_name || '',
    contact_name: client?.contact_name || '',
    contact_email: client?.email || '',
    subject: `Asset uploaded: ${row.name}`,
    body: row.description || '',
    category: 'asset_upload',
    priority: 'low',
    status: 'open',
    assignee: '',
    sla_due_at: '',
    escalated: false,
    overdue: false,
    satisfaction_rating: 0,
    ai_summary: '',
    tags: row.folder ? [row.folder] : [],
    attachments: row.url ? [{ url: row.url, name: row.name, type: row.type }] : [],
    created_at: row.created_at,
    updated_at: row.created_at,
    source: 'asset',
  };
}

function loadAllRequests(db, { sinceDays = 90 } = {}) {
  const clients = db.prepare(`SELECT * FROM portal_clients`).all();
  const clientById = Object.fromEntries(clients.map(c => [c.id, c]));

  const tickets   = db.prepare(`SELECT * FROM portal_tickets WHERE merged_into = '' OR merged_into IS NULL ORDER BY updated_at DESC`).all();
  const messages  = db.prepare(`SELECT * FROM portal_messages WHERE author = 'client' ORDER BY created_at DESC LIMIT 500`).all();
  const approvals = db.prepare(`SELECT * FROM portal_approvals ORDER BY created_at DESC LIMIT 500`).all();
  const assets    = db.prepare(`SELECT * FROM portal_assets WHERE uploaded_by = 'client' ORDER BY created_at DESC LIMIT 500`).all();

  const all = [
    ...tickets.map(t => normalizeTicket(t, clientById[t.client_id])),
    ...messages.map(m => normalizeMessage(m, clientById[m.client_id])),
    ...approvals.map(a => normalizeApproval(a, clientById[a.client_id])),
    ...assets.map(a => normalizeAsset(a, clientById[a.client_id])),
  ];
  if (sinceDays > 0) {
    const cutoff = new Date(Date.now() - sinceDays * 86400000);
    return all.filter(r => new Date(r.updated_at || r.created_at) >= cutoff);
  }
  return all;
}

// ── GET /requests ────────────────────────────────────────────────
router.get('/requests', (req, res) => {
  try {
    const db = getDb();
    const all = loadAllRequests(db, { sinceDays: parseInt(req.query.sinceDays) || 90 });
    const { tab, assignee, priority, category, status, q, client_id } = req.query;

    let rows = all;
    if (tab === 'inbox')           rows = rows.filter(r => r.status === 'open' && !r.assignee);
    else if (tab === 'open')       rows = rows.filter(r => ['open','in_progress'].includes(r.status));
    else if (tab === 'awaiting')   rows = rows.filter(r => r.status === 'awaiting_client');
    else if (tab === 'in_progress')rows = rows.filter(r => r.status === 'in_progress');
    else if (tab === 'completed')  rows = rows.filter(r => ['completed','closed','resolved'].includes(r.status));
    else if (tab === 'urgent')     rows = rows.filter(r => r.priority === 'urgent' || r.escalated || r.overdue);
    else if (tab === 'mine' && assignee) rows = rows.filter(r => (r.assignee || '').toLowerCase() === assignee.toLowerCase());

    if (assignee && tab !== 'mine') rows = rows.filter(r => (r.assignee || '').toLowerCase() === assignee.toLowerCase());
    if (priority) rows = rows.filter(r => r.priority === priority);
    if (category) rows = rows.filter(r => r.category === category);
    if (status)   rows = rows.filter(r => r.status === status);
    if (client_id) rows = rows.filter(r => r.client_id === client_id);
    if (q) {
      const term = q.toLowerCase();
      rows = rows.filter(r =>
        (r.subject || '').toLowerCase().includes(term) ||
        (r.body || '').toLowerCase().includes(term) ||
        (r.client_name || '').toLowerCase().includes(term)
      );
    }
    rows.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    res.json({ requests: rows.slice(0, 500), total: rows.length });
  } catch (e) {
    logError(`Service Desk list failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ── GET /metrics ─────────────────────────────────────────────────
router.get('/metrics', (_req, res) => {
  try {
    const db = getDb();
    const all = loadAllRequests(db);
    const m = {
      inbox: all.filter(r => r.status === 'open' && !r.assignee).length,
      open: all.filter(r => ['open','in_progress'].includes(r.status)).length,
      awaiting: all.filter(r => r.status === 'awaiting_client').length,
      in_progress: all.filter(r => r.status === 'in_progress').length,
      completed: all.filter(r => ['completed','closed','resolved'].includes(r.status)).length,
      urgent: all.filter(r => r.priority === 'urgent' || r.escalated || r.overdue).length,
      total: all.length,
      by_assignee: {},
      by_category: {},
      avg_satisfaction: 0,
      overdue: all.filter(r => r.overdue).length,
    };
    let rTotal = 0, rCount = 0;
    for (const r of all) {
      if (r.assignee) m.by_assignee[r.assignee] = (m.by_assignee[r.assignee] || 0) + 1;
      m.by_category[r.category] = (m.by_category[r.category] || 0) + 1;
      if (r.satisfaction_rating) { rTotal += r.satisfaction_rating; rCount++; }
    }
    m.avg_satisfaction = rCount ? +(rTotal / rCount).toFixed(2) : 0;
    res.json(m);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /requests/:type/:id ──────────────────────────────────────
router.get('/requests/:type/:id', (req, res) => {
  try {
    const db = getDb();
    const { type, id } = req.params;
    let request, messages = [], client = null;

    if (type === 'ticket') {
      const row = db.prepare(`SELECT * FROM portal_tickets WHERE id = ?`).get(id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(row.client_id);
      messages = db.prepare(`SELECT * FROM portal_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`).all(id);
      request = normalizeTicket(row, client);
      // mark seen
      try { db.prepare(`UPDATE portal_tickets SET last_admin_view_at = datetime('now') WHERE id = ?`).run(id); } catch {}
    } else if (type === 'message') {
      const row = db.prepare(`SELECT * FROM portal_messages WHERE id = ?`).get(id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(row.client_id);
      // Pull the full message thread for this client
      messages = db.prepare(`SELECT * FROM portal_messages WHERE client_id = ? ORDER BY created_at ASC`).all(row.client_id);
      request = normalizeMessage(row, client);
    } else if (type === 'approval') {
      const row = db.prepare(`SELECT * FROM portal_approvals WHERE id = ?`).get(id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(row.client_id);
      request = normalizeApproval(row, client);
    } else if (type === 'asset') {
      const row = db.prepare(`SELECT * FROM portal_assets WHERE id = ?`).get(id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(row.client_id);
      request = normalizeAsset(row, client);
    } else {
      return res.status(400).json({ error: 'Unknown request type' });
    }

    const notes = db.prepare(`SELECT * FROM service_desk_notes WHERE request_type = ? AND request_id = ? ORDER BY created_at ASC`).all(type, id);
    const tasks = db.prepare(`SELECT * FROM service_desk_tasks WHERE source_request_type = ? AND source_request_id = ? ORDER BY created_at DESC`).all(type, id);

    // Expanded client profile fields
    const clientProfile = client ? {
      id: client.id,
      business_name: client.business_name,
      contact_name: client.contact_name,
      email: client.email,
      phone: client.phone,
      industry: client.industry,
      niche: client.niche || '',
      website: client.website,
      package: client.package,
      account_manager: client.account_manager || '',
      priority_level: client.priority_level || 'standard',
      goals: client.goals || '',
      requested_services: parseJSON(client.requested_services, []),
      business_challenges: client.business_challenges || '',
      discovery_notes: client.discovery_notes || '',
      communication_preferences: client.communication_preferences || '',
      monthly_retainer: client.monthly_retainer || client.mrr || 0,
      mrr: client.mrr || 0,
    } : null;

    res.json({ request, messages, notes, tasks, client: clientProfile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /requests/:type/:id/reply ───────────────────────────────
router.post('/requests/:type/:id/reply', async (req, res) => {
  const { type, id } = req.params;
  const { body, author_name, status, send_email } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Body required' });
  const db = getDb();

  try {
    if (type === 'ticket') {
      const ticket = db.prepare(`SELECT * FROM portal_tickets WHERE id = ?`).get(id);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      const client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(ticket.client_id);

      db.prepare(`INSERT INTO portal_ticket_messages (id, ticket_id, author, author_name, body) VALUES (?,?,?,?,?)`)
        .run(uuid(), id, 'cloz', (author_name || 'Cloz Digital Team').slice(0, 200), body.slice(0, 8000));

      const newStatus = status || (ticket.status === 'open' ? 'awaiting_client' : ticket.status);
      const firstResponse = ticket.first_response_at ? '' : `, first_response_at = datetime('now')`;
      db.prepare(`UPDATE portal_tickets SET status = ?, updated_at = datetime('now')${firstResponse} WHERE id = ?`).run(newStatus, id);

      recordPortalActivity(db, ticket.client_id, 'ticket_reply', `Cloz Digital replied to ticket: ${ticket.subject.slice(0,80)}`);

      if (send_email && client && isResendConfigured()) {
        try {
          const portalLink = buildUrl(`/portal/support/${id}`);
          await sendViaResend({
            from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
            to: client.email,
            subject: `Re: ${ticket.subject}`,
            html: replyEmailHtml(client, ticket, body, author_name || 'Cloz Digital Team', portalLink),
            text: `Hi ${client.contact_name || client.business_name},\n\n${body}\n\nView the full thread: ${portalLink}\n\n— ${author_name || 'Cloz Digital'}`,
          });
        } catch (e) { logError(`Reply email failed: ${e.message}`); }
      }
      return res.json({ success: true, status: newStatus });
    }

    if (type === 'message') {
      const orig = db.prepare(`SELECT * FROM portal_messages WHERE id = ?`).get(id);
      if (!orig) return res.status(404).json({ error: 'Message not found' });
      const client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(orig.client_id);
      db.prepare(`INSERT INTO portal_messages (id, client_id, author, author_name, body) VALUES (?,?,?,?,?)`)
        .run(uuid(), orig.client_id, 'cloz', author_name || 'Cloz Digital Team', body.slice(0, 4000));
      db.prepare(`UPDATE portal_messages SET handled = 1, handled_at = datetime('now'), handled_by = ? WHERE id = ?`).run(author_name || 'Cloz', id);
      recordPortalActivity(db, orig.client_id, 'message_reply', 'Cloz Digital responded to your message');

      if (send_email && client && isResendConfigured()) {
        try {
          const portalLink = buildUrl(`/portal/messages`);
          await sendViaResend({
            from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
            to: client.email,
            subject: `New message from Cloz Digital`,
            html: replyEmailHtml(client, { subject: 'Your message' }, body, author_name || 'Cloz Digital', portalLink),
            text: `${body}\n\nView in portal: ${portalLink}`,
          });
        } catch (e) { logError(`Message email failed: ${e.message}`); }
      }
      return res.json({ success: true });
    }

    if (type === 'approval' || type === 'asset') {
      // Reply by sending the client a message in their portal thread
      const row = db.prepare(`SELECT * FROM ${type === 'approval' ? 'portal_approvals' : 'portal_assets'} WHERE id = ?`).get(id);
      if (!row) return res.status(404).json({ error: 'Not found' });
      const client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(row.client_id);
      db.prepare(`INSERT INTO portal_messages (id, client_id, author, author_name, body) VALUES (?,?,?,?,?)`)
        .run(uuid(), row.client_id, 'cloz', author_name || 'Cloz Digital', body.slice(0, 4000));
      recordPortalActivity(db, row.client_id, `${type}_reply`, `Reply re: ${row.title || row.name}`);
      if (send_email && client && isResendConfigured()) {
        try {
          await sendViaResend({
            from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
            to: client.email,
            subject: `Re: ${row.title || row.name}`,
            html: replyEmailHtml(client, { subject: row.title || row.name }, body, author_name || 'Cloz Digital', buildUrl('/portal')),
            text: body,
          });
        } catch (e) { logError(`${type} reply email failed: ${e.message}`); }
      }
      return res.json({ success: true });
    }
    res.status(400).json({ error: 'Unknown request type' });
  } catch (e) {
    logError(`Reply failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// ── Internal notes ───────────────────────────────────────────────
router.get('/requests/:type/:id/notes', (req, res) => {
  const db = getDb();
  const notes = db.prepare(`SELECT * FROM service_desk_notes WHERE request_type = ? AND request_id = ? ORDER BY created_at ASC`)
    .all(req.params.type, req.params.id);
  res.json({ notes });
});

router.post('/requests/:type/:id/notes', (req, res) => {
  const { body, author } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Body required' });
  const db = getDb();
  const id = uuid();
  db.prepare(`INSERT INTO service_desk_notes (id, request_type, request_id, author, body) VALUES (?,?,?,?,?)`)
    .run(id, req.params.type, req.params.id, author || '', body.slice(0, 4000));
  res.json({ id });
});

// ── PATCH /requests/:type/:id — assign/status/priority/escalate ──
router.patch('/requests/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const db = getDb();
  if (type !== 'ticket') {
    // For non-ticket types, only message handled-toggle is meaningful right now
    if (type === 'message' && req.body.status) {
      const handled = ['completed','closed','resolved'].includes(req.body.status) ? 1 : 0;
      db.prepare(`UPDATE portal_messages SET handled = ?, handled_at = CASE WHEN ?=1 THEN datetime('now') ELSE '' END WHERE id = ?`).run(handled, handled, id);
      return res.json({ success: true });
    }
    return res.json({ success: true, note: 'No-op for this request type' });
  }

  const ticket = db.prepare(`SELECT * FROM portal_tickets WHERE id = ?`).get(id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const sets = [], params = [];
  const map = {
    assignee_name: 'assignee_name',
    assignee_email: 'assignee_email',
    status: 'status',
    priority: 'priority',
    category: 'category',
    effort_estimate: 'effort_estimate',
    escalated: 'escalated',
    sla_due_at: 'sla_due_at',
    ai_summary: 'ai_summary',
  };
  for (const k of Object.keys(map)) {
    if (req.body[k] !== undefined) {
      sets.push(`${map[k]} = ?`);
      params.push(k === 'escalated' ? (req.body[k] ? 1 : 0) : req.body[k]);
    }
  }
  if (req.body.tags !== undefined) {
    sets.push('tags = ?');
    params.push(JSON.stringify(req.body.tags));
  }
  // Auto-compute SLA when priority changes and no override
  if (req.body.priority && req.body.sla_due_at === undefined) {
    sets.push('sla_due_at = ?');
    params.push(computeSlaDue(ticket.created_at, req.body.priority));
  }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });

  sets.push("updated_at = datetime('now')");
  params.push(id);
  db.prepare(`UPDATE portal_tickets SET ${sets.join(', ')} WHERE id = ?`).run(...params);

  // Record the change
  if (req.body.status) {
    const closing = ['closed','resolved','completed'].includes(req.body.status);
    if (closing) {
      db.prepare(`UPDATE portal_tickets SET closed_at = datetime('now') WHERE id = ?`).run(id);
      recordPortalActivity(db, ticket.client_id, 'ticket_closed', `Cloz Digital closed: ${ticket.subject.slice(0,80)}`);
    }
  }
  if (req.body.escalated) {
    recordPortalActivity(db, ticket.client_id, 'ticket_escalated', `Cloz Digital escalated: ${ticket.subject.slice(0,80)}`);
  }
  res.json({ success: true });
});

// ── POST /requests/:type/:id/merge ───────────────────────────────
router.post('/requests/:type/:id/merge', (req, res) => {
  const { type, id } = req.params;
  const { target_id } = req.body;
  if (type !== 'ticket') return res.status(400).json({ error: 'Only tickets can be merged' });
  if (!target_id) return res.status(400).json({ error: 'target_id required' });
  const db = getDb();

  const source = db.prepare(`SELECT * FROM portal_tickets WHERE id = ?`).get(id);
  const target = db.prepare(`SELECT * FROM portal_tickets WHERE id = ?`).get(target_id);
  if (!source || !target) return res.status(404).json({ error: 'Source or target not found' });

  // Move messages
  db.prepare(`UPDATE portal_ticket_messages SET ticket_id = ? WHERE ticket_id = ?`).run(target_id, id);
  // Add a system note on the target
  db.prepare(`INSERT INTO portal_ticket_messages (id, ticket_id, author, author_name, body) VALUES (?,?,?,?,?)`)
    .run(uuid(), target_id, 'cloz', 'System', `Merged from ticket "${source.subject}".`);
  // Mark source as merged + closed
  db.prepare(`UPDATE portal_tickets SET merged_into = ?, status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(target_id, id);

  res.json({ success: true });
});

// ── POST /requests/:type/:id/convert ─────────────────────────────
router.post('/requests/:type/:id/convert', async (req, res) => {
  const { type, id } = req.params;
  const { target, payload = {} } = req.body;
  if (!['task','sop','invoice','proposal'].includes(target)) {
    return res.status(400).json({ error: 'target must be task | sop | invoice | proposal' });
  }
  const db = getDb();

  // Fetch source for context
  let client_id = '', sourceTitle = '', sourceBody = '';
  if (type === 'ticket') {
    const t = db.prepare(`SELECT * FROM portal_tickets WHERE id = ?`).get(id);
    if (!t) return res.status(404).json({ error: 'Source not found' });
    client_id = t.client_id; sourceTitle = t.subject; sourceBody = t.description;
  } else if (type === 'message') {
    const m = db.prepare(`SELECT * FROM portal_messages WHERE id = ?`).get(id);
    if (!m) return res.status(404).json({ error: 'Source not found' });
    client_id = m.client_id; sourceTitle = (m.body || '').slice(0, 80); sourceBody = m.body;
  } else if (type === 'approval') {
    const a = db.prepare(`SELECT * FROM portal_approvals WHERE id = ?`).get(id);
    if (!a) return res.status(404).json({ error: 'Source not found' });
    client_id = a.client_id; sourceTitle = a.title; sourceBody = a.notes;
  } else if (type === 'asset') {
    const a = db.prepare(`SELECT * FROM portal_assets WHERE id = ?`).get(id);
    if (!a) return res.status(404).json({ error: 'Source not found' });
    client_id = a.client_id; sourceTitle = a.name; sourceBody = a.description;
  }
  const client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(client_id);

  if (target === 'task') {
    const newId = uuid();
    db.prepare(`INSERT INTO service_desk_tasks (id, client_id, source_request_type, source_request_id, title, description, assignee, status, priority, due_at, checklist, effort_estimate) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      newId, client_id, type, id,
      (payload.title || sourceTitle).slice(0, 300),
      (payload.description || sourceBody || '').slice(0, 4000),
      payload.assignee || '',
      payload.status || 'todo',
      payload.priority || 'medium',
      payload.due_at || '',
      JSON.stringify(payload.checklist || []),
      payload.effort_estimate || '',
    );
    return res.json({ id: newId, kind: 'task' });
  }

  if (target === 'sop') {
    // Spin up an SOP instance from a base SOP
    if (!payload.sop_id) return res.status(400).json({ error: 'sop_id required for SOP conversion' });
    const sop = db.prepare(`SELECT * FROM sops WHERE id = ?`).get(payload.sop_id);
    if (!sop) return res.status(404).json({ error: 'SOP not found' });
    const steps = db.prepare(`SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY position ASC`).all(sop.id);
    const instId = uuid();
    db.prepare(`INSERT INTO sop_instances (id, sop_id, sop_title, reference_kind, reference_id, reference_label, assignee, notes) VALUES (?,?,?,?,?,?,?,?)`).run(
      instId, sop.id, sop.title, `service_desk_${type}`, id,
      `${client?.business_name || ''} · ${sourceTitle}`.slice(0, 200),
      payload.assignee || sop.default_owner || '',
      payload.notes || sourceBody || '',
    );
    for (const s of steps) {
      db.prepare(`INSERT INTO sop_instance_steps (id, instance_id, step_id, position, title, owner, status, checklist_state) VALUES (?,?,?,?,?,?,?,?)`).run(
        uuid(), instId, s.id, s.position, s.title, s.owner || '', 'pending', s.checklist || '[]'
      );
    }
    return res.json({ id: instId, kind: 'sop_instance' });
  }

  if (target === 'invoice') {
    const newId = uuid();
    db.prepare(`INSERT INTO portal_invoices (id, client_id, invoice_number, amount, currency, description, issued, due, status) VALUES (?,?,?,?,?,?,?,?,?)`).run(
      newId, client_id,
      payload.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
      parseFloat(payload.amount) || 0,
      payload.currency || 'BAM',
      (payload.description || sourceTitle).slice(0, 1000),
      payload.issued || new Date().toISOString().slice(0, 10),
      payload.due || '',
      payload.status || 'pending',
    );
    recordPortalActivity(db, client_id, 'invoice_created', `Invoice created from request: ${sourceTitle.slice(0, 80)}`);
    return res.json({ id: newId, kind: 'invoice' });
  }

  if (target === 'proposal') {
    const newId = uuid();
    db.prepare(`INSERT INTO portal_proposals (id, client_id, title, body, total, currency) VALUES (?,?,?,?,?,?)`).run(
      newId, client_id,
      (payload.title || sourceTitle).slice(0, 300),
      (payload.body || sourceBody || '').slice(0, 50000),
      parseFloat(payload.total) || 0,
      payload.currency || 'BAM',
    );
    recordPortalActivity(db, client_id, 'proposal_created', `Proposal drafted from request: ${sourceTitle.slice(0, 80)}`);
    return res.json({ id: newId, kind: 'proposal' });
  }
});

// ── POST /requests/:type/:id/ai ──────────────────────────────────
router.post('/requests/:type/:id/ai', async (req, res) => {
  const { type, id } = req.params;
  const { action, extra } = req.body;
  if (!['summary','suggest_reply','urgency','assignee','effort','upsell','checklist'].includes(action)) {
    return res.status(400).json({ error: 'unknown action' });
  }
  const db = getDb();

  // Gather context
  let subject = '', body = '', clientCtx = '', historyText = '';
  if (type === 'ticket') {
    const t = db.prepare(`SELECT * FROM portal_tickets WHERE id = ?`).get(id);
    if (!t) return res.status(404).json({ error: 'Not found' });
    subject = t.subject; body = t.description;
    const client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(t.client_id);
    if (client) clientCtx = `Client: ${client.business_name} (${client.industry || 'n/a'}) · Package: ${client.package || '—'} · Goals: ${client.goals || '—'}`;
    const msgs = db.prepare(`SELECT author_name, body, created_at FROM portal_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`).all(id);
    historyText = msgs.slice(-10).map(m => `${m.author_name}: ${m.body}`).join('\n\n');
  } else if (type === 'message') {
    const m = db.prepare(`SELECT * FROM portal_messages WHERE id = ?`).get(id);
    if (!m) return res.status(404).json({ error: 'Not found' });
    subject = `Direct message from client`; body = m.body;
    const client = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(m.client_id);
    if (client) clientCtx = `Client: ${client.business_name} (${client.industry || 'n/a'})`;
  } else if (type === 'approval') {
    const a = db.prepare(`SELECT * FROM portal_approvals WHERE id = ?`).get(id);
    if (!a) return res.status(404).json({ error: 'Not found' });
    subject = a.title; body = a.notes;
  }

  const provider = getActiveProvider();

  const prompts = {
    summary: `You are an internal CRM analyst at Cloz Digital. Summarize this client request in 2-3 crisp sentences. Identify what the client wants, urgency cues, and any blockers.\n\n${clientCtx}\n\nSubject: ${subject}\n\nBody:\n${body}\n\n${historyText ? `Conversation so far:\n${historyText}` : ''}`,
    suggest_reply: `You are a senior support engineer at Cloz Digital, a premium web design agency. Write a warm, professional reply to this client. Acknowledge what they said, set realistic expectations, and propose the next step. Keep it under 150 words. No greetings like "I hope this finds you well." Sign off as "— Cloz Digital".\n\n${clientCtx}\n\nSubject: ${subject}\n\nClient says:\n${body}\n\n${historyText ? `Conversation history:\n${historyText}` : ''}${extra ? `\n\nAgent notes: ${extra}` : ''}`,
    urgency: `Classify the urgency of this client request as one of: urgent | high | medium | low. Reply with ONLY the single word. ${clientCtx}\n\nSubject: ${subject}\n\nBody: ${body}`,
    assignee: `Recommend who should handle this request. Choose one: "Anes" (technical/dev/SEO/infra) or "Denis" (design/content/client-success/billing). Reply with ONLY the single name. ${clientCtx}\n\nSubject: ${subject}\n\nBody: ${body}`,
    effort: `Estimate the effort to handle this request. Reply with ONLY one of: "15 min", "1 hour", "half day", "1 day", "multi-day". ${clientCtx}\n\nSubject: ${subject}\n\nBody: ${body}`,
    upsell: `You are a sales strategist. Read this request and identify any natural upsell or cross-sell opportunity for Cloz Digital's services (Launch Care 800 BAM, Growth Care 1500 BAM + retainer, Presence Care 200 BAM/month, SEO, content, ads). If none, say "No clear upsell." Otherwise, write 2-3 sentences proposing the upsell.\n\n${clientCtx}\n\nSubject: ${subject}\n\nBody: ${body}`,
    checklist: `Generate a concise actionable checklist (5-8 items, one per line, prefixed with "- ") that a team member would follow to resolve this client request end-to-end. No prose, just the checklist.\n\n${clientCtx}\n\nSubject: ${subject}\n\nBody: ${body}`,
  };

  try {
    const result = await provider.generate(prompts[action], {
      temperature: action === 'urgency' || action === 'assignee' || action === 'effort' ? 0.1 : 0.4,
      maxTokens: action === 'urgency' || action === 'assignee' || action === 'effort' ? 20 : 800,
      task: `service-desk-${action}`,
    });
    const text = (result.text || '').trim();

    // Side-effect: persist summary into the ticket
    if (type === 'ticket' && action === 'summary') {
      try { db.prepare(`UPDATE portal_tickets SET ai_summary = ? WHERE id = ?`).run(text.slice(0, 2000), id); } catch {}
    }
    res.json({ result: text, latencyMs: result.latencyMs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Tasks ────────────────────────────────────────────────────────
router.get('/tasks', (req, res) => {
  const db = getDb();
  const { assignee, status, client_id } = req.query;
  let sql = `SELECT * FROM service_desk_tasks WHERE 1=1`;
  const params = [];
  if (assignee) { sql += ` AND assignee = ?`; params.push(assignee); }
  if (status)   { sql += ` AND status = ?`;   params.push(status); }
  if (client_id){ sql += ` AND client_id = ?`;params.push(client_id); }
  sql += ` ORDER BY updated_at DESC LIMIT 500`;
  const rows = db.prepare(sql).all(...params);
  res.json({ tasks: rows.map(t => ({ ...t, checklist: parseJSON(t.checklist, []) })) });
});

router.patch('/tasks/:id', (req, res) => {
  const db = getDb();
  const t = db.prepare(`SELECT id FROM service_desk_tasks WHERE id = ?`).get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const allowed = ['title','description','assignee','status','priority','due_at','effort_estimate'];
  const sets = [], params = [];
  for (const k of allowed) if (req.body[k] !== undefined) { sets.push(`${k} = ?`); params.push(req.body[k]); }
  if (req.body.checklist !== undefined) { sets.push('checklist = ?'); params.push(JSON.stringify(req.body.checklist)); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update' });
  sets.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE service_desk_tasks SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

router.delete('/tasks/:id', (req, res) => {
  getDb().prepare(`DELETE FROM service_desk_tasks WHERE id = ?`).run(req.params.id);
  res.json({ success: true });
});

// ── POST /sla-check — re-evaluate SLA, mark escalated, notify ────
router.post('/sla-check', async (_req, res) => {
  const db = getDb();
  const open = db.prepare(`SELECT * FROM portal_tickets WHERE status NOT IN ('closed','resolved','completed') AND (sla_due_at != '' AND sla_due_at IS NOT NULL)`).all();
  const escalated = [];
  for (const t of open) {
    if (new Date(t.sla_due_at) < new Date() && !t.escalated) {
      db.prepare(`UPDATE portal_tickets SET escalated = 1, updated_at = datetime('now') WHERE id = ?`).run(t.id);
      escalated.push({ id: t.id, subject: t.subject, assignee: t.assignee_name });
      if (isResendConfigured() && t.assignee_email) {
        try {
          await sendViaResend({
            from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
            to: t.assignee_email,
            subject: `[SLA breached] ${t.subject}`,
            html: `<p>The SLA on this ticket has expired without a response.</p><p><a href="${buildUrl('/management/service-desk')}">Open Service Desk</a></p>`,
            text: `SLA breached on: ${t.subject}\n\n${buildUrl('/management/service-desk')}`,
          });
        } catch (e) { logError(`SLA escalation email failed: ${e.message}`); }
      }
    }
  }
  res.json({ escalated, count: escalated.length });
});

// ── Helpers ──
function replyEmailHtml(client, ticket, body, author, link) {
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0B0B0D;">
    <h2 style="margin:0 0 4px;color:#0B0B0D;font-size:20px;">Hi ${escapeHtml((client.contact_name || client.business_name).split(' ')[0])},</h2>
    <p style="margin:0 0 20px;color:#52525B;font-size:13px;">A new reply on <strong>${escapeHtml(ticket.subject)}</strong></p>
    <div style="background:#F5F5F7;padding:16px 18px;border-radius:8px;color:#0B0B0D;font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(body)}</div>
    <div style="margin-top:24px;"><a href="${link}" style="display:inline-block;background:#5E8DB5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Open in Portal →</a></div>
    <p style="margin-top:24px;color:#A1A1AA;font-size:12px;">— ${escapeHtml(author)}, Cloz Digital</p>
  </div>`;
}

export default router;
