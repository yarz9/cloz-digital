import { Router } from 'express';
import { getDb } from '../database/init.js';
import { getActiveProvider } from '../providers/index.js';
import { addLog } from './logs.js';
import { randomUUID } from 'crypto';

const router = Router();

// ══════════════════════════════════════════════════════════════
//  SENDER PROFILES — the four official Cloz Digital identities
// ══════════════════════════════════════════════════════════════

const SENDER_PROFILES = {
  anes: {
    key: 'anes',
    displayName: 'Anes D.',
    title: 'Founder & Web Developer',
    email: 'anes@cloz.digital',
    signature: `Warm regards,\nAnes D.\nFounder & Web Developer\nCloz Digital\nanes@cloz.digital\ncloz.digital`,
  },
  denis: {
    key: 'denis',
    displayName: 'Denis G.',
    title: 'Client Success Manager',
    email: 'denis@cloz.digital',
    signature: `Warm regards,\nDenis G.\nClient Success Manager\nCloz Digital\ndenis@cloz.digital\ncloz.digital`,
  },
  general: {
    key: 'general',
    displayName: 'Cloz Digital Team',
    title: 'Website Design • Hosting • Maintenance',
    email: 'general@cloz.digital',
    signature: `Best regards,\nCloz Digital Team\nWebsite Design • Hosting • Maintenance\ngeneral@cloz.digital\ncloz.digital`,
  },
  billing: {
    key: 'billing',
    displayName: 'Cloz Digital Billing Department',
    title: 'Accounts & Billing',
    email: 'billing@cloz.digital',
    signature: `Best regards,\nCloz Digital Billing Department\nAccounts & Billing\nCloz Digital\nbilling@cloz.digital\ncloz.digital`,
  },
};

// Billing template categories auto-route to billing sender
const BILLING_CATEGORIES = [
  'invoice', 'payment-receipt', 'payment-confirmation', 'overdue-reminder',
  'final-notice', 'renewal-invoice', 'refund', 'billing-clarification',
];

function getSender(key) {
  return SENDER_PROFILES[key] || SENDER_PROFILES.general;
}

function getConfig() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM config').all();
  const c = rows.reduce((o, r) => { o[r.key] = r.value; return o; }, {});
  return {
    temperature: parseFloat(c.temperature) || 0.7,
    maxTokens: parseInt(c.maxTokens) || 2048,
    timeout: parseInt(c.timeout) || 30000,
  };
}

// ══════════════════════════════════════════════════════════════
//  SENDER PROFILES ENDPOINT
// ══════════════════════════════════════════════════════════════

router.get('/senders', (_req, res) => {
  res.json(Object.values(SENDER_PROFILES));
});

// ══════════════════════════════════════════════════════════════
//  FOLDERS
// ══════════════════════════════════════════════════════════════

const SYSTEM_FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: 'inbox', type: 'system' },
  { key: 'sent', label: 'Sent', icon: 'send', type: 'system' },
  { key: 'drafts', label: 'Drafts', icon: 'file-edit', type: 'system' },
  { key: 'outbox', label: 'Outbox', icon: 'upload', type: 'system' },
  { key: 'scheduled', label: 'Scheduled', icon: 'clock', type: 'system' },
  { key: 'starred', label: 'Starred', icon: 'star', type: 'system' },
  { key: 'archive', label: 'Archive', icon: 'archive', type: 'system' },
  { key: 'trash', label: 'Trash', icon: 'trash', type: 'system' },
  { key: 'spam', label: 'Spam', icon: 'alert-triangle', type: 'system' },
  { key: 'templates', label: 'Templates', icon: 'layout-template', type: 'system' },
];

const BUSINESS_FOLDERS = [
  { key: 'leads', label: 'Leads', icon: 'target', type: 'business' },
  { key: 'clients', label: 'Clients', icon: 'users', type: 'business' },
  { key: 'billing', label: 'Billing', icon: 'receipt', type: 'business' },
  { key: 'support', label: 'Support', icon: 'life-buoy', type: 'business' },
  { key: 'outreach', label: 'Outreach', icon: 'megaphone', type: 'business' },
  { key: 'follow-ups', label: 'Follow-Ups', icon: 'repeat', type: 'business' },
];

router.get('/folders', (_req, res) => {
  const db = getDb();
  const counts = {};
  try {
    const rows = db.prepare(`
      SELECT folder, COUNT(*) as count, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
      FROM mail_messages WHERE folder != 'trash' GROUP BY folder
    `).all();
    rows.forEach(r => { counts[r.folder] = { total: r.count, unread: r.unread }; });
  } catch { /* empty db */ }

  const addCounts = (folders) => folders.map(f => ({
    ...f,
    total: counts[f.key]?.total || 0,
    unread: counts[f.key]?.unread || 0,
  }));

  res.json({
    system: addCounts(SYSTEM_FOLDERS),
    business: addCounts(BUSINESS_FOLDERS),
  });
});

// ══════════════════════════════════════════════════════════════
//  MESSAGES — list, get, search
// ══════════════════════════════════════════════════════════════

router.get('/messages', (req, res) => {
  const db = getDb();
  const { folder = 'inbox', account, search, label, starred, limit = 50, offset = 0 } = req.query;

  let sql = `SELECT * FROM mail_messages WHERE 1=1`;
  const params = [];

  if (folder === 'starred') {
    sql += ` AND is_starred = 1`;
  } else if (folder === 'drafts') {
    sql += ` AND is_draft = 1`;
  } else {
    sql += ` AND folder = ?`;
    params.push(folder);
  }

  if (account) { sql += ` AND account_id = ?`; params.push(account); }
  if (starred === '1') { sql += ` AND is_starred = 1`; }
  if (search) { sql += ` AND (subject LIKE ? OR body_text LIKE ? OR from_email LIKE ?)`; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (label) { sql += ` AND labels LIKE ?`; params.push(`%"${label}"%`); }

  sql += ` ORDER BY COALESCE(received_at, created_at) DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const messages = db.prepare(sql).all(...params);
  // Parse JSON fields
  const parsed = messages.map(m => ({
    ...m,
    to_emails: safeJson(m.to_emails),
    cc_emails: safeJson(m.cc_emails),
    bcc_emails: safeJson(m.bcc_emails),
    labels: safeJson(m.labels),
    attachments: safeJson(m.attachments),
  }));

  res.json({ messages: parsed, folder });
});

router.get('/messages/:id', (req, res) => {
  const db = getDb();
  const msg = db.prepare('SELECT * FROM mail_messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  // Mark as read
  if (!msg.is_read) {
    db.prepare('UPDATE mail_messages SET is_read = 1, updated_at = datetime("now") WHERE id = ?').run(msg.id);
  }

  // Get thread messages
  let thread = [];
  if (msg.thread_id) {
    thread = db.prepare('SELECT * FROM mail_messages WHERE thread_id = ? ORDER BY created_at ASC').all(msg.thread_id);
    thread = thread.map(m => ({ ...m, to_emails: safeJson(m.to_emails), cc_emails: safeJson(m.cc_emails), labels: safeJson(m.labels), attachments: safeJson(m.attachments) }));
  }

  res.json({
    message: { ...msg, to_emails: safeJson(msg.to_emails), cc_emails: safeJson(msg.cc_emails), bcc_emails: safeJson(msg.bcc_emails), labels: safeJson(msg.labels), attachments: safeJson(msg.attachments) },
    thread,
  });
});

// ══════════════════════════════════════════════════════════════
//  COMPOSE / SAVE DRAFT / SEND
// ══════════════════════════════════════════════════════════════

router.post('/compose', (req, res) => {
  const { sender = 'general', to, cc, bcc, subject, body, labels, replyTo, isDraft = true } = req.body;
  const profile = getSender(sender);
  const id = randomUUID();
  const threadId = replyTo || id;
  const db = getDb();

  db.prepare(`INSERT INTO mail_messages (id, account_id, thread_id, folder, from_name, from_email, to_emails, cc_emails, bcc_emails, subject, body_text, body_html, labels, is_draft, is_read, snippet)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`).run(
    id, profile.key, threadId, isDraft ? 'drafts' : 'outbox',
    profile.displayName, profile.email,
    JSON.stringify(Array.isArray(to) ? to : [to].filter(Boolean)),
    JSON.stringify(Array.isArray(cc) ? cc : [cc].filter(Boolean)),
    JSON.stringify(Array.isArray(bcc) ? bcc : [bcc].filter(Boolean)),
    subject || '', body || '', body || '',
    JSON.stringify(labels || []),
    isDraft ? 1 : 0,
    (body || '').slice(0, 120),
  );

  // Upsert contacts
  const allEmails = [].concat(to || [], cc || [], bcc || []).filter(Boolean);
  upsertContacts(db, allEmails);

  addLog('info', `Email ${isDraft ? 'draft saved' : 'composed'}: "${subject}" from ${profile.email}`);
  res.json({ id, sender: profile, isDraft });
});

router.post('/save-draft', (req, res) => {
  const { id, sender, to, cc, bcc, subject, body, labels } = req.body;
  const db = getDb();

  if (id) {
    // Update existing draft
    const profile = getSender(sender);
    db.prepare(`UPDATE mail_messages SET account_id=?, from_name=?, from_email=?, to_emails=?, cc_emails=?, bcc_emails=?, subject=?, body_text=?, body_html=?, labels=?, snippet=?, updated_at=datetime("now")
      WHERE id=? AND is_draft=1`).run(
      profile.key, profile.displayName, profile.email,
      JSON.stringify(Array.isArray(to) ? to : [to].filter(Boolean)),
      JSON.stringify(Array.isArray(cc) ? cc : [cc].filter(Boolean)),
      JSON.stringify(Array.isArray(bcc) ? bcc : [bcc].filter(Boolean)),
      subject || '', body || '', body || '',
      JSON.stringify(labels || []),
      (body || '').slice(0, 120), id,
    );
    res.json({ id, updated: true });
  } else {
    // Create new draft
    req.body.isDraft = true;
    return router.handle({ ...req, method: 'POST', url: '/compose', body: req.body }, res);
  }
});

router.post('/send', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'message id required' });
  const db = getDb();

  const msg = db.prepare('SELECT * FROM mail_messages WHERE id = ?').get(id);
  if (!msg) return res.status(404).json({ error: 'Message not found' });

  // Mark as sent
  const now = new Date().toISOString();
  db.prepare(`UPDATE mail_messages SET folder='sent', is_draft=0, is_sent=1, sent_at=?, updated_at=? WHERE id=?`).run(now, now, id);

  // Add to send queue for SMTP delivery
  db.prepare(`INSERT INTO mail_send_queue (id, message_id, account_id, status, created_at) VALUES (?, ?, ?, 'pending', datetime("now"))`).run(randomUUID(), id, msg.account_id);

  addLog('info', `Email sent: "${msg.subject}" to ${msg.to_emails} from ${msg.from_email}`);
  res.json({ sent: true, id, sentAt: now });
});

// ══════════════════════════════════════════════════════════════
//  REPLY / FORWARD
// ══════════════════════════════════════════════════════════════

router.post('/reply', (req, res) => {
  const { messageId, sender = 'general', body, replyAll = false } = req.body;
  if (!messageId || !body) return res.status(400).json({ error: 'messageId and body required' });
  const db = getDb();

  const original = db.prepare('SELECT * FROM mail_messages WHERE id = ?').get(messageId);
  if (!original) return res.status(404).json({ error: 'Original message not found' });

  const profile = getSender(sender);
  const id = randomUUID();
  const toEmails = replyAll
    ? [...new Set([original.from_email, ...safeJson(original.to_emails)].filter(e => e !== profile.email))]
    : [original.from_email];

  db.prepare(`INSERT INTO mail_messages (id, account_id, thread_id, folder, from_name, from_email, to_emails, subject, body_text, body_html, in_reply_to, is_sent, is_read, sent_at, snippet)
    VALUES (?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?, ?, 1, 1, datetime("now"), ?)`).run(
    id, profile.key, original.thread_id || original.id,
    profile.displayName, profile.email,
    JSON.stringify(toEmails),
    `Re: ${original.subject.replace(/^Re:\s*/i, '')}`,
    body, body, original.id,
    body.slice(0, 120),
  );

  addLog('info', `Reply sent to ${toEmails.join(', ')} from ${profile.email}`);
  res.json({ id, sent: true });
});

router.post('/forward', (req, res) => {
  const { messageId, sender = 'general', to, note } = req.body;
  if (!messageId || !to) return res.status(400).json({ error: 'messageId and to required' });
  const db = getDb();

  const original = db.prepare('SELECT * FROM mail_messages WHERE id = ?').get(messageId);
  if (!original) return res.status(404).json({ error: 'Original message not found' });

  const profile = getSender(sender);
  const id = randomUUID();
  const forwardBody = `${note ? note + '\n\n' : ''}---------- Forwarded message ----------\nFrom: ${original.from_name} <${original.from_email}>\nSubject: ${original.subject}\n\n${original.body_text}`;

  db.prepare(`INSERT INTO mail_messages (id, account_id, thread_id, folder, from_name, from_email, to_emails, subject, body_text, body_html, is_sent, is_read, sent_at, snippet)
    VALUES (?, ?, ?, 'sent', ?, ?, ?, ?, ?, ?, 1, 1, datetime("now"), ?)`).run(
    id, profile.key, randomUUID(),
    profile.displayName, profile.email,
    JSON.stringify(Array.isArray(to) ? to : [to]),
    `Fwd: ${original.subject}`,
    forwardBody, forwardBody,
    forwardBody.slice(0, 120),
  );

  res.json({ id, forwarded: true });
});

// ══════════════════════════════════════════════════════════════
//  SCHEDULE
// ══════════════════════════════════════════════════════════════

router.post('/schedule', (req, res) => {
  const { id, scheduledAt } = req.body;
  if (!id || !scheduledAt) return res.status(400).json({ error: 'id and scheduledAt required' });
  const db = getDb();

  db.prepare(`UPDATE mail_messages SET folder='scheduled', scheduled_at=?, is_draft=0, updated_at=datetime("now") WHERE id=?`).run(scheduledAt, id);
  db.prepare(`INSERT INTO mail_send_queue (id, message_id, account_id, status, scheduled_at, created_at) VALUES (?, ?, (SELECT account_id FROM mail_messages WHERE id=?), 'scheduled', ?, datetime("now"))`).run(randomUUID(), id, id, scheduledAt);

  res.json({ scheduled: true, scheduledAt });
});

// ══════════════════════════════════════════════════════════════
//  MESSAGE ACTIONS — star, label, move, delete
// ══════════════════════════════════════════════════════════════

router.patch('/messages/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { is_starred, is_read, folder, labels, priority } = req.body;

  if (is_starred !== undefined) db.prepare('UPDATE mail_messages SET is_starred=?, updated_at=datetime("now") WHERE id=?').run(is_starred ? 1 : 0, id);
  if (is_read !== undefined) db.prepare('UPDATE mail_messages SET is_read=?, updated_at=datetime("now") WHERE id=?').run(is_read ? 1 : 0, id);
  if (folder) db.prepare('UPDATE mail_messages SET folder=?, updated_at=datetime("now") WHERE id=?').run(folder, id);
  if (labels) db.prepare('UPDATE mail_messages SET labels=?, updated_at=datetime("now") WHERE id=?').run(JSON.stringify(labels), id);
  if (priority) db.prepare('UPDATE mail_messages SET priority=?, updated_at=datetime("now") WHERE id=?').run(priority, id);

  res.json({ updated: true });
});

router.delete('/messages/:id', (req, res) => {
  const db = getDb();
  const msg = db.prepare('SELECT folder FROM mail_messages WHERE id = ?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Not found' });

  if (msg.folder === 'trash') {
    db.prepare('DELETE FROM mail_messages WHERE id = ?').run(req.params.id);
    res.json({ deleted: true });
  } else {
    db.prepare('UPDATE mail_messages SET folder = "trash", updated_at = datetime("now") WHERE id = ?').run(req.params.id);
    res.json({ trashed: true });
  }
});

// ══════════════════════════════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════════════════════════════

router.get('/templates', (_req, res) => {
  const db = getDb();
  const templates = db.prepare('SELECT * FROM mail_templates ORDER BY category, name').all();
  res.json(templates.map(t => ({ ...t, variables: safeJson(t.variables) })));
});

router.post('/templates', (req, res) => {
  const { name, category, subject, body, defaultAccount, variables } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const db = getDb();
  const id = randomUUID();
  db.prepare('INSERT INTO mail_templates (id, name, category, subject, body, default_account, variables) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    id, name, category || 'general', subject || '', body || '',
    defaultAccount || 'general', JSON.stringify(variables || []),
  );
  res.json({ id, created: true });
});

// ══════════════════════════════════════════════════════════════
//  CONTACTS
// ══════════════════════════════════════════════════════════════

router.get('/contacts', (req, res) => {
  const db = getDb();
  const { search, type } = req.query;
  let sql = 'SELECT * FROM mail_contacts WHERE 1=1';
  const params = [];
  if (search) { sql += ' AND (name LIKE ? OR email LIKE ? OR company LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY name ASC LIMIT 100';
  const contacts = db.prepare(sql).all(...params);
  res.json(contacts.map(c => ({ ...c, tags: safeJson(c.tags) })));
});

// ══════════════════════════════════════════════════════════════
//  STATS / DASHBOARD
// ══════════════════════════════════════════════════════════════

router.get('/stats', (_req, res) => {
  const db = getDb();
  try {
    const unread = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE folder='inbox' AND is_read=0").get()?.c || 0;
    const today = new Date().toISOString().slice(0, 10);
    const sentToday = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE is_sent=1 AND sent_at LIKE ?").get(`${today}%`)?.c || 0;
    const drafts = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE is_draft=1").get()?.c || 0;
    const scheduled = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE folder='scheduled'").get()?.c || 0;
    const starred = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE is_starred=1").get()?.c || 0;
    const totalSent = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE is_sent=1").get()?.c || 0;
    const totalReceived = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE folder='inbox'").get()?.c || 0;
    const followUps = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE folder='follow-ups'").get()?.c || 0;
    const billingFolder = db.prepare("SELECT COUNT(*) as c FROM mail_messages WHERE folder='billing' AND is_read=0").get()?.c || 0;

    res.json({ unread, sentToday, drafts, scheduled, starred, totalSent, totalReceived, followUps, billingUnread: billingFolder });
  } catch {
    res.json({ unread: 0, sentToday: 0, drafts: 0, scheduled: 0, starred: 0, totalSent: 0, totalReceived: 0, followUps: 0, billingUnread: 0 });
  }
});

// ══════════════════════════════════════════════════════════════
//  AI — Generate, Rewrite, Summarize, Suggest Reply
// ══════════════════════════════════════════════════════════════

router.post('/generate', async (req, res) => {
  const { sender = 'general', to, purpose, context, tone, category, template, clientName, amount, dueDate, invoiceNumber, points } = req.body;
  if (!purpose) return res.status(400).json({ error: 'purpose required' });

  // Auto-route billing categories to billing sender
  const effectiveSender = BILLING_CATEGORIES.includes(category) ? 'billing' : sender;
  const profile = getSender(effectiveSender);

  try {
    const provider = getActiveProvider();

    const prompt = `You are ${profile.displayName}, ${profile.title} at Cloz Digital.
Draft a professional email.

Sender: ${profile.displayName} (${profile.email})
Recipient: ${to || 'Client'}
Purpose: ${purpose}
${category ? `Category: ${category}` : ''}
${context ? `Context: ${context}` : ''}
Tone: ${tone || 'professional, friendly'}
${clientName ? `Client: ${clientName}` : ''}
${amount ? `Amount: ${amount}` : ''}
${invoiceNumber ? `Invoice: ${invoiceNumber}` : ''}
${dueDate ? `Due Date: ${dueDate}` : ''}
${points ? `Key points: ${points}` : ''}

Requirements:
- Write a complete, ready-to-send email
- End with the exact signature below (no modifications)
- Never use placeholder text like [Your Name] or [Company]
- Keep it concise and effective

Signature:
${profile.signature}`;

    const schema = {
      type: 'object',
      properties: {
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Complete email body including signature' },
        suggestedLabels: { type: 'array', items: { type: 'string' }, description: 'Suggested labels' },
      },
      required: ['subject', 'body'],
    };

    const result = await provider.generateStructured(prompt, schema, {
      ...getConfig(), temperature: 0.5, task: 'email-draft',
    });

    addLog('info', `[AI] Email generated: "${result.data?.subject}" via ${profile.email} [${result.modelGroup}/${result.model}]`);
    res.json({ ...result, sender: profile });
  } catch (e) {
    addLog('error', `Email generate failed: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

router.post('/rewrite', async (req, res) => {
  const { body, tone = 'professional', sender = 'general' } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });
  const profile = getSender(sender);

  try {
    const provider = getActiveProvider();
    const prompt = `Rewrite the following email in a ${tone} tone. Keep the same meaning and information. The sender is ${profile.displayName} (${profile.email}).

Email to rewrite:
${body}

End with this signature:
${profile.signature}

Return only the rewritten email body.`;

    const result = await provider.generate(prompt, {
      ...getConfig(), temperature: 0.4, task: 'rewrite',
    });
    res.json({ ...result, sender: profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/summarize', async (req, res) => {
  const { threadMessages, body } = req.body;
  const content = threadMessages
    ? threadMessages.map(m => `From: ${m.from_name}\nSubject: ${m.subject}\n${m.body_text}`).join('\n---\n')
    : body;
  if (!content) return res.status(400).json({ error: 'body or threadMessages required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        actionItems: { type: 'array', items: { type: 'string' } },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative', 'urgent'] },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        suggestedCategory: { type: 'string' },
      },
      required: ['summary', 'actionItems', 'sentiment', 'priority'],
    };

    const result = await provider.generateStructured(
      `Analyze this email thread and provide a summary, action items, sentiment, and priority:\n\n${content}`,
      schema,
      { ...getConfig(), temperature: 0.3, task: 'summarize' },
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/suggest-reply', async (req, res) => {
  const { messageId, sender = 'general', context } = req.body;
  if (!messageId) return res.status(400).json({ error: 'messageId required' });
  const db = getDb();

  const msg = db.prepare('SELECT * FROM mail_messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const profile = getSender(sender);

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tone: { type: 'string' },
              subject: { type: 'string' },
              body: { type: 'string' },
            },
          },
        },
      },
      required: ['suggestions'],
    };

    const result = await provider.generateStructured(
      `You are ${profile.displayName} (${profile.email}), ${profile.title} at Cloz Digital.

Generate 3 reply suggestions with different tones (professional, friendly, concise) for this email:

From: ${msg.from_name} <${msg.from_email}>
Subject: ${msg.subject}
Body: ${msg.body_text}
${context ? `Additional context: ${context}` : ''}

Each reply must end with:
${profile.signature}

Never use placeholder text.`,
      schema,
      { ...getConfig(), temperature: 0.6, maxTokens: 4096, task: 'email-draft' },
    );
    res.json({ ...result, sender: profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI: Subject line generator ──
router.post('/generate-subject', async (req, res) => {
  const { body, purpose, category } = req.body;
  if (!body && !purpose) return res.status(400).json({ error: 'body or purpose required' });

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        subjects: { type: 'array', items: { type: 'string' }, description: '5 subject line options' },
      },
      required: ['subjects'],
    };

    const result = await provider.generateStructured(
      `Generate 5 email subject line options for this ${category || 'business'} email.\n\n${purpose ? `Purpose: ${purpose}` : ''}\n${body ? `Email body:\n${body}` : ''}\n\nMake them concise, compelling, and professional. Vary the style (direct, question, benefit-focused, etc).`,
      schema,
      { ...getConfig(), temperature: 0.7, task: 'email-draft' },
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI: Follow-up generator ──
router.post('/generate-followup', async (req, res) => {
  const { messageId, sender = 'general', daysSince, context } = req.body;
  if (!messageId) return res.status(400).json({ error: 'messageId required' });
  const db = getDb();

  const msg = db.prepare('SELECT * FROM mail_messages WHERE id = ?').get(messageId);
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  const profile = getSender(sender);

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: {
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['subject', 'body'],
    };

    const result = await provider.generateStructured(
      `You are ${profile.displayName} (${profile.email}), ${profile.title} at Cloz Digital.

Write a follow-up email for this original email that was sent ${daysSince || 'a few'} days ago with no response.

Original email:
Subject: ${msg.subject}
To: ${msg.to_emails}
Body: ${msg.body_text}
${context ? `Context: ${context}` : ''}

The follow-up should be shorter than the original, reference it naturally, and provide a gentle nudge. End with:
${profile.signature}`,
      schema,
      { ...getConfig(), temperature: 0.5, task: 'email-draft' },
    );
    res.json({ ...result, sender: profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI: Translate ──
router.post('/translate', async (req, res) => {
  const { body, targetLang = 'Bosnian' } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });

  try {
    const provider = getActiveProvider();
    const result = await provider.generate(
      `Translate the following email to ${targetLang}. Preserve formatting and tone. Return only the translated text:\n\n${body}`,
      { ...getConfig(), temperature: 0.3, task: 'translate' },
    );
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── AI: Billing-specific generators ──
router.post('/generate-invoice-email', async (req, res) => {
  const { clientName, invoiceNumber, amount, dueDate, items, currency = 'EUR' } = req.body;
  if (!clientName || !amount) return res.status(400).json({ error: 'clientName and amount required' });
  const profile = getSender('billing');

  try {
    const provider = getActiveProvider();
    const schema = {
      type: 'object',
      properties: { subject: { type: 'string' }, body: { type: 'string' } },
      required: ['subject', 'body'],
    };

    const result = await provider.generateStructured(
      `You are the Cloz Digital Billing Department (billing@cloz.digital).

Draft a professional invoice delivery email.
Client: ${clientName}
Invoice: ${invoiceNumber || 'Attached'}
Amount: ${currency} ${amount}
Due Date: ${dueDate || '15 days from today'}
${items ? `Services: ${items}` : ''}

Be clear, formal, and trustworthy. Include payment instructions placeholder. End with:
${profile.signature}`,
      schema,
      { ...getConfig(), temperature: 0.3, task: 'email-draft' },
    );
    res.json({ ...result, sender: profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/generate-payment-reminder', async (req, res) => {
  const { clientName, invoiceNumber, amount, daysOverdue, escalation = 'friendly', currency = 'EUR' } = req.body;
  if (!clientName || !amount) return res.status(400).json({ error: 'clientName and amount required' });
  const profile = getSender('billing');

  try {
    const provider = getActiveProvider();
    const toneMap = {
      friendly: 'friendly and understanding — assume the client simply forgot',
      firm: 'firm but respectful — this is a second reminder',
      final: 'formal and urgent — this is a final notice before service suspension',
    };

    const schema = {
      type: 'object',
      properties: { subject: { type: 'string' }, body: { type: 'string' } },
      required: ['subject', 'body'],
    };

    const result = await provider.generateStructured(
      `You are the Cloz Digital Billing Department (billing@cloz.digital).

Draft a payment reminder email.
Client: ${clientName}
Invoice: ${invoiceNumber || 'See attached'}
Amount: ${currency} ${amount}
Days Overdue: ${daysOverdue || 'Unknown'}
Tone: ${toneMap[escalation] || toneMap.friendly}

End with:
${profile.signature}`,
      schema,
      { ...getConfig(), temperature: 0.3, task: 'email-draft' },
    );
    res.json({ ...result, sender: profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  SYNC — placeholder for IMAP integration
// ══════════════════════════════════════════════════════════════

router.post('/sync', async (_req, res) => {
  // In production, this will connect to IMAP servers and sync messages
  // For now, return sync status
  res.json({
    status: 'ready',
    message: 'IMAP sync ready. Configure mail account credentials in settings to enable.',
    accounts: Object.keys(SENDER_PROFILES).map(k => ({
      key: k,
      email: SENDER_PROFILES[k].email,
      configured: false,
    })),
  });
});

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

function safeJson(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

function upsertContacts(db, emails) {
  for (const email of emails) {
    if (!email) continue;
    const existing = db.prepare('SELECT id FROM mail_contacts WHERE email = ?').get(email);
    if (!existing) {
      db.prepare('INSERT INTO mail_contacts (id, email, name, created_at) VALUES (?, ?, ?, datetime("now"))').run(
        randomUUID(), email, email.split('@')[0],
      );
    } else {
      db.prepare('UPDATE mail_contacts SET message_count = message_count + 1, last_contacted = datetime("now") WHERE email = ?').run(email);
    }
  }
}

export default router;
