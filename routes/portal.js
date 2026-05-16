// routes/portal.js — Client Portal API
// Magic-link auth, ticketing, assets, messages, billing, hosting, AI assistant.

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../database/init.js';
import { getActiveProvider } from '../providers/index.js';
import { sendViaResend, isResendConfigured } from '../services/mailService.js';
import { logInfo, logError, extractRequestContext } from '../services/logger.js';
import { APP_URL } from '../config/urls.js';

const router = Router();

// ══════════════════════════════════════════════════════════════
//  AUTH HELPERS
// ══════════════════════════════════════════════════════════════

function generateToken(prefix = '') {
  return prefix + crypto.randomBytes(24).toString('hex');
}

function recordActivity(db, clientId, kind, message) {
  try {
    db.prepare(`INSERT INTO portal_activity (id, client_id, kind, message) VALUES (?,?,?,?)`)
      .run(uuid(), clientId, kind, message);
  } catch {}
}

// Middleware: verify Bearer access_token, attach client to req
function requireClient(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  const client = getDb().prepare('SELECT * FROM portal_clients WHERE access_token = ?').get(token);
  if (!client) return res.status(401).json({ error: 'Invalid or expired token' });
  if (client.status === 'suspended') return res.status(403).json({ error: 'Portal access suspended' });

  req.client = client;
  next();
}

function parseJSON(s, fallback) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch { return fallback; }
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ══════════════════════════════════════════════════════════════
//  MAGIC LINK AUTH
// ══════════════════════════════════════════════════════════════

router.post('/auth/request', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const db = getDb();
  const client = db.prepare('SELECT * FROM portal_clients WHERE email = ?').get(email.toLowerCase().trim());

  // ALWAYS return success to prevent enumeration. Only send the email if a client exists.
  if (client) {
    const token = generateToken('mlk_');
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.prepare(`INSERT INTO portal_magic_links (token, client_id, expires_at) VALUES (?,?,?)`)
      .run(token, client.id, expires);

    const baseUrl = APP_URL;
    const magicUrl = `${baseUrl}/portal/verify?token=${token}`;

    if (isResendConfigured()) {
      try {
        const subject = `Your Cloz Digital portal sign-in link`;
        const html = renderMagicLinkHtml(client, magicUrl);
        const text = `Hi ${client.contact_name || client.business_name},\n\nUse this link to access your Cloz Digital portal:\n\n${magicUrl}\n\nThe link expires in 30 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\n— Cloz Digital`;

        await sendViaResend({
          from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
          to: client.email,
          subject, html, text,
        });
        logInfo(`Portal magic link sent to ${client.email}`, { category: 'auth', event_type: 'portal_magic_link', entity_type: 'portal_client', entity_id: client.id });
      } catch (e) {
        logError(`Magic link delivery failed: ${e.message}`, { entity_type: 'portal_client', entity_id: client.id });
      }
    } else {
      // In dev: log the link so operator can hand it to the client
      logInfo(`Portal magic link (Resend not configured): ${magicUrl}`, { category: 'auth', entity_type: 'portal_client', entity_id: client.id });
    }
  }

  res.json({ success: true, message: 'If this email belongs to a Cloz Digital client, a sign-in link has been sent.' });
});

router.post('/auth/verify', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const db = getDb();
  const link = db.prepare('SELECT * FROM portal_magic_links WHERE token = ?').get(token);
  if (!link) return res.status(404).json({ error: 'Invalid link' });
  if (link.consumed_at) return res.status(400).json({ error: 'Link already used' });
  if (new Date(link.expires_at) < new Date()) return res.status(400).json({ error: 'Link expired. Request a new one.' });

  const client = db.prepare('SELECT * FROM portal_clients WHERE id = ?').get(link.client_id);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Issue long-lived access token (or reuse existing)
  let accessToken = client.access_token;
  if (!accessToken) {
    accessToken = generateToken('pcl_');
    db.prepare('UPDATE portal_clients SET access_token = ?, updated_at = datetime(\'now\') WHERE id = ?').run(accessToken, client.id);
  }

  db.prepare('UPDATE portal_magic_links SET consumed_at = datetime(\'now\') WHERE token = ?').run(token);

  logInfo(`Portal sign-in: ${client.email}`, { category: 'auth', event_type: 'portal_login', entity_type: 'portal_client', entity_id: client.id });
  recordActivity(db, client.id, 'login', 'Signed in to portal');

  res.json({
    success: true,
    accessToken,
    client: sanitizeClient(client),
  });
});

router.post('/auth/logout', requireClient, (req, res) => {
  // Rotate the token so old sessions can't reuse it
  const newToken = generateToken('pcl_');
  getDb().prepare('UPDATE portal_clients SET access_token = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(newToken, req.client.id);
  res.json({ success: true });
});

function sanitizeClient(c) {
  return {
    id: c.id,
    business_name: c.business_name,
    contact_name: c.contact_name,
    email: c.email,
    phone: c.phone,
    industry: c.industry,
    website: c.website,
    logo_url: c.logo_url,
    brand_colors: parseJSON(c.brand_colors, {}),
    brand_fonts: parseJSON(c.brand_fonts, {}),
    voice_guidelines: c.voice_guidelines,
    package: c.package,
    hosting_provider: c.hosting_provider,
    domain_registrar: c.domain_registrar,
    domain_expiry: c.domain_expiry,
    ssl_expiry: c.ssl_expiry,
    status: c.status,
  };
}

// ══════════════════════════════════════════════════════════════
//  ME / DASHBOARD
// ══════════════════════════════════════════════════════════════

router.get('/me', requireClient, (req, res) => {
  res.json({ client: sanitizeClient(req.client) });
});

router.get('/dashboard', requireClient, (req, res) => {
  const db = getDb();
  const cid = req.client.id;

  const tickets = db.prepare(`SELECT id, subject, status, priority, updated_at FROM portal_tickets WHERE client_id = ? ORDER BY updated_at DESC LIMIT 5`).all(cid);
  const openTickets = db.prepare(`SELECT COUNT(*) as c FROM portal_tickets WHERE client_id = ? AND status NOT IN ('closed','resolved')`).get(cid)?.c || 0;
  const unpaidInvoices = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as total FROM portal_invoices WHERE client_id = ? AND status IN ('pending','overdue')`).get(cid);
  const pendingApprovals = db.prepare(`SELECT COUNT(*) as c FROM portal_approvals WHERE client_id = ? AND status = 'pending'`).get(cid)?.c || 0;
  const assets = db.prepare(`SELECT COUNT(*) as c FROM portal_assets WHERE client_id = ?`).get(cid)?.c || 0;
  const messages = db.prepare(`SELECT COUNT(*) as c FROM portal_messages WHERE client_id = ? AND author = 'cloz' AND read = 0`).get(cid)?.c || 0;
  const activity = db.prepare(`SELECT * FROM portal_activity WHERE client_id = ? ORDER BY created_at DESC LIMIT 10`).all(cid);
  const proposals = db.prepare(`SELECT id, title, status, total, currency FROM portal_proposals WHERE client_id = ? ORDER BY created_at DESC LIMIT 3`).all(cid);

  // Days until renewal
  const daysTo = (s) => {
    if (!s) return null;
    return Math.round((new Date(s) - new Date()) / 86400000);
  };

  res.json({
    client: sanitizeClient(req.client),
    summary: {
      open_tickets: openTickets,
      unread_messages: messages,
      pending_approvals: pendingApprovals,
      unpaid_invoices: unpaidInvoices?.c || 0,
      unpaid_total: unpaidInvoices?.total || 0,
      assets,
      domain_days_left: daysTo(req.client.domain_expiry),
      ssl_days_left: daysTo(req.client.ssl_expiry),
    },
    recent_tickets: tickets,
    proposals,
    activity,
  });
});

// ══════════════════════════════════════════════════════════════
//  TICKETS
// ══════════════════════════════════════════════════════════════

router.get('/tickets', requireClient, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM portal_tickets WHERE client_id = ? ORDER BY updated_at DESC LIMIT 200`).all(req.client.id);
  res.json({ tickets: rows });
});

router.post('/tickets', async (req, res) => {
  // Manual auth so we can still create tickets if needed
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  const db = getDb();
  const client = db.prepare('SELECT * FROM portal_clients WHERE access_token = ?').get(token);
  if (!client) return res.status(401).json({ error: 'Invalid token' });

  const { subject, description, priority, category } = req.body;
  if (!subject || subject.trim().length < 3) return res.status(400).json({ error: 'Subject required (min 3 chars)' });
  if (!description || description.trim().length < 5) return res.status(400).json({ error: 'Description required (min 5 chars)' });

  const id = uuid();
  db.prepare(`INSERT INTO portal_tickets (id, client_id, subject, description, priority, category) VALUES (?,?,?,?,?,?)`)
    .run(id, client.id, subject.trim().slice(0, 300), description.trim().slice(0, 8000),
         ['low','medium','high','urgent'].includes(priority) ? priority : 'medium',
         ['general','bug','content','design','billing','technical'].includes(category) ? category : 'general');

  // Seed the first message
  db.prepare(`INSERT INTO portal_ticket_messages (id, ticket_id, author, author_name, body) VALUES (?,?,?,?,?)`)
    .run(uuid(), id, 'client', client.contact_name || client.business_name, description.trim().slice(0, 8000));

  recordActivity(db, client.id, 'ticket_created', `New ticket: ${subject.trim().slice(0, 80)}`);
  logInfo(`Portal ticket opened: ${client.email} — ${subject}`, { category: 'client', event_type: 'ticket_created', entity_type: 'ticket', entity_id: id });

  // Notify internal team (non-blocking)
  if (isResendConfigured()) {
    try {
      const baseUrl = APP_URL;
      await sendViaResend({
        from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
        to: (process.env.PORTAL_INTERNAL_TO || 'general@cloz.digital,anes@cloz.digital').split(',').map(s => s.trim()),
        subject: `New ${priority || 'medium'} ticket from ${client.business_name}: ${subject}`,
        html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#F5F5F7;background:#0B0B0D;">
          <h2 style="margin:0 0 4px;color:#F5F5F7;">New Support Ticket</h2>
          <p style="margin:0;color:#A1A1AA;font-size:13px;">${escapeHtml(client.business_name)} &middot; ${escapeHtml(client.email)}</p>
          <div style="margin:20px 0;padding:16px;background:#18181C;border-radius:8px;">
            <p style="margin:0 0 8px;color:#5E8DB5;font-size:11px;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(priority || 'medium')} priority &middot; ${escapeHtml(category || 'general')}</p>
            <h3 style="margin:0 0 12px;color:#F5F5F7;font-size:16px;">${escapeHtml(subject)}</h3>
            <p style="margin:0;color:#A1A1AA;font-size:13px;white-space:pre-wrap;line-height:1.6;">${escapeHtml(description)}</p>
          </div>
          <a href="${baseUrl}/management/portal-clients" style="display:inline-block;background:#5E8DB5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Open in CRM</a>
        </div>`,
        text: `New ticket from ${client.business_name} (${client.email})\nPriority: ${priority || 'medium'}\nCategory: ${category || 'general'}\nSubject: ${subject}\n\n${description}\n\nOpen: ${baseUrl}/management/portal-clients`,
      });
    } catch (e) {
      logError(`Ticket notification failed: ${e.message}`);
    }
  }

  const ticket = db.prepare('SELECT * FROM portal_tickets WHERE id = ?').get(id);
  res.json({ ticket });
});

router.get('/tickets/:id', requireClient, (req, res) => {
  const db = getDb();
  const ticket = db.prepare('SELECT * FROM portal_tickets WHERE id = ? AND client_id = ?').get(req.params.id, req.client.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const messages = db.prepare('SELECT * FROM portal_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
  res.json({ ticket, messages });
});

router.post('/tickets/:id/reply', requireClient, (req, res) => {
  const { body } = req.body;
  if (!body || body.trim().length < 1) return res.status(400).json({ error: 'Message body required' });

  const db = getDb();
  const ticket = db.prepare('SELECT * FROM portal_tickets WHERE id = ? AND client_id = ?').get(req.params.id, req.client.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  db.prepare(`INSERT INTO portal_ticket_messages (id, ticket_id, author, author_name, body) VALUES (?,?,?,?,?)`)
    .run(uuid(), ticket.id, 'client', req.client.contact_name || req.client.business_name, body.trim().slice(0, 8000));

  db.prepare(`UPDATE portal_tickets SET status = CASE WHEN status IN ('closed','resolved') THEN 'open' ELSE status END, updated_at = datetime('now') WHERE id = ?`)
    .run(ticket.id);

  recordActivity(db, req.client.id, 'ticket_reply', `Replied to ticket: ${ticket.subject.slice(0, 80)}`);
  res.json({ success: true });
});

router.patch('/tickets/:id', requireClient, (req, res) => {
  const { action, satisfaction_rating } = req.body;
  const db = getDb();
  const ticket = db.prepare('SELECT * FROM portal_tickets WHERE id = ? AND client_id = ?').get(req.params.id, req.client.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  if (action === 'close') {
    db.prepare(`UPDATE portal_tickets SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).run(ticket.id);
    recordActivity(db, req.client.id, 'ticket_closed', `Closed ticket: ${ticket.subject.slice(0, 80)}`);
  } else if (action === 'reopen') {
    db.prepare(`UPDATE portal_tickets SET status = 'open', closed_at = '', updated_at = datetime('now') WHERE id = ?`).run(ticket.id);
    recordActivity(db, req.client.id, 'ticket_reopen', `Reopened ticket: ${ticket.subject.slice(0, 80)}`);
  } else if (action === 'rate' && [1, 2, 3, 4, 5].includes(satisfaction_rating)) {
    db.prepare(`UPDATE portal_tickets SET satisfaction_rating = ? WHERE id = ?`).run(satisfaction_rating, ticket.id);
  }
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
//  ASSETS
// ══════════════════════════════════════════════════════════════

router.get('/assets', requireClient, (req, res) => {
  const { folder } = req.query;
  const db = getDb();
  let sql = 'SELECT * FROM portal_assets WHERE client_id = ?';
  const params = [req.client.id];
  if (folder) { sql += ' AND folder = ?'; params.push(folder); }
  sql += ' ORDER BY created_at DESC';
  const rows = db.prepare(sql).all(...params);

  // Folder list
  const folders = db.prepare(`SELECT DISTINCT folder FROM portal_assets WHERE client_id = ? AND folder != ''`).all(req.client.id).map(r => r.folder);

  res.json({ assets: rows, folders });
});

router.post('/assets', requireClient, (req, res) => {
  const { name, type, url, description, folder, mime_type, size_bytes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  if (!url) return res.status(400).json({ error: 'url required (paste a public URL — file upload coming soon)' });

  const db = getDb();
  const id = uuid();
  db.prepare(`INSERT INTO portal_assets (id, client_id, name, type, url, description, folder, mime_type, size_bytes, uploaded_by) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.client.id, name.slice(0, 200),
         ['logo','photo','video','document','font','brand-guideline','credential','file'].includes(type) ? type : 'file',
         url.slice(0, 2000), (description || '').slice(0, 1000),
         (folder || '').slice(0, 100), (mime_type || '').slice(0, 100), parseInt(size_bytes) || 0, 'client');

  recordActivity(db, req.client.id, 'asset_added', `Added asset: ${name}`);
  res.json({ asset: db.prepare('SELECT * FROM portal_assets WHERE id = ?').get(id) });
});

router.delete('/assets/:id', requireClient, (req, res) => {
  const db = getDb();
  const asset = db.prepare('SELECT * FROM portal_assets WHERE id = ? AND client_id = ?').get(req.params.id, req.client.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  db.prepare('DELETE FROM portal_assets WHERE id = ?').run(asset.id);
  recordActivity(db, req.client.id, 'asset_removed', `Removed asset: ${asset.name}`);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
//  MESSAGES — light direct thread between client and Cloz team
// ══════════════════════════════════════════════════════════════

router.get('/messages', requireClient, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM portal_messages WHERE client_id = ? ORDER BY created_at ASC LIMIT 500`).all(req.client.id);
  // Mark cloz→client messages as read
  db.prepare(`UPDATE portal_messages SET read = 1 WHERE client_id = ? AND author = 'cloz' AND read = 0`).run(req.client.id);
  res.json({ messages: rows });
});

router.post('/messages', requireClient, (req, res) => {
  const { body } = req.body;
  if (!body || body.trim().length < 1) return res.status(400).json({ error: 'Message body required' });
  const db = getDb();
  const id = uuid();
  db.prepare(`INSERT INTO portal_messages (id, client_id, author, author_name, body) VALUES (?,?,?,?,?)`)
    .run(id, req.client.id, 'client', req.client.contact_name || req.client.business_name, body.trim().slice(0, 4000));
  recordActivity(db, req.client.id, 'message_sent', 'Sent message to Cloz Digital team');
  res.json({ message: db.prepare('SELECT * FROM portal_messages WHERE id = ?').get(id) });
});

// ══════════════════════════════════════════════════════════════
//  BILLING
// ══════════════════════════════════════════════════════════════

router.get('/billing', requireClient, (req, res) => {
  const db = getDb();
  const invoices = db.prepare(`SELECT * FROM portal_invoices WHERE client_id = ? ORDER BY issued DESC`).all(req.client.id);

  const paid = invoices.filter(i => i.status === 'paid');
  const summary = {
    unpaid: invoices.filter(i => i.status !== 'paid').length,
    unpaid_total: invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.amount || 0), 0),
    paid_total: paid.reduce((s, i) => s + (i.amount || 0), 0),
    mrr: req.client.mrr || 0,
  };
  res.json({ invoices, summary, package: req.client.package });
});

// ══════════════════════════════════════════════════════════════
//  HOSTING & DOMAINS
// ══════════════════════════════════════════════════════════════

router.get('/hosting', requireClient, (req, res) => {
  const c = req.client;
  const daysTo = (s) => s ? Math.round((new Date(s) - new Date()) / 86400000) : null;
  res.json({
    website: c.website,
    hosting_provider: c.hosting_provider,
    domain_registrar: c.domain_registrar,
    domain_expiry: c.domain_expiry,
    domain_days_left: daysTo(c.domain_expiry),
    ssl_expiry: c.ssl_expiry,
    ssl_days_left: daysTo(c.ssl_expiry),
    note: 'Live uptime monitoring requires external service integration (Phase 2).',
  });
});

// ══════════════════════════════════════════════════════════════
//  MAINTENANCE REPORTS
// ══════════════════════════════════════════════════════════════

router.get('/maintenance', requireClient, (req, res) => {
  const db = getDb();
  const reports = db.prepare(`SELECT * FROM portal_maintenance_reports WHERE client_id = ? AND published = 1 ORDER BY created_at DESC LIMIT 24`).all(req.client.id);
  res.json({ reports });
});

router.get('/maintenance/:id', requireClient, (req, res) => {
  const db = getDb();
  const r = db.prepare(`SELECT * FROM portal_maintenance_reports WHERE id = ? AND client_id = ? AND published = 1`).get(req.params.id, req.client.id);
  if (!r) return res.status(404).json({ error: 'Report not found' });
  res.json({ ...r, details: parseJSON(r.details, {}) });
});

// ══════════════════════════════════════════════════════════════
//  APPROVALS (designs, copy)
// ══════════════════════════════════════════════════════════════

router.get('/approvals', requireClient, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM portal_approvals WHERE client_id = ? ORDER BY created_at DESC`).all(req.client.id);
  res.json({ approvals: rows });
});

router.post('/approvals/:id/decision', requireClient, (req, res) => {
  const { decision, notes } = req.body;
  if (!['approved', 'revisions_requested', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Invalid decision' });
  }
  const db = getDb();
  const a = db.prepare(`SELECT * FROM portal_approvals WHERE id = ? AND client_id = ?`).get(req.params.id, req.client.id);
  if (!a) return res.status(404).json({ error: 'Approval not found' });
  db.prepare(`UPDATE portal_approvals SET status = ?, decision_notes = ?, decided_at = datetime('now') WHERE id = ?`)
    .run(decision, (notes || '').slice(0, 2000), a.id);
  recordActivity(db, req.client.id, 'approval_decision', `${decision.replace('_', ' ')}: ${a.title}`);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
//  PROPOSALS — viewing + simple signature capture
// ══════════════════════════════════════════════════════════════

router.get('/proposals', requireClient, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT * FROM portal_proposals WHERE client_id = ? ORDER BY created_at DESC`).all(req.client.id);
  res.json({ proposals: rows });
});

router.get('/proposals/:id', requireClient, (req, res) => {
  const db = getDb();
  const p = db.prepare(`SELECT * FROM portal_proposals WHERE id = ? AND client_id = ?`).get(req.params.id, req.client.id);
  if (!p) return res.status(404).json({ error: 'Proposal not found' });
  res.json({ proposal: p });
});

router.post('/proposals/:id/sign', requireClient, (req, res) => {
  const { signature_name } = req.body;
  if (!signature_name || signature_name.trim().length < 2) {
    return res.status(400).json({ error: 'Type your full name as your signature' });
  }
  const db = getDb();
  const p = db.prepare(`SELECT * FROM portal_proposals WHERE id = ? AND client_id = ?`).get(req.params.id, req.client.id);
  if (!p) return res.status(404).json({ error: 'Proposal not found' });
  if (p.signed_at) return res.status(400).json({ error: 'Already signed' });

  db.prepare(`UPDATE portal_proposals SET status = 'signed', signed_at = datetime('now'), signature_name = ? WHERE id = ?`)
    .run(signature_name.trim().slice(0, 200), p.id);
  recordActivity(db, req.client.id, 'proposal_signed', `Signed: ${p.title}`);
  logInfo(`Proposal signed by ${req.client.email}: ${p.title}`, { category: 'client', event_type: 'proposal_signed', entity_type: 'proposal', entity_id: p.id });
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
//  AI ASSISTANT — branded, context-aware
// ══════════════════════════════════════════════════════════════

router.post('/ai-assistant', requireClient, async (req, res) => {
  const { messages, mode = 'chat' } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    const c = req.client;
    const brandColors = parseJSON(c.brand_colors, {});
    const brandFonts = parseJSON(c.brand_fonts, {});

    const systemContext = `You are the AI assistant inside ${c.business_name}'s private Cloz Digital client portal.

Client profile:
- Business: ${c.business_name}${c.industry ? ` (${c.industry})` : ''}
- Contact: ${c.contact_name || 'Client'}
- Website: ${c.website || 'not configured'}
- Package: ${c.package || 'not set'}
- Voice: ${c.voice_guidelines || 'professional, warm, trustworthy'}
- Brand colors: ${Object.values(brandColors).filter(Boolean).join(', ') || 'not set'}
- Brand fonts: ${Object.values(brandFonts).filter(Boolean).join(', ') || 'not set'}

Capabilities:
- Explain technical updates in plain language
- Suggest content ideas matched to their brand and voice
- Answer questions about Cloz Digital's services (Launch Care 800 BAM, Growth Care 1500 BAM + retainer, Presence Care 200 BAM/month)
- Recommend next actions
- Summarize tickets and reports

Style: Be concise, warm, on-brand. Reference the client's business when relevant. Use plain language for technical topics.`;

    const userMessage = messages[messages.length - 1]?.content || '';
    const history = messages.slice(0, -1).map(m => `${m.role === 'user' ? 'CLIENT' : 'ASSISTANT'}: ${m.content}`).join('\n');

    const prompt = `${systemContext}\n\n${history ? `Previous turns:\n${history}\n\n` : ''}CLIENT: ${userMessage}\n\nASSISTANT:`;

    const provider = getActiveProvider();
    const result = await provider.generate(prompt, {
      temperature: 0.5,
      maxTokens: 1500,
      task: 'content-generate',
    });
    res.json({ reply: result.text, latencyMs: result.latencyMs });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE — static for now, extensible
// ══════════════════════════════════════════════════════════════

router.get('/knowledge', requireClient, (_req, res) => {
  res.json({
    articles: [
      { id: 'kb-1', category: 'Getting Started', title: 'How to use your client portal', summary: 'Tour of every section in your private workspace.' },
      { id: 'kb-2', category: 'Support', title: 'How to submit a support ticket', summary: 'Step-by-step guide to filing a request that gets the fastest response.' },
      { id: 'kb-3', category: 'Assets', title: 'Uploading brand assets', summary: 'Best practices for organizing logos, photos, fonts, and brand guidelines.' },
      { id: 'kb-4', category: 'Billing', title: 'Reading your invoices', summary: 'Understanding line items, payment methods, and how to dispute a charge.' },
      { id: 'kb-5', category: 'Hosting', title: 'What domain and SSL expiry mean', summary: 'Plain-language explanation of what we monitor and why.' },
      { id: 'kb-6', category: 'Maintenance', title: 'How to read a maintenance report', summary: 'What each section covers and what we recommend you act on.' },
      { id: 'kb-7', category: 'Content Studio', title: 'Generating branded content', summary: 'Use the Studio to spin up Instagram posts, ads, and graphics in your brand.' },
      { id: 'kb-8', category: 'AI Assistant', title: 'Asking the AI assistant', summary: 'Examples of questions and how to get the best answers.' },
    ],
  });
});

export default router;

// ── Email template helper ──
function renderMagicLinkHtml(client, magicUrl) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0B0B0D;color:#F5F5F7;font-family:Inter,system-ui,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:40px 24px;">
  <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;">Hi ${escapeHtml((client.contact_name || client.business_name).split(' ')[0])},</h1>
  <p style="margin:0;font-size:14px;color:#A1A1AA;">Here's your sign-in link for the Cloz Digital client portal.</p>

  <div style="margin:28px 0;text-align:center;">
    <a href="${magicUrl}" style="display:inline-block;background:#5E8DB5;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">
      Sign in to your portal →
    </a>
  </div>

  <p style="margin:0;font-size:12px;color:#A1A1AA;line-height:1.6;">
    This link expires in 30 minutes. If you didn't request it, you can safely ignore this email.
  </p>

  <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#52525B;">
    Cloz Digital &middot; Premium web design, hosting, and ongoing care<br/>
    <a href="mailto:general@cloz.digital" style="color:#5E8DB5;text-decoration:none;">general@cloz.digital</a>
  </div>
</div></body></html>`;
}
