// routes/legal.js — Legal & Compliance Center
import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '../database/init.js';
import { getActiveProvider } from '../providers/index.js';
import { sendViaResend, isResendConfigured } from '../services/mailService.js';
import { logInfo, logError } from '../services/logger.js';
import { buildUrl } from '../config/urls.js';

const router = Router();

// ══════════════════════════════════════════════════════════════
//  LEGAL TEMPLATES (admin)
// ══════════════════════════════════════════════════════════════

router.get('/templates', (req, res) => {
  const db = getDb();
  const { category } = req.query;
  let sql = 'SELECT * FROM legal_templates WHERE 1=1';
  const params = [];
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY category, title';
  const rows = db.prepare(sql).all(...params);
  res.json({ templates: rows });
});

router.get('/templates/:slug', (req, res) => {
  const db = getDb();
  const tpl = db.prepare('SELECT * FROM legal_templates WHERE slug = ?').get(req.params.slug);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  res.json(tpl);
});

router.patch('/templates/:slug', (req, res) => {
  const { body, change_note } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  const db = getDb();
  const tpl = db.prepare('SELECT * FROM legal_templates WHERE slug = ?').get(req.params.slug);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });

  const newVersion = (tpl.version || 1) + 1;
  // Save the previous version as a snapshot
  db.prepare(`INSERT INTO legal_versions (id, template_slug, version, body, effective_date, change_note) VALUES (?,?,?,?,?,?)`)
    .run(uuid(), tpl.slug, tpl.version || 1, tpl.body, tpl.effective_date || '', change_note || 'Previous version');

  db.prepare(`UPDATE legal_templates SET body = ?, version = ?, updated_at = datetime('now'), effective_date = ? WHERE slug = ?`)
    .run(body, newVersion, new Date().toISOString().slice(0, 10), tpl.slug);

  logInfo(`Legal template updated: ${tpl.slug} v${newVersion}`, { category: 'audit', event_type: 'legal_template_updated', entity_type: 'legal', entity_id: tpl.id });
  res.json({ success: true, version: newVersion });
});

// Public read for the live public legal pages
router.get('/public/:slug', (req, res) => {
  const db = getDb();
  const tpl = db.prepare(`SELECT slug, title, body, version, effective_date FROM legal_templates WHERE slug = ? AND category = 'public' AND published = 1`).get(req.params.slug);
  if (!tpl) return res.status(404).json({ error: 'Page not found' });
  // Substitute {{effective_date}} if present
  const body = tpl.body.replace(/\{\{effective_date\}\}/g, tpl.effective_date || new Date().toISOString().slice(0, 10));
  res.json({ ...tpl, body });
});

// Version history
router.get('/templates/:slug/versions', (req, res) => {
  const db = getDb();
  const rows = db.prepare(`SELECT id, version, effective_date, change_note, created_at FROM legal_versions WHERE template_slug = ? ORDER BY version DESC`).all(req.params.slug);
  res.json({ versions: rows });
});

// ══════════════════════════════════════════════════════════════
//  AI CLIENT LEGAL GENERATOR
// ══════════════════════════════════════════════════════════════

router.post('/client-generate', async (req, res) => {
  const {
    document_type,
    business_name,
    business_url,
    country = 'Bosnia and Herzegovina',
    industry,
    data_practices = [],
    has_ecommerce = false,
    has_newsletter = false,
    has_booking = false,
    uses_analytics = false,
    uses_marketing_pixels = false,
    contact_email,
    save_for_client_id,
  } = req.body;

  if (!document_type) return res.status(400).json({ error: 'document_type required (privacy_policy | cookie_policy | terms_of_service | refund_policy | disclaimer)' });
  if (!business_name) return res.status(400).json({ error: 'business_name required' });

  const validTypes = ['privacy_policy', 'cookie_policy', 'terms_of_service', 'refund_policy', 'disclaimer'];
  if (!validTypes.includes(document_type)) return res.status(400).json({ error: `Invalid document_type. Allowed: ${validTypes.join(', ')}` });

  try {
    const provider = getActiveProvider();

    const dataPracticesText = Array.isArray(data_practices) ? data_practices.join(', ') : (data_practices || 'standard contact form data');

    const prompt = `Generate a professional ${document_type.replace(/_/g, ' ')} for the following business. Output markdown only. Be specific, accurate, and avoid generic placeholder text.

BUSINESS PROFILE:
- Business: ${business_name}
- URL: ${business_url || 'not yet set'}
- Industry: ${industry || 'general'}
- Country: ${country}
- Data practices: ${dataPracticesText}
- E-commerce: ${has_ecommerce ? 'yes' : 'no'}
- Newsletter: ${has_newsletter ? 'yes' : 'no'}
- Booking system: ${has_booking ? 'yes' : 'no'}
- Analytics: ${uses_analytics ? 'yes' : 'no'}
- Marketing pixels: ${uses_marketing_pixels ? 'yes' : 'no'}
- Contact email: ${contact_email || 'not provided'}

RULES:
- Cover all relevant sections for ${document_type}.
- Include effective date placeholder {{effective_date}}.
- Adapt depth to actual practices (don't mention e-commerce if no e-commerce).
- Use clear, plain language. No fluff.
- For Bosnia/EU clients, include lawful-basis and rights language consistent with GDPR.
- End with a disclaimer that this is a template, not legal advice.

Output the document body only.`;

    const result = await provider.generate(prompt, { temperature: 0.3, maxTokens: 4000, task: 'content-generate' });

    // Optional: save to legal_documents
    let documentId = null;
    if (save_for_client_id && result.text) {
      const db = getDb();
      documentId = uuid();
      const params = { document_type, business_name, business_url, country, industry, data_practices, has_ecommerce, has_newsletter, has_booking, uses_analytics, uses_marketing_pixels, contact_email };
      db.prepare(`INSERT INTO legal_documents (id, template_slug, client_id, title, kind, body, params, effective_date) VALUES (?,?,?,?,?,?,?,?)`)
        .run(documentId, document_type, save_for_client_id, `${business_name} — ${document_type.replace(/_/g, ' ')}`, 'client', result.text, JSON.stringify(params), new Date().toISOString().slice(0, 10));
    }

    res.json({ text: result.text, documentId, latencyMs: result.latencyMs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// List generated client documents
router.get('/documents', (req, res) => {
  const db = getDb();
  const { client_id } = req.query;
  let sql = 'SELECT id, title, template_slug, client_id, version, effective_date, created_at FROM legal_documents WHERE 1=1';
  const params = [];
  if (client_id) { sql += ' AND client_id = ?'; params.push(client_id); }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  res.json({ documents: db.prepare(sql).all(...params) });
});

router.get('/documents/:id', (req, res) => {
  const db = getDb();
  const doc = db.prepare('SELECT * FROM legal_documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  res.json(doc);
});

router.delete('/documents/:id', (req, res) => {
  getDb().prepare('DELETE FROM legal_documents WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ══════════════════════════════════════════════════════════════
//  COOKIE CONSENT
// ══════════════════════════════════════════════════════════════

router.post('/consent', (req, res) => {
  const { visitor_id, necessary, analytics, marketing, policy_version } = req.body;
  if (!visitor_id) return res.status(400).json({ error: 'visitor_id required' });

  const db = getDb();
  const id = uuid();
  db.prepare(`INSERT INTO cookie_consents (id, visitor_id, necessary, analytics, marketing, policy_version, ip_address, user_agent) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, visitor_id, necessary ? 1 : 0, analytics ? 1 : 0, marketing ? 1 : 0,
         policy_version || '1', (req.ip || '').slice(0, 100), (req.headers['user-agent'] || '').slice(0, 300));
  res.json({ success: true, id });
});

// Admin: consent summary
router.get('/consents/summary', (_req, res) => {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM cookie_consents').get()?.c || 0;
  const analytics = db.prepare('SELECT COUNT(*) as c FROM cookie_consents WHERE analytics = 1').get()?.c || 0;
  const marketing = db.prepare('SELECT COUNT(*) as c FROM cookie_consents WHERE marketing = 1').get()?.c || 0;
  const recent = db.prepare(`SELECT id, visitor_id, analytics, marketing, policy_version, ip_address, created_at FROM cookie_consents ORDER BY created_at DESC LIMIT 50`).all();
  res.json({ total, analytics, marketing, recent });
});

// ══════════════════════════════════════════════════════════════
//  PRIVACY REQUESTS — data subject requests
// ══════════════════════════════════════════════════════════════

router.post('/privacy-requests', async (req, res) => {
  const { kind, name, email, message } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Valid email required' });
  if (!['access', 'export', 'correction', 'deletion', 'opt_out', 'other'].includes(kind)) {
    return res.status(400).json({ error: 'Invalid kind' });
  }

  const db = getDb();
  const id = uuid();
  db.prepare(`INSERT INTO privacy_requests (id, kind, name, email, message) VALUES (?,?,?,?,?)`)
    .run(id, kind, (name || '').slice(0, 200), email.toLowerCase().trim(), (message || '').slice(0, 4000));

  logInfo(`Privacy request submitted: ${kind} from ${email}`, { category: 'security', event_type: 'privacy_request', entity_type: 'privacy_request', entity_id: id });

  // Notify internal team
  if (isResendConfigured()) {
    try {
      await sendViaResend({
        from: process.env.PORTAL_FROM || 'Cloz Digital <general@cloz.digital>',
        to: (process.env.PORTAL_INTERNAL_TO || 'general@cloz.digital').split(',').map(s => s.trim()),
        replyTo: email,
        subject: `New ${kind} privacy request from ${email}`,
        text: `Privacy request received\n\nType: ${kind}\nFrom: ${name || '(no name)'} <${email}>\n\nMessage:\n${message || '(none)'}\n\nView all: ${buildUrl('/management/legal')}\n\nWe must respond within 30 days.`,
        html: `<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0B0B0D;color:#F5F5F7;">
          <h2 style="margin:0 0 4px;">Privacy Request</h2>
          <p style="margin:0;color:#A1A1AA;font-size:13px;">Type: ${kind} &middot; From: ${escapeHtml(email)}</p>
          <div style="margin:16px 0;padding:16px;background:#18181C;border-radius:8px;color:#A1A1AA;font-size:13px;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message || '(no message)')}</div>
          <p style="margin:0;font-size:12px;color:#A1A1AA;">We must respond within 30 days.</p>
        </div>`,
      });
    } catch (e) { logError(`Privacy request notification failed: ${e.message}`); }
  }

  res.json({ success: true, id });
});

router.get('/privacy-requests', (req, res) => {
  const db = getDb();
  const { status } = req.query;
  let sql = 'SELECT * FROM privacy_requests WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  res.json({ requests: db.prepare(sql).all(...params) });
});

router.patch('/privacy-requests/:id', (req, res) => {
  const { status, notes, assignee } = req.body;
  const db = getDb();
  const r = db.prepare('SELECT id FROM privacy_requests WHERE id = ?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  const updates = []; const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  if (assignee !== undefined) { updates.push('assignee = ?'); params.push(assignee); }
  if (status === 'resolved') updates.push(`resolved_at = datetime('now')`);
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  params.push(req.params.id);
  db.prepare(`UPDATE privacy_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export default router;
