// routes/portalAdmin.js — Admin operations for portal clients
// (Onboarding, viewing all portal clients, replying to tickets, etc.)

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../database/init.js';
import { sendViaResend, isResendConfigured } from '../services/mailService.js';
import { logInfo, logError } from '../services/logger.js';
import { buildUrl } from '../config/urls.js';

const router = Router();

function token(prefix = 'pcl_') {
  return prefix + crypto.randomBytes(24).toString('hex');
}

// ── List portal clients ──
router.get('/clients', (_req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT id, business_name, contact_name, email, phone, industry, website, package, status, mrr, created_at FROM portal_clients ORDER BY created_at DESC`).all();
  res.json({ clients: rows, total: rows.length });
});

router.get('/clients/:id', (req, res) => {
  const db = getDb();
  const c = db.prepare(`SELECT * FROM portal_clients WHERE id = ?`).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  const tickets = db.prepare(`SELECT id, subject, status, priority, updated_at FROM portal_tickets WHERE client_id = ? ORDER BY updated_at DESC LIMIT 20`).all(c.id);
  const assets = db.prepare(`SELECT COUNT(*) as c FROM portal_assets WHERE client_id = ?`).get(c.id)?.c || 0;
  const invoices = db.prepare(`SELECT COUNT(*) as c FROM portal_invoices WHERE client_id = ?`).get(c.id)?.c || 0;

  res.json({ client: c, tickets, asset_count: assets, invoice_count: invoices });
});

// ── Create / onboard a new portal client ──
router.post('/clients', async (req, res) => {
  const {
    business_name, contact_name, email, phone, industry, website,
    logo_url, brand_colors, brand_fonts, voice_guidelines, package: pkg,
    hosting_provider, domain_registrar, domain_expiry, ssl_expiry, mrr,
    send_welcome = true,
  } = req.body;

  if (!business_name || !email) return res.status(400).json({ error: 'business_name and email required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email required' });

  const db = getDb();
  const existing = db.prepare(`SELECT id FROM portal_clients WHERE email = ?`).get(email.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: 'A portal client already exists with this email' });

  const id = uuid();
  const accessToken = token();
  db.prepare(`INSERT INTO portal_clients (
    id, business_name, contact_name, email, phone, industry, website,
    logo_url, brand_colors, brand_fonts, voice_guidelines, package,
    hosting_provider, domain_registrar, domain_expiry, ssl_expiry, mrr,
    status, access_token
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, business_name.trim(), (contact_name || '').trim(), email.toLowerCase().trim(),
    (phone || '').trim(), (industry || '').trim(), (website || '').trim(),
    (logo_url || '').trim(),
    JSON.stringify(brand_colors || {}),
    JSON.stringify(brand_fonts || {}),
    (voice_guidelines || '').trim(),
    (pkg || '').trim(),
    (hosting_provider || '').trim(),
    (domain_registrar || '').trim(),
    (domain_expiry || '').trim(),
    (ssl_expiry || '').trim(),
    parseFloat(mrr) || 0,
    'active', accessToken,
  );

  logInfo(`Portal client onboarded: ${business_name} <${email}>`, {
    category: 'client', event_type: 'portal_client_created', entity_type: 'portal_client', entity_id: id,
  });

  let welcomeSent = false;
  if (send_welcome && isResendConfigured()) {
    try {
      const link = buildUrl(`/portal/login?email=${encodeURIComponent(email)}`);

      const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0B0B0D;color:#F5F5F7;font-family:Inter,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
          <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;font-family:'Plus Jakarta Sans',sans-serif;">Welcome to your Cloz Digital portal, ${(contact_name || business_name).split(' ')[0]}.</h1>
          <p style="margin:0;color:#A1A1AA;font-size:14px;">Your private workspace is ready.</p>
          <div style="margin:28px 0;padding:20px;background:#18181C;border-radius:10px;">
            <p style="margin:0 0 12px;color:#F5F5F7;font-size:14px;line-height:1.7;">
              Inside your portal you can:
            </p>
            <ul style="margin:0;padding-left:18px;color:#A1A1AA;font-size:13px;line-height:1.9;">
              <li>Submit support tickets and track responses</li>
              <li>Upload and organize your brand assets</li>
              <li>Review invoices, hosting, and domain status</li>
              <li>Approve designs and sign proposals</li>
              <li>Read monthly maintenance reports</li>
              <li>Generate on-brand content with AI</li>
              <li>Chat with an AI assistant trained on your business</li>
            </ul>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="${link}" style="display:inline-block;background:#5E8DB5;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Sign in to your portal →</a>
          </div>
          <p style="margin:0;font-size:12px;color:#A1A1AA;line-height:1.6;">
            We use passwordless sign-in. Click the button above and enter your email — we'll send you a secure one-time link.
          </p>
          <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#52525B;">
            Cloz Digital &middot; Premium web design, hosting, and ongoing care<br/>
            <a href="mailto:general@cloz.digital" style="color:#5E8DB5;text-decoration:none;">general@cloz.digital</a>
          </div>
        </div></body></html>`;

      await sendViaResend({
        from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
        to: email,
        subject: `Welcome to your Cloz Digital client portal, ${business_name}`,
        html,
        text: `Welcome to your Cloz Digital portal, ${contact_name || business_name}.\n\nYour private workspace is ready.\n\nSign in: ${link}\n\nInside you can submit tickets, upload assets, review invoices and hosting, approve designs, sign proposals, view maintenance reports, and chat with your AI assistant.\n\n— Cloz Digital`,
      });
      welcomeSent = true;
      db.prepare('UPDATE portal_clients SET welcome_sent = 1 WHERE id = ?').run(id);
    } catch (e) {
      logError(`Welcome email failed for ${email}: ${e.message}`);
    }
  }

  res.json({ id, accessToken, welcomeSent });
});

// ── Update a client (any field) ──
router.patch('/clients/:id', (req, res) => {
  const db = getDb();
  const c = db.prepare(`SELECT id FROM portal_clients WHERE id = ?`).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });

  const allowed = ['business_name', 'contact_name', 'phone', 'industry', 'website',
    'logo_url', 'voice_guidelines', 'package', 'hosting_provider', 'domain_registrar',
    'domain_expiry', 'ssl_expiry', 'mrr', 'status'];
  const updates = [];
  const params = [];
  for (const k of allowed) {
    if (req.body[k] !== undefined) {
      updates.push(`${k} = ?`);
      params.push(req.body[k]);
    }
  }
  if (req.body.brand_colors) { updates.push('brand_colors = ?'); params.push(JSON.stringify(req.body.brand_colors)); }
  if (req.body.brand_fonts)  { updates.push('brand_fonts = ?');  params.push(JSON.stringify(req.body.brand_fonts)); }

  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  updates.push(`updated_at = datetime('now')`);
  params.push(req.params.id);
  db.prepare(`UPDATE portal_clients SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

// ── Rotate access token (invalidate sessions) ──
router.post('/clients/:id/rotate-token', (req, res) => {
  const db = getDb();
  const c = db.prepare(`SELECT id FROM portal_clients WHERE id = ?`).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const newToken = token();
  db.prepare('UPDATE portal_clients SET access_token = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newToken, c.id);
  res.json({ success: true });
});

// ── Delete a portal client and all data ──
router.delete('/clients/:id', (req, res) => {
  const db = getDb();
  const id = req.params.id;
  // Cascade delete
  db.prepare('DELETE FROM portal_ticket_messages WHERE ticket_id IN (SELECT id FROM portal_tickets WHERE client_id = ?)').run(id);
  db.prepare('DELETE FROM portal_tickets WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_assets WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_messages WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_invoices WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_maintenance_reports WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_approvals WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_proposals WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_activity WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_magic_links WHERE client_id = ?').run(id);
  db.prepare('DELETE FROM portal_clients WHERE id = ?').run(id);
  res.json({ success: true });
});

// ── Reply to a ticket as Cloz Digital ──
router.post('/tickets/:id/reply', (req, res) => {
  const { body, author_name, status } = req.body;
  if (!body) return res.status(400).json({ error: 'Body required' });
  const db = getDb();
  const ticket = db.prepare('SELECT * FROM portal_tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  db.prepare(`INSERT INTO portal_ticket_messages (id, ticket_id, author, author_name, body) VALUES (?,?,?,?,?)`)
    .run(uuid(), ticket.id, 'cloz', (author_name || 'Cloz Digital Team').slice(0, 200), body.slice(0, 8000));

  const newStatus = status || (ticket.status === 'open' ? 'in_progress' : ticket.status);
  db.prepare(`UPDATE portal_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(newStatus, ticket.id);
  res.json({ success: true });
});

// ── Create invoice for a client ──
router.post('/clients/:id/invoices', (req, res) => {
  const { invoice_number, amount, currency, description, issued, due, status } = req.body;
  const db = getDb();
  const c = db.prepare('SELECT id FROM portal_clients WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Client not found' });

  const id = uuid();
  db.prepare(`INSERT INTO portal_invoices (id, client_id, invoice_number, amount, currency, description, issued, due, status) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, c.id, invoice_number || '', parseFloat(amount) || 0, currency || 'BAM',
         description || '', issued || '', due || '', status || 'pending');
  res.json({ id });
});

// ── Create maintenance report ──
router.post('/clients/:id/maintenance', (req, res) => {
  const { period, summary, details } = req.body;
  const db = getDb();
  const c = db.prepare('SELECT id FROM portal_clients WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Client not found' });

  const id = uuid();
  db.prepare(`INSERT INTO portal_maintenance_reports (id, client_id, period, summary, details) VALUES (?,?,?,?,?)`)
    .run(id, c.id, period || '', summary || '', JSON.stringify(details || {}));
  res.json({ id });
});

// ── Create approval ──
router.post('/clients/:id/approvals', (req, res) => {
  const { title, kind, preview_url, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const c = db.prepare('SELECT id FROM portal_clients WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Client not found' });

  const id = uuid();
  db.prepare(`INSERT INTO portal_approvals (id, client_id, title, kind, preview_url, notes) VALUES (?,?,?,?,?,?)`)
    .run(id, c.id, title.slice(0, 300), kind || 'design', (preview_url || '').slice(0, 2000), (notes || '').slice(0, 2000));
  res.json({ id });
});

// ── Create proposal ──
router.post('/clients/:id/proposals', (req, res) => {
  const { title, body, total, currency } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const db = getDb();
  const c = db.prepare('SELECT id FROM portal_clients WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Client not found' });

  const id = uuid();
  db.prepare(`INSERT INTO portal_proposals (id, client_id, title, body, total, currency) VALUES (?,?,?,?,?,?)`)
    .run(id, c.id, title.slice(0, 300), (body || '').slice(0, 50000), parseFloat(total) || 0, currency || 'BAM');
  res.json({ id });
});

export default router;
