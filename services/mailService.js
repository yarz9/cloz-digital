import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { decrypt } from './crypto.js';
import { getDb } from '../database/init.js';
import { randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════
//  Resend API Client
// ══════════════════════════════════════════════════════════════

let resendClient = null;

function getResendClient() {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Check if Resend is configured and available.
 */
export function isResendConfigured() {
  return !!process.env.RESEND_API_KEY;
}

/**
 * Send an email via Resend API.
 * Returns { success, messageId, message, details }
 */
export async function sendViaResend({ from, to, cc, bcc, subject, text, html, replyTo, headers }) {
  const client = getResendClient();
  if (!client) {
    throw new Error('Resend API key not configured. Set RESEND_API_KEY in .env');
  }

  const toAddrs = Array.isArray(to) ? to : [to].filter(Boolean);
  const ccAddrs = cc ? (Array.isArray(cc) ? cc : [cc]).filter(Boolean) : undefined;
  const bccAddrs = bcc ? (Array.isArray(bcc) ? bcc : [bcc]).filter(Boolean) : undefined;

  const payload = {
    from,
    to: toAddrs,
    subject: subject || '(No Subject)',
    text: text || html?.replace(/<[^>]+>/g, '') || '',
    html: html || text || '',
  };

  if (ccAddrs?.length) payload.cc = ccAddrs;
  if (bccAddrs?.length) payload.bcc = bccAddrs;
  if (replyTo) payload.reply_to = replyTo;
  if (headers) payload.headers = headers;

  console.log(`[Resend] Sending: "${subject}" from ${from} to ${toAddrs.join(', ')}`);

  const { data, error } = await client.emails.send(payload);

  if (error) {
    console.error(`[Resend] Send failed: ${error.message}`);
    throw new Error(`Resend API error: ${error.message}`);
  }

  console.log(`[Resend] Sent successfully: messageId=${data.id}`);
  return {
    success: true,
    messageId: data.id,
    message: `Email sent via Resend`,
    details: { id: data.id },
  };
}

/**
 * Test Resend API connectivity and domain verification.
 */
export async function testResendConnection() {
  const client = getResendClient();
  if (!client) {
    return {
      success: false,
      message: 'Resend API key not configured. Set RESEND_API_KEY in .env',
      code: 'NO_API_KEY',
    };
  }

  try {
    // Verify API key by listing domains
    const { data, error } = await client.domains.list();
    if (error) {
      return {
        success: false,
        message: `Resend API error: ${error.message}`,
        code: 'API_ERROR',
      };
    }

    const domains = data?.data || [];
    const verifiedDomains = domains.filter(d => d.status === 'verified');

    return {
      success: true,
      message: `Resend connected. ${verifiedDomains.length} verified domain(s).`,
      details: {
        totalDomains: domains.length,
        verifiedDomains: verifiedDomains.map(d => d.name),
        domains: domains.map(d => ({ name: d.name, status: d.status })),
      },
    };
  } catch (err) {
    return {
      success: false,
      message: `Resend connection failed: ${err.message}`,
      code: err.code || 'UNKNOWN',
    };
  }
}


// ══════════════════════════════════════════════════════════════
//  IMAP Connection Service
// ══════════════════════════════════════════════════════════════

/**
 * Build ImapFlow config from account record.
 */
function buildImapConfig(account) {
  const password = decrypt(account.imap_password_encrypted);
  const secure = account.imap_encryption === 'ssl_tls';
  return {
    host: account.imap_host,
    port: account.imap_port || 993,
    secure,
    auth: {
      user: account.imap_username || account.email,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false, // accept self-signed in dev
    },
    logger: false,
  };
}

/**
 * Test IMAP connection. Returns { success, message, details }.
 */
export async function testImapConnection(account) {
  const config = buildImapConfig(account);
  if (!config.host || !config.auth.pass) {
    return { success: false, message: 'IMAP host and password are required' };
  }

  const client = new ImapFlow(config);
  try {
    await client.connect();
    const mailboxes = [];
    const tree = await client.listTree();
    function walk(folders) {
      for (const f of folders) {
        mailboxes.push(f.path);
        if (f.folders?.length) walk(f.folders);
      }
    }
    walk(tree.folders || []);
    await client.logout();
    return {
      success: true,
      message: `Connected successfully. Found ${mailboxes.length} folders.`,
      details: { folders: mailboxes.slice(0, 20), server: config.host },
    };
  } catch (err) {
    try { await client.logout(); } catch {}
    return {
      success: false,
      message: `IMAP connection failed: ${err.message}`,
      details: { error: err.code || err.message, host: config.host, port: config.port },
    };
  }
}

/**
 * Sync inbox messages from IMAP into the database.
 */
export async function syncImapMessages(account, options = {}) {
  const config = buildImapConfig(account);
  if (!config.host || !config.auth.pass) {
    return { success: false, message: 'IMAP not configured', synced: 0 };
  }

  const maxMessages = options.maxMessages || 50;
  const client = new ImapFlow(config);
  const db = getDb();
  let synced = 0;
  let errors = [];

  try {
    await client.connect();

    // Sync inbox
    const inboxFolder = account.inbox_folder || 'INBOX';
    const lock = await client.getMailboxLock(inboxFolder);

    try {
      // Fetch recent messages
      const messages = [];
      for await (const msg of client.fetch('1:*', {
        envelope: true,
        bodyStructure: true,
        source: true,
        uid: true,
      }, { changedSince: 0 })) {
        messages.push(msg);
        if (messages.length >= maxMessages) break;
      }

      // Process messages (newest first)
      messages.reverse();

      for (const msg of messages) {
        try {
          const envelope = msg.envelope;
          if (!envelope) continue;

          const messageId = `imap-${account.id}-${msg.uid}`;
          // Skip if already synced
          const existing = db.prepare('SELECT id FROM mail_messages WHERE id = ?').get(messageId);
          if (existing) continue;

          const fromAddr = envelope.from?.[0];
          const toAddrs = envelope.to || [];

          // Parse body from source
          let bodyText = '';
          if (msg.source) {
            const sourceStr = msg.source.toString();
            // Simple extraction — get text after double newline
            const bodyStart = sourceStr.indexOf('\r\n\r\n');
            if (bodyStart > -1) {
              bodyText = sourceStr.slice(bodyStart + 4).slice(0, 10000);
            }
          }

          db.prepare(`INSERT INTO mail_messages (id, account_id, folder, from_name, from_email, to_emails, subject, body_text, body_html, snippet, is_read, received_at, created_at)
            VALUES (?, ?, 'inbox', ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))`).run(
            messageId,
            account.id,
            fromAddr?.name || fromAddr?.address?.split('@')[0] || '',
            fromAddr?.address || '',
            JSON.stringify(toAddrs.map(a => a.address)),
            envelope.subject || '(No Subject)',
            bodyText,
            bodyText,
            (bodyText || '').slice(0, 120),
            envelope.date ? new Date(envelope.date).toISOString() : new Date().toISOString(),
          );
          synced++;
        } catch (msgErr) {
          errors.push(msgErr.message);
        }
      }
    } finally {
      lock.release();
    }

    // Optionally sync sent folder
    if (account.sync_sent) {
      try {
        const sentFolder = account.sent_folder || 'Sent';
        const sentLock = await client.getMailboxLock(sentFolder);
        try {
          for await (const msg of client.fetch('1:*', { envelope: true, uid: true }, { changedSince: 0 })) {
            const messageId = `imap-sent-${account.id}-${msg.uid}`;
            const existing = db.prepare('SELECT id FROM mail_messages WHERE id = ?').get(messageId);
            if (existing) continue;

            const envelope = msg.envelope;
            if (!envelope) continue;
            const fromAddr = envelope.from?.[0];
            const toAddrs = envelope.to || [];

            db.prepare(`INSERT INTO mail_messages (id, account_id, folder, from_name, from_email, to_emails, subject, body_text, snippet, is_read, is_sent, sent_at, created_at)
              VALUES (?, ?, 'sent', ?, ?, ?, ?, '', '', 1, 1, ?, datetime('now'))`).run(
              messageId, account.id,
              fromAddr?.name || '', fromAddr?.address || '',
              JSON.stringify(toAddrs.map(a => a.address)),
              envelope.subject || '',
              envelope.date ? new Date(envelope.date).toISOString() : new Date().toISOString(),
            );
            synced++;
          }
        } finally {
          sentLock.release();
        }
      } catch {
        // Sent folder may not exist or have different name
      }
    }

    await client.logout();

    // Update last_sync_at
    db.prepare('UPDATE mail_accounts SET last_sync_at = datetime("now") WHERE id = ?').run(account.id);

    return { success: true, message: `Synced ${synced} new messages`, synced, errors: errors.length > 0 ? errors : undefined };
  } catch (err) {
    try { await client.logout(); } catch {}
    return { success: false, message: `Sync failed: ${err.message}`, synced, errors: [err.message] };
  }
}


// ══════════════════════════════════════════════════════════════
//  SMTP Service (fallback — only used if explicitly enabled)
// ══════════════════════════════════════════════════════════════

const SMTP_TIMEOUT = 15000; // 15 seconds

/**
 * Build nodemailer transporter from account record.
 */
function buildSmtpTransport(account) {
  const password = decrypt(account.smtp_password_encrypted);
  const port = account.smtp_port || 465;
  const secure = account.smtp_encryption === 'starttls' ? false
    : account.smtp_encryption === 'none' ? false
    : (port === 465 ? true : account.smtp_encryption === 'ssl_tls');

  const config = {
    host: account.smtp_host,
    port,
    secure,
    auth: {
      user: account.smtp_username || account.email,
      pass: password,
    },
    connectionTimeout: SMTP_TIMEOUT,
    greetingTimeout: SMTP_TIMEOUT,
    socketTimeout: SMTP_TIMEOUT,
    tls: {
      rejectUnauthorized: false,
    },
  };

  console.log(`[SMTP] Transport config: host=${config.host}, port=${config.port}, secure=${config.secure}, user=${config.auth.user}, timeouts=${SMTP_TIMEOUT}ms`);
  return nodemailer.createTransport(config);
}

/**
 * Test SMTP connection. Returns { success, message }.
 */
export async function testSmtpConnection(account) {
  const password = decrypt(account.smtp_password_encrypted);
  if (!account.smtp_host) {
    return { success: false, message: 'SMTP host is required', code: 'NO_HOST' };
  }
  if (!password) {
    return { success: false, message: 'SMTP password is required', code: 'NO_PASS' };
  }

  let transporter;
  try {
    console.log(`[SMTP Test] Starting verify for ${account.email} → ${account.smtp_host}:${account.smtp_port}`);
    transporter = buildSmtpTransport(account);
    await transporter.verify();
    console.log(`[SMTP Test] Verify succeeded for ${account.email}`);
    return {
      success: true,
      message: 'SMTP connection verified successfully.',
      details: { host: account.smtp_host, port: account.smtp_port },
    };
  } catch (err) {
    console.error(`[SMTP Test] Verify failed for ${account.email}: code=${err.code} message=${err.message}`);
    return {
      success: false,
      message: `SMTP connection failed: ${err.message}`,
      code: err.code || 'UNKNOWN',
      details: { error: err.message, code: err.code, host: account.smtp_host, port: account.smtp_port },
    };
  } finally {
    try { transporter?.close(); } catch {}
  }
}

/**
 * Send an email via SMTP using account credentials.
 */
export async function sendViaSmtp(account, { to, cc, bcc, subject, text, html, replyTo }) {
  let transporter;
  try {
    transporter = buildSmtpTransport(account);

    const info = await transporter.sendMail({
      from: `"${account.display_name}" <${account.email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      subject,
      text: text || html?.replace(/<[^>]+>/g, '') || '',
      html: html || text || '',
      inReplyTo: replyTo || undefined,
    });

    console.log(`[SMTP] Email sent: ${subject} → ${to} (messageId: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      message: 'Email sent via SMTP',
      details: { messageId: info.messageId, response: info.response },
    };
  } finally {
    try { transporter?.close(); } catch {}
  }
}


// ══════════════════════════════════════════════════════════════
//  UNIFIED SEND — Resend first, SMTP fallback
// ══════════════════════════════════════════════════════════════

/**
 * Send an email using the best available transport.
 * Priority: Resend API (default) → SMTP (only if Resend unavailable and SMTP configured)
 *
 * @param {Object} account - Mail account record from DB
 * @param {Object} emailData - { to, cc, bcc, subject, text, html, replyTo }
 * @returns {{ success, messageId, message, transport, details }}
 */
export async function sendEmail(account, { to, cc, bcc, subject, text, html, replyTo }) {
  const fromAddress = `"${account.display_name}" <${account.email}>`;

  // 1. Try Resend API first (default transport)
  if (isResendConfigured()) {
    try {
      const result = await sendViaResend({
        from: fromAddress,
        to,
        cc,
        bcc,
        subject,
        text,
        html,
        replyTo,
      });
      return { ...result, transport: 'resend' };
    } catch (err) {
      console.error(`[Send] Resend failed for ${account.email}: ${err.message}`);
      // Fall through to SMTP if available
      if (account.smtp_host && decrypt(account.smtp_password_encrypted)) {
        console.log(`[Send] Falling back to SMTP for ${account.email}`);
      } else {
        throw err; // No fallback available
      }
    }
  }

  // 2. SMTP fallback
  const smtpPassword = decrypt(account.smtp_password_encrypted);
  if (account.smtp_host && smtpPassword) {
    const result = await sendViaSmtp(account, { to, cc, bcc, subject, text, html, replyTo });
    return { ...result, transport: 'smtp' };
  }

  throw new Error('No sending transport available. Configure RESEND_API_KEY or SMTP credentials.');
}

/**
 * Send a test email from the given account.
 */
export async function sendTestEmail(account) {
  try {
    console.log(`[Test Email] Sending test to ${account.email} via ${isResendConfigured() ? 'Resend' : 'SMTP'}`);

    const result = await sendEmail(account, {
      to: account.email,
      subject: `Cloz Digital — Send Test (${new Date().toLocaleTimeString()})`,
      text: `This is a test email from Cloz Digital Mail.\n\nAccount: ${account.display_name} <${account.email}>\nTransport: ${isResendConfigured() ? 'Resend API' : 'SMTP'}\nTime: ${new Date().toISOString()}\n\nIf you received this, outbound email is working correctly.`,
      html: `<div style="font-family:system-ui;max-width:480px;margin:0 auto;padding:20px">
        <h2 style="color:#3B82F6;margin-bottom:8px">Send Test Successful</h2>
        <p style="color:#666;font-size:14px">This is a test email from Cloz Digital Mail.</p>
        <hr style="border:none;border-top:1px solid #e5e5e5;margin:16px 0"/>
        <table style="font-size:13px;color:#444">
          <tr><td style="padding:4px 12px 4px 0;color:#888">Account:</td><td>${account.display_name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Email:</td><td>${account.email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Transport:</td><td>${isResendConfigured() ? 'Resend API' : 'SMTP'}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#888">Time:</td><td>${new Date().toISOString()}</td></tr>
        </table>
      </div>`,
    });

    // Update last test timestamp
    const db = getDb();
    db.prepare('UPDATE mail_accounts SET last_smtp_test_at = datetime("now") WHERE id = ?').run(account.id);

    console.log(`[Test Email] Success for ${account.email}: transport=${result.transport}, messageId=${result.messageId}`);
    return {
      success: true,
      message: `Test email sent to ${account.email} via ${result.transport}`,
      transport: result.transport,
      details: { messageId: result.messageId, transport: result.transport },
    };
  } catch (err) {
    console.error(`[Test Email] Failed for ${account.email}: ${err.message}`);
    return {
      success: false,
      message: `Failed to send test email: ${err.message}`,
      code: err.code || 'UNKNOWN',
      details: { error: err.message },
    };
  }
}


// ══════════════════════════════════════════════════════════════
//  Background Sync Worker
// ══════════════════════════════════════════════════════════════

let syncInterval = null;

/**
 * Start the background sync worker.
 * Checks all active accounts and syncs those with sync_enabled.
 */
export function startSyncWorker() {
  if (syncInterval) return;

  const run = async () => {
    try {
      const db = getDb();
      const accounts = db.prepare(
        'SELECT * FROM mail_accounts WHERE is_active = 1 AND sync_enabled = 1'
      ).all();

      for (const account of accounts) {
        const interval = (account.sync_interval_minutes || 15) * 60 * 1000;
        const lastSync = account.last_sync_at ? new Date(account.last_sync_at).getTime() : 0;
        const now = Date.now();

        if (now - lastSync >= interval) {
          console.log(`[Mail Sync] Syncing ${account.email}...`);
          const result = await syncImapMessages(account);
          console.log(`[Mail Sync] ${account.email}: ${result.message}`);
        }
      }
    } catch (err) {
      console.error('[Mail Sync] Worker error:', err.message);
    }
  };

  // Check every 60 seconds
  syncInterval = setInterval(run, 60 * 1000);
  // Run once on start (after 10 sec delay to let DB finish init)
  setTimeout(run, 10000);
}

/**
 * Stop the background sync worker.
 */
export function stopSyncWorker() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}


// ══════════════════════════════════════════════════════════════
//  Send Queue Processor — Resend first, SMTP fallback
// ══════════════════════════════════════════════════════════════

let queueInterval = null;

/**
 * Process the mail send queue — picks up pending messages and sends via Resend/SMTP.
 */
export function startSendQueueProcessor() {
  if (queueInterval) return;

  const process = async () => {
    try {
      const db = getDb();
      const pending = db.prepare(
        "SELECT q.*, m.from_email, m.to_emails, m.cc_emails, m.bcc_emails, m.subject, m.body_text, m.body_html, m.in_reply_to FROM mail_send_queue q JOIN mail_messages m ON q.message_id = m.id WHERE q.status = 'pending' OR (q.status = 'scheduled' AND q.scheduled_at <= datetime('now')) ORDER BY q.created_at ASC LIMIT 5"
      ).all();

      for (const item of pending) {
        const account = db.prepare('SELECT * FROM mail_accounts WHERE id = ? OR key = ?').get(item.account_id, item.account_id);
        if (!account) {
          db.prepare("UPDATE mail_send_queue SET status = 'failed', error = ?, attempted_at = datetime('now') WHERE id = ?").run('Account not found', item.id);
          continue;
        }

        // Check if any transport is available
        const hasResend = isResendConfigured();
        const hasSmtp = account.smtp_host && decrypt(account.smtp_password_encrypted);
        if (!hasResend && !hasSmtp) {
          db.prepare("UPDATE mail_send_queue SET status = 'failed', error = ?, attempted_at = datetime('now') WHERE id = ?").run('No sending transport configured (RESEND_API_KEY or SMTP)', item.id);
          continue;
        }

        try {
          const toEmails = JSON.parse(item.to_emails || '[]');
          const ccEmails = JSON.parse(item.cc_emails || '[]');
          const bccEmails = JSON.parse(item.bcc_emails || '[]');

          const result = await sendEmail(account, {
            to: toEmails,
            cc: ccEmails.length > 0 ? ccEmails : undefined,
            bcc: bccEmails.length > 0 ? bccEmails : undefined,
            subject: item.subject,
            text: item.body_text,
            html: item.body_html,
            replyTo: item.in_reply_to || undefined,
          });

          db.prepare("UPDATE mail_send_queue SET status = 'sent', attempted_at = datetime('now'), error = ? WHERE id = ?").run(
            `transport=${result.transport},messageId=${result.messageId}`, item.id
          );
          db.prepare("UPDATE mail_messages SET is_sent = 1, sent_at = datetime('now') WHERE id = ?").run(item.message_id);
        } catch (err) {
          db.prepare("UPDATE mail_send_queue SET status = 'failed', error = ?, attempted_at = datetime('now') WHERE id = ?").run(err.message, item.id);
        }
      }
    } catch (err) {
      console.error('[Mail Queue] Processor error:', err.message);
    }
  };

  queueInterval = setInterval(process, 30 * 1000);
  setTimeout(process, 15000);
}
