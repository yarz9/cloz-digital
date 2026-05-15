import { Router } from 'express';
import { getDb } from '../database/init.js';
import { encrypt, decrypt, maskPassword, isEncrypted } from '../services/crypto.js';
import { testImapConnection, testSmtpConnection, sendTestEmail, syncImapMessages, testResendConnection, isResendConfigured } from '../services/mailService.js';
import { addLog } from './logs.js';
import { randomUUID } from 'crypto';

const router = Router();

// ══════════════════════════════════════════════════════════════
//  PROVIDER PRESETS
// ══════════════════════════════════════════════════════════════

const PRESETS = {
  zoho: {
    name: 'Zoho Mail',
    imap_host: 'imap.zoho.com',
    imap_port: 993,
    imap_encryption: 'ssl_tls',
    smtp_host: 'smtp.zoho.com',
    smtp_port: 465,
    smtp_encryption: 'ssl_tls',
  },
  namecheap: {
    name: 'Namecheap Private Email',
    imap_host: 'mail.privateemail.com',
    imap_port: 993,
    imap_encryption: 'ssl_tls',
    smtp_host: 'mail.privateemail.com',
    smtp_port: 465,
    smtp_encryption: 'ssl_tls',
  },
  microsoft365: {
    name: 'Microsoft 365',
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_encryption: 'ssl_tls',
    smtp_host: 'smtp.office365.com',
    smtp_port: 587,
    smtp_encryption: 'starttls',
  },
  google: {
    name: 'Google Workspace',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_encryption: 'ssl_tls',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_encryption: 'starttls',
  },
  custom: {
    name: 'Custom Server',
    imap_host: '',
    imap_port: 993,
    imap_encryption: 'ssl_tls',
    smtp_host: '',
    smtp_port: 587,
    smtp_encryption: 'starttls',
  },
};

router.get('/presets', (_req, res) => {
  res.json(PRESETS);
});

// ══════════════════════════════════════════════════════════════
//  RESEND STATUS
// ══════════════════════════════════════════════════════════════

router.get('/resend-status', (_req, res) => {
  res.json({
    configured: isResendConfigured(),
    isDefault: isResendConfigured(),
  });
});

router.post('/test-resend', async (_req, res) => {
  try {
    const result = await testResendConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: `Resend test error: ${err.message}` });
  }
});

// ══════════════════════════════════════════════════════════════
//  DEFAULT STARTER ACCOUNTS
// ══════════════════════════════════════════════════════════════

const STARTER_ACCOUNTS = [
  { key: 'anes', account_name: 'Anes', display_name: 'Anes D.', email: 'anes@cloz.digital', title: 'Founder & Web Developer', signature: 'Warm regards,\nAnes D.\nFounder & Web Developer\nCloz Digital\nanes@cloz.digital\nwww.cloz.digital' },
  { key: 'denis', account_name: 'Denis', display_name: 'Denis G.', email: 'denis@cloz.digital', title: 'Client Success Manager', signature: 'Warm regards,\nDenis G.\nClient Success Manager\nCloz Digital\ndenis@cloz.digital\nwww.cloz.digital' },
  { key: 'general', account_name: 'General', display_name: 'Cloz Digital Team', email: 'general@cloz.digital', title: 'Website Design • Hosting • Maintenance', signature: 'Best regards,\nCloz Digital Team\nWebsite Design • Hosting • Maintenance\ngeneral@cloz.digital\nwww.cloz.digital', is_default: 1 },
  { key: 'billing', account_name: 'Billing', display_name: 'Cloz Digital Billing Department', email: 'billing@cloz.digital', title: 'Accounts & Billing', signature: 'Best regards,\nCloz Digital Billing Department\nAccounts & Billing\nCloz Digital\nbilling@cloz.digital\nwww.cloz.digital' },
];

/**
 * Seed starter accounts if none exist.
 */
export function seedMailAccounts(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM mail_accounts').get()?.c || 0;
  if (count > 0) return;

  for (const acct of STARTER_ACCOUNTS) {
    db.prepare(`INSERT OR IGNORE INTO mail_accounts (id, key, account_name, display_name, email, title, signature, is_active, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`).run(
      randomUUID(), acct.key, acct.account_name, acct.display_name, acct.email, acct.title, acct.signature, acct.is_default || 0,
    );
  }
}


// ══════════════════════════════════════════════════════════════
//  HELPERS — sanitize account for API response (never expose passwords)
// ══════════════════════════════════════════════════════════════

function sanitizeAccount(acct) {
  if (!acct) return null;
  const imapPass = decrypt(acct.imap_password_encrypted || '');
  const smtpPass = decrypt(acct.smtp_password_encrypted || '');
  return {
    ...acct,
    // Remove raw encrypted values
    imap_password_encrypted: undefined,
    smtp_password_encrypted: undefined,
    imap_pass: undefined,
    smtp_pass: undefined,
    // Add masked versions
    imap_password_set: !!imapPass,
    imap_password_masked: maskPassword(imapPass),
    smtp_password_set: !!smtpPass,
    smtp_password_masked: maskPassword(smtpPass),
    // Connection status
    imap_configured: !!(acct.imap_host && imapPass),
    smtp_configured: !!(acct.smtp_host && smtpPass),
    // Sending transport
    resend_configured: isResendConfigured(),
    send_transport: isResendConfigured() ? 'resend' : (!!(acct.smtp_host && smtpPass) ? 'smtp' : 'none'),
  };
}


// ══════════════════════════════════════════════════════════════
//  GET ALL ACCOUNTS
// ══════════════════════════════════════════════════════════════

router.get('/', (_req, res) => {
  const db = getDb();
  const accounts = db.prepare('SELECT * FROM mail_accounts ORDER BY is_default DESC, account_name ASC').all();
  res.json(accounts.map(sanitizeAccount));
});


// ══════════════════════════════════════════════════════════════
//  GET SINGLE ACCOUNT
// ══════════════════════════════════════════════════════════════

router.get('/:id', (req, res) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(sanitizeAccount(account));
});


// ══════════════════════════════════════════════════════════════
//  CREATE ACCOUNT
// ══════════════════════════════════════════════════════════════

router.post('/', (req, res) => {
  const db = getDb();
  const {
    account_name, display_name, email, description, title, signature,
    imap_host, imap_port, imap_username, imap_password, imap_encryption,
    smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption,
    sync_enabled, sync_interval_minutes, sync_sent, download_attachments,
    is_default, is_active,
    inbox_folder, sent_folder, drafts_folder, trash_folder, spam_folder,
  } = req.body;

  if (!email) return res.status(400).json({ error: 'Email address is required' });

  // Check duplicate email
  const existing = db.prepare('SELECT id FROM mail_accounts WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const id = randomUUID();
  const key = (account_name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '_');

  // Encrypt passwords
  const imapPassEnc = imap_password ? encrypt(imap_password) : '';
  const smtpPassEnc = smtp_password ? encrypt(smtp_password) : '';

  // If setting as default, unset others
  if (is_default) {
    db.prepare('UPDATE mail_accounts SET is_default = 0').run();
  }

  db.prepare(`INSERT INTO mail_accounts (
    id, key, account_name, display_name, email, description, title, signature,
    imap_host, imap_port, imap_username, imap_password_encrypted, imap_encryption,
    smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_encryption,
    sync_enabled, sync_interval_minutes, sync_sent, download_attachments,
    is_default, is_active,
    inbox_folder, sent_folder, drafts_folder, trash_folder, spam_folder,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
    id, key,
    account_name || email.split('@')[0],
    display_name || email.split('@')[0],
    email,
    description || '',
    title || '',
    signature || '',
    imap_host || '', imap_port || 993, imap_username || email, imapPassEnc, imap_encryption || 'ssl_tls',
    smtp_host || '', smtp_port || 587, smtp_username || email, smtpPassEnc, smtp_encryption || 'ssl_tls',
    sync_enabled ? 1 : 0, sync_interval_minutes || 15, sync_sent ? 1 : 0, download_attachments ? 1 : 0,
    is_default ? 1 : 0, is_active !== false ? 1 : 0,
    inbox_folder || 'INBOX', sent_folder || 'Sent', drafts_folder || 'Drafts', trash_folder || 'Trash', spam_folder || 'Spam',
  );

  addLog('info', `Mail account created: ${display_name || account_name} <${email}>`);
  const created = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(id);
  res.json(sanitizeAccount(created));
});


// ══════════════════════════════════════════════════════════════
//  UPDATE ACCOUNT
// ══════════════════════════════════════════════════════════════

router.put('/:id', (req, res) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const {
    account_name, display_name, email, description, title, signature,
    imap_host, imap_port, imap_username, imap_password, imap_encryption,
    smtp_host, smtp_port, smtp_username, smtp_password, smtp_encryption,
    sync_enabled, sync_interval_minutes, sync_sent, download_attachments,
    is_default, is_active,
    inbox_folder, sent_folder, drafts_folder, trash_folder, spam_folder,
  } = req.body;

  // Encrypt passwords only if new ones are provided
  const imapPassEnc = imap_password
    ? encrypt(imap_password)
    : account.imap_password_encrypted || '';
  const smtpPassEnc = smtp_password
    ? encrypt(smtp_password)
    : account.smtp_password_encrypted || '';

  // If setting as default, unset others
  if (is_default) {
    db.prepare('UPDATE mail_accounts SET is_default = 0').run();
  }

  db.prepare(`UPDATE mail_accounts SET
    account_name=?, display_name=?, email=?, description=?, title=?, signature=?,
    imap_host=?, imap_port=?, imap_username=?, imap_password_encrypted=?, imap_encryption=?,
    smtp_host=?, smtp_port=?, smtp_username=?, smtp_password_encrypted=?, smtp_encryption=?,
    sync_enabled=?, sync_interval_minutes=?, sync_sent=?, download_attachments=?,
    is_default=?, is_active=?,
    inbox_folder=?, sent_folder=?, drafts_folder=?, trash_folder=?, spam_folder=?,
    updated_at=datetime('now')
  WHERE id=?`).run(
    account_name ?? account.account_name,
    display_name ?? account.display_name,
    email ?? account.email,
    description ?? account.description ?? '',
    title ?? account.title ?? '',
    signature ?? account.signature ?? '',
    imap_host ?? account.imap_host ?? '',
    imap_port ?? account.imap_port ?? 993,
    imap_username ?? account.imap_username ?? account.email,
    imapPassEnc,
    imap_encryption ?? account.imap_encryption ?? 'ssl_tls',
    smtp_host ?? account.smtp_host ?? '',
    smtp_port ?? account.smtp_port ?? 587,
    smtp_username ?? account.smtp_username ?? account.email,
    smtpPassEnc,
    smtp_encryption ?? account.smtp_encryption ?? 'ssl_tls',
    sync_enabled !== undefined ? (sync_enabled ? 1 : 0) : account.sync_enabled ?? 0,
    sync_interval_minutes ?? account.sync_interval_minutes ?? 15,
    sync_sent !== undefined ? (sync_sent ? 1 : 0) : account.sync_sent ?? 0,
    download_attachments !== undefined ? (download_attachments ? 1 : 0) : account.download_attachments ?? 0,
    is_default !== undefined ? (is_default ? 1 : 0) : account.is_default ?? 0,
    is_active !== undefined ? (is_active ? 1 : 0) : account.is_active ?? 1,
    inbox_folder ?? account.inbox_folder ?? 'INBOX',
    sent_folder ?? account.sent_folder ?? 'Sent',
    drafts_folder ?? account.drafts_folder ?? 'Drafts',
    trash_folder ?? account.trash_folder ?? 'Trash',
    spam_folder ?? account.spam_folder ?? 'Spam',
    req.params.id,
  );

  addLog('info', `Mail account updated: ${display_name || account.display_name} <${email || account.email}>`);
  const updated = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
  res.json(sanitizeAccount(updated));
});


// ══════════════════════════════════════════════════════════════
//  DELETE ACCOUNT
// ══════════════════════════════════════════════════════════════

router.delete('/:id', (req, res) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  db.prepare('DELETE FROM mail_accounts WHERE id = ?').run(req.params.id);
  addLog('info', `Mail account deleted: ${account.display_name} <${account.email}>`);
  res.json({ deleted: true, email: account.email });
});


// ══════════════════════════════════════════════════════════════
//  TEST IMAP
// ══════════════════════════════════════════════════════════════

router.post('/:id/test-imap', async (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await testImapConnection(account);

    if (result.success) {
      db.prepare('UPDATE mail_accounts SET last_imap_test_at = datetime("now") WHERE id = ?').run(req.params.id);
    }

    addLog(result.success ? 'info' : 'warning', `IMAP test ${result.success ? 'passed' : 'failed'} for ${account.email}: ${result.message}`);
    res.json(result);
  } catch (err) {
    console.error(`[IMAP Test Route] Unhandled error: ${err.message}`);
    res.status(500).json({ success: false, message: `IMAP test error: ${err.message}`, code: err.code || 'UNKNOWN' });
  }
});


// ══════════════════════════════════════════════════════════════
//  TEST SMTP
// ══════════════════════════════════════════════════════════════

router.post('/:id/test-smtp', async (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await testSmtpConnection(account);

    if (result.success) {
      db.prepare('UPDATE mail_accounts SET last_smtp_test_at = datetime("now") WHERE id = ?').run(req.params.id);
    }

    addLog(result.success ? 'info' : 'warning', `SMTP test ${result.success ? 'passed' : 'failed'} for ${account.email}: ${result.message}`);
    res.json(result);
  } catch (err) {
    console.error(`[SMTP Test Route] Unhandled error: ${err.message}`);
    res.status(500).json({ success: false, message: `SMTP test error: ${err.message}`, code: err.code || 'UNKNOWN' });
  }
});


// ══════════════════════════════════════════════════════════════
//  SEND TEST EMAIL
// ══════════════════════════════════════════════════════════════

router.post('/:id/send-test', async (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await sendTestEmail(account);
    addLog(result.success ? 'info' : 'warning', `Test email ${result.success ? 'sent' : 'failed'} for ${account.email}`);
    res.json(result);
  } catch (err) {
    console.error(`[Send Test Route] Unhandled error: ${err.message}`);
    res.status(500).json({ success: false, message: `Send test error: ${err.message}`, code: err.code || 'UNKNOWN' });
  }
});


// ══════════════════════════════════════════════════════════════
//  SYNC NOW
// ══════════════════════════════════════════════════════════════

router.post('/:id/sync', async (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ?').get(req.params.id);
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const result = await syncImapMessages(account, { maxMessages: 100 });
    addLog(result.success ? 'info' : 'warning', `Mail sync for ${account.email}: ${result.message}`);
    res.json(result);
  } catch (err) {
    console.error(`[Sync Route] Unhandled error: ${err.message}`);
    res.status(500).json({ success: false, message: `Sync error: ${err.message}`, code: err.code || 'UNKNOWN' });
  }
});


export default router;
