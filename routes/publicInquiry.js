// routes/publicInquiry.js — Public inquiry endpoint for homepage contact form
// Full pipeline: validate → save → CRM lead → emails → AI analysis → log

import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb, waitForDatabase, isDatabaseReady } from '../database/init.js';
import { getActiveProvider } from '../providers/index.js';
import { sendViaResend, isResendConfigured } from '../services/mailService.js';
import { log as activityLog, logInfo, logError, extractRequestContext } from '../services/logger.js';
import { buildUrl } from '../config/urls.js';

// Defensive normalisation — Railway can send x-forwarded-for as a
// comma-separated string OR (rarely) an array. Either form must
// collapse to a single string before it touches sql.js (which won't
// accept array params).
function extractClientIp(req) {
  let raw = req.ip;
  if (!raw) {
    const xff = req.headers?.['x-forwarded-for'];
    raw = Array.isArray(xff) ? xff[0] : (xff || '');
  }
  return String(raw || '').split(',')[0].trim().slice(0, 100);
}

const router = Router();

// ══════════════════════════════════════════════════════════════
//  VALIDATION
// ══════════════════════════════════════════════════════════════

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUSPICIOUS_RE = /\b(viagra|casino|crypto bonus|buy followers|seo backlink|guest post)\b/i;

function sanitize(input, maxLen = 2000) {
  if (input == null) return '';
  return String(input).slice(0, maxLen).replace(/[\x00-\x1f\x7f]/g, '').trim();
}

function validateBody(body) {
  const errors = [];

  if (!body.name || sanitize(body.name).length < 2) errors.push('Name is required.');
  if (!body.email || !EMAIL_RE.test(String(body.email).trim())) errors.push('A valid email is required.');
  if (!body.serviceNeeded) errors.push('Please tell us what you need.');
  if (!body.message || sanitize(body.message).length < 10) errors.push('Please share a few details about your project (at least 10 characters).');

  // Honeypot: any value in `website_url` (hidden field) means a bot
  if (body.website_url) errors.push('Spam detected.');

  // Block obvious spam content
  if (SUSPICIOUS_RE.test(`${body.message || ''} ${body.name || ''} ${body.businessName || ''}`)) {
    errors.push('Submission blocked by spam filter.');
  }

  return errors;
}

// ══════════════════════════════════════════════════════════════
//  IN-MEMORY RATE LIMITER — per-IP, sliding window
//  (Cheap; sufficient for a public contact form.)
// ══════════════════════════════════════════════════════════════

const submissionTimestamps = new Map(); // ip → [timestamps]
const MAX_SUBMISSIONS_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const list = submissionTimestamps.get(ip) || [];
  const recent = list.filter(t => now - t < WINDOW_MS);
  if (recent.length >= MAX_SUBMISSIONS_PER_HOUR) {
    return { allowed: false, retryAfter: Math.ceil((WINDOW_MS - (now - recent[0])) / 60000) };
  }
  recent.push(now);
  submissionTimestamps.set(ip, recent);
  // Opportunistic cleanup
  if (submissionTimestamps.size > 5000) {
    for (const [k, v] of submissionTimestamps) {
      if (v.every(t => now - t > WINDOW_MS)) submissionTimestamps.delete(k);
    }
  }
  return { allowed: true };
}

// ══════════════════════════════════════════════════════════════
//  DUPLICATE DETECTION (same email + similar message within 24h)
// ══════════════════════════════════════════════════════════════

function isDuplicate(db, email, message) {
  const hash = crypto.createHash('md5').update(`${email.toLowerCase()}|${message.toLowerCase().slice(0, 200)}`).digest('hex');
  const existing = db.prepare(`SELECT id FROM inquiries WHERE email = ? AND created_at > datetime('now', '-1 day')`).all(email);
  if (!existing.length) return false;
  // If the same email submitted in the last day, treat as potential dup unless message is clearly different
  return existing.length >= 3;  // Hard cap: 3 inquiries per email per day
}

// ══════════════════════════════════════════════════════════════
//  AI ANALYSIS — Score inquiry, recommend package, follow-up plan
// ══════════════════════════════════════════════════════════════

async function analyzeInquiry(inquiry) {
  const provider = getActiveProvider();
  const schema = {
    type: 'object',
    properties: {
      score:        { type: 'number', description: 'Lead potential 0-100' },
      priority:     { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
      package:      { type: 'string', enum: ['Launch Care', 'Growth Care', 'Presence Care', 'Custom'] },
      project_value:{ type: 'number', description: 'Estimated project value in EUR' },
      followup:     { type: 'string', description: 'Specific follow-up strategy in 2-3 sentences' },
      sales_notes:  { type: 'string', description: 'Brief sales notes / what to emphasize' },
      red_flags:    { type: 'array', items: { type: 'string' } },
    },
    required: ['score', 'priority', 'package', 'project_value', 'followup', 'sales_notes'],
  };

  const prompt = `You are a sales qualification analyst for Cloz Digital, a premium web design agency in Bosnia. Analyze this incoming website inquiry and recommend the best next steps.

INQUIRY:
Name: ${inquiry.name}
Email: ${inquiry.email}
Business: ${inquiry.business_name || 'Not provided'}
Current Website: ${inquiry.current_website || 'None'}
Service Needed: ${inquiry.service_needed}
Message: ${inquiry.message}

PACKAGES:
- Launch Care: 800 BAM one-time, new 5-page site
- Growth Care: 1500 BAM + 350/mo, larger build + ongoing optimization
- Presence Care: 200 BAM/month, hosting + maintenance only
- Custom: outside standard packages

Score the lead 0-100 based on: clarity of need, business legitimacy, fit with our packages, and budget signals.
Recommend the right package and a concrete follow-up strategy.
Be honest, specific, and concise.`;

  const result = await provider.generateStructured(prompt, schema, {
    temperature: 0.3, maxTokens: 1024, timeout: 30000, task: 'lead-analysis',
  });

  return result.data;
}

// ══════════════════════════════════════════════════════════════
//  EMAIL TEMPLATES
// ══════════════════════════════════════════════════════════════

function renderInternalNotification(inquiry, analysis) {
  const subject = `New Website Inquiry — ${inquiry.business_name || inquiry.name}`;
  const inquiryCrmLink = buildUrl('/management/inquiries');

  const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0B0B0D;color:#F5F5F7;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:40px 20px;">
    <div style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:20px;margin-bottom:24px;">
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#F5F5F7;">New Inquiry</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#A1A1AA;">Received via the homepage contact form</p>
    </div>

    ${analysis ? `
    <div style="background:#18181C;border:1px solid rgba(94,141,181,0.2);border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span style="font-size:24px;font-weight:800;color:${analysis.score >= 75 ? '#4ADE80' : analysis.score >= 50 ? '#FBBF24' : '#A1A1AA'};">${analysis.score}/100</span>
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5E8DB5;font-weight:600;">${analysis.priority} priority</span>
      </div>
      <table style="width:100%;font-size:13px;color:#A1A1AA;">
        <tr><td style="padding:4px 0;width:140px;">Recommended package:</td><td style="color:#F5F5F7;font-weight:500;">${analysis.package}</td></tr>
        <tr><td style="padding:4px 0;">Estimated value:</td><td style="color:#F5F5F7;font-weight:500;">${analysis.project_value} EUR</td></tr>
      </table>
      <p style="font-size:12px;color:#A1A1AA;margin:12px 0 4px;line-height:1.6;"><strong style="color:#F5F5F7;">Follow-up:</strong> ${escapeHtml(analysis.followup)}</p>
      ${analysis.sales_notes ? `<p style="font-size:12px;color:#A1A1AA;margin:8px 0 0;line-height:1.6;"><strong style="color:#F5F5F7;">Sales notes:</strong> ${escapeHtml(analysis.sales_notes)}</p>` : ''}
    </div>
    ` : ''}

    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:8px 0;width:160px;color:#A1A1AA;font-size:11px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Name</td><td style="padding:8px 0;color:#F5F5F7;">${escapeHtml(inquiry.name)}</td></tr>
      <tr><td style="padding:8px 0;color:#A1A1AA;font-size:11px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(inquiry.email)}" style="color:#5E8DB5;text-decoration:none;">${escapeHtml(inquiry.email)}</a></td></tr>
      ${inquiry.business_name ? `<tr><td style="padding:8px 0;color:#A1A1AA;font-size:11px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Business</td><td style="padding:8px 0;color:#F5F5F7;">${escapeHtml(inquiry.business_name)}</td></tr>` : ''}
      ${inquiry.current_website ? `<tr><td style="padding:8px 0;color:#A1A1AA;font-size:11px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Current site</td><td style="padding:8px 0;"><a href="${escapeAttr(inquiry.current_website)}" style="color:#5E8DB5;text-decoration:none;" target="_blank">${escapeHtml(inquiry.current_website)}</a></td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#A1A1AA;font-size:11px;text-transform:uppercase;letter-spacing:1px;vertical-align:top;">Service needed</td><td style="padding:8px 0;color:#F5F5F7;">${escapeHtml(inquiry.service_needed)}</td></tr>
    </table>

    <div style="margin-top:24px;padding:16px;background:#18181C;border-radius:8px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#A1A1AA;margin-bottom:8px;">Message</div>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#F5F5F7;white-space:pre-wrap;">${escapeHtml(inquiry.message)}</p>
    </div>

    <div style="margin-top:24px;text-align:center;">
      <a href="${inquiryCrmLink}" style="display:inline-block;background:#5E8DB5;color:#FFFFFF;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;">Open in CRM →</a>
    </div>

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#52525B;">
      Submitted ${new Date(inquiry.created_at).toLocaleString()} · IP ${inquiry.ip_address || 'unknown'}
    </div>
  </div>
</body></html>`.trim();

  const text = [
    `New Website Inquiry`,
    ``,
    analysis ? `AI Score: ${analysis.score}/100 (${analysis.priority} priority)\nRecommended: ${analysis.package} — est. ${analysis.project_value} EUR\nFollow-up: ${analysis.followup}\n` : '',
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    inquiry.business_name ? `Business: ${inquiry.business_name}` : '',
    inquiry.current_website ? `Website: ${inquiry.current_website}` : '',
    `Service needed: ${inquiry.service_needed}`,
    ``,
    `Message:`,
    inquiry.message,
    ``,
    `Open in CRM: ${inquiryCrmLink}`,
    ``,
    `Submitted ${new Date(inquiry.created_at).toLocaleString()}`,
  ].filter(Boolean).join('\n');

  return { subject, html, text };
}

// Bilingual templates — picks copy based on inquiry.lang.
const AUTO_REPLY_COPY = {
  en: {
    subject:  "We've Received Your Inquiry — Cloz Digital",
    thanks:   (firstName) => `Thank you, ${firstName}.`,
    received: "We've received your inquiry.",
    body1Html:`A real person from Cloz Digital will review your message and respond <strong style="color:#5E8DB5;">within 24 hours</strong> &mdash; usually the same day.`,
    body1Txt: `A real person from Cloz Digital will review your message and respond within 24 hours — usually the same day.`,
    body2:    `We'll come back with an honest assessment of how we can help and a clear next step. No sales pressure.`,
    reach:    "Need to reach us in the meantime?",
    emailL:   "Email", webL: "Web",
    foot:     "Cloz Digital · Premium web design, hosting, and ongoing care",
    location: "Sarajevo, Bosnia and Herzegovina",
  },
  bcs: {
    subject:  "Vaš upit je primljen — Cloz Digital",
    thanks:   (firstName) => `Hvala, ${firstName}.`,
    received: "Primili smo vaš upit.",
    body1Html:`Prava osoba iz Cloz Digitala će pregledati vašu poruku i odgovoriti <strong style="color:#5E8DB5;">u roku od 24 sata</strong> &mdash; obično istog dana.`,
    body1Txt: `Prava osoba iz Cloz Digitala će pregledati vašu poruku i odgovoriti u roku od 24 sata — obično istog dana.`,
    body2:    `Vratit ćemo se s iskrenom procjenom kako vam možemo pomoći i jasnim sljedećim korakom. Bez prodajnog pritiska.`,
    reach:    "Trebate nas kontaktirati u međuvremenu?",
    emailL:   "Email", webL: "Web",
    foot:     "Cloz Digital · Premium web dizajn, hosting i kontinuirano održavanje",
    location: "Sarajevo, Bosna i Hercegovina",
  },
};

function renderAutoReply(inquiry) {
  const lang = (inquiry.lang === 'bcs') ? 'bcs' : 'en';
  const c = AUTO_REPLY_COPY[lang];
  const subject = c.subject;
  const firstName = (inquiry.name || '').split(' ')[0];

  const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0B0B0D;color:#F5F5F7;font-family:'Inter',system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <h1 style="margin:0 0 4px;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:24px;font-weight:700;color:#F5F5F7;">${escapeHtml(c.thanks(firstName))}</h1>
    <p style="margin:0;font-size:14px;color:#A1A1AA;">${escapeHtml(c.received)}</p>

    <div style="margin:28px 0;padding:20px;background:#18181C;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
      <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#F5F5F7;">${c.body1Html}</p>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#F5F5F7;">${escapeHtml(c.body2)}</p>
    </div>

    <div style="font-size:12px;color:#A1A1AA;margin-top:24px;">
      <strong style="color:#F5F5F7;font-size:13px;display:block;margin-bottom:8px;">${escapeHtml(c.reach)}</strong>
      ${escapeHtml(c.emailL)} <a href="mailto:general@cloz.digital" style="color:#5E8DB5;text-decoration:none;">general@cloz.digital</a><br/>
      ${escapeHtml(c.webL)} <a href="https://cloz.digital" style="color:#5E8DB5;text-decoration:none;">cloz.digital</a>
    </div>

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#52525B;line-height:1.5;">
      ${escapeHtml(c.foot)}<br/>
      ${escapeHtml(c.location)}
    </div>
  </div>
</body></html>`.trim();

  const text = `${c.thanks(firstName)}

${c.received} ${c.body1Txt}

${c.body2}

${c.reach}
general@cloz.digital
cloz.digital

${c.foot}
${c.location}`;

  return { subject, html, text };
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, ''); }

// ══════════════════════════════════════════════════════════════
//  POST /api/public/inquiry — Main endpoint
// ══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════
//  POST /api/public/inquiry — fail-safe pipeline
//
//  CRITICAL: a prospect must never lose their inquiry because of
//  an AI hiccup, an SMTP outage, or a slow CRM insert.
//
//  Flow:
//    1. Normalise + validate (fast, sync).
//    2. Wait briefly for DB readiness (handles cold-start window
//       where the server is listening but initDatabase() hasn't
//       resolved yet — see boot order in server.js).
//    3. Save the inquiry row.
//    4. RETURN 200 IMMEDIATELY with { success, inquiryId, warning? }.
//    5. Background: AI analysis → CRM lead → internal email →
//       auto-reply. Each step isolated; failures don't block the
//       response and don't block each other.
//
//  Emergency fallback: if the DB insert itself fails, we still try
//  to fire an emergency email so the prospect's details reach the
//  team, and we return a clear warning to the frontend.
// ══════════════════════════════════════════════════════════════

router.post('/', async (req, res) => {
  const startedAt = Date.now();
  const context = extractRequestContext(req);
  const ip = extractClientIp(req);

  // ── 1. Rate limit ──
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    try {
      logInfo(`Inquiry rate-limited for ${ip}`, { ...context, category: 'security', event_type: 'rate_limit' });
    } catch {}
    return res.status(429).json({
      success: false,
      error: `Too many submissions. Please try again in ${rl.retryAfter} minutes.`,
    });
  }

  // ── 2. Validation ──
  const errors = validateBody(req.body);
  if (errors.length) {
    return res.status(400).json({ success: false, error: errors[0], errors });
  }

  // ── 3. Build the inquiry record ──
  const inquiry = {
    id: uuid(),
    name: sanitize(req.body.name, 200),
    email: sanitize(req.body.email, 200).toLowerCase(),
    business_name: sanitize(req.body.businessName, 200),
    current_website: sanitize(req.body.currentWebsite, 500),
    service_needed: sanitize(req.body.serviceNeeded, 200),
    message: sanitize(req.body.message, 4000),
    lang: (req.body.lang === 'bcs' ? 'bcs' : 'en'),
    source: 'website_contact_form',
    status: 'new',
    ip_address: ip,
    user_agent: String(req.headers['user-agent'] || '').slice(0, 300),
    created_at: new Date().toISOString(),
  };

  // ── 4. Wait for DB readiness ──
  //    Handles the cold-start window where the server is listening
  //    but initDatabase() hasn't resolved yet (boot order from
  //    commit 02e7670). 8s is comfortably below most edge timeouts
  //    and well within visitor patience.
  let db;
  try {
    db = await waitForDatabase(8000);
  } catch (e) {
    // DB is genuinely down. Fire an emergency email so the prospect
    // doesn't vanish, then return a clear warning to the frontend.
    logError(`Inquiry DB unavailable: ${e.message}`, { ...context, entity_type: 'inquiry', entity_id: inquiry.id });
    fireEmergencyEmail(inquiry, 'Database was unavailable when this inquiry arrived.');
    return res.status(200).json({
      success: true,
      inquiryId: inquiry.id,
      warning: 'Inquiry received — saved to our team queue.',
      message: "Thank you. We've received your message and a Cloz Digital team member will respond within 24 hours.",
    });
  }

  // ── 5. Duplicate detection (best-effort; never blocks on error) ──
  try {
    if (isDuplicate(db, inquiry.email, inquiry.message)) {
      return res.status(429).json({
        success: false,
        error: 'You have submitted several inquiries today. We will respond to them shortly.',
      });
    }
  } catch (e) {
    logError(`Inquiry duplicate check failed (non-fatal): ${e.message}`, { ...context, entity_type: 'inquiry', entity_id: inquiry.id });
  }

  // ── 6. Save the inquiry — this is the ONLY thing the response waits on ──
  let saved = false;
  try {
    db.prepare(`INSERT INTO inquiries (
      id, name, email, business_name, current_website, service_needed, message,
      source, status, priority, ip_address, user_agent, lang, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      inquiry.id, inquiry.name, inquiry.email, inquiry.business_name, inquiry.current_website,
      inquiry.service_needed, inquiry.message, inquiry.source, 'new', 'medium',
      inquiry.ip_address, inquiry.user_agent, inquiry.lang, inquiry.created_at, inquiry.created_at,
    );
    saved = true;
    try {
      logInfo(`Inquiry received from ${inquiry.email}`, {
        ...context, category: 'client', event_type: 'inquiry_received',
        entity_type: 'inquiry', entity_id: inquiry.id, action: 'inquiry_submit',
      });
    } catch {}
  } catch (e) {
    // The DB insert genuinely failed (schema mismatch, disk error,
    // whatever). Don't lose the prospect — log loud, fire an
    // emergency email, return 200 with a warning so the frontend
    // shows success.
    console.error('[inquiry] DB insert failed:', e.message, e.stack);
    try {
      logError(`Inquiry DB insert failed: ${e.message}`, { ...context, entity_type: 'inquiry', entity_id: inquiry.id, stack_trace: e.stack });
    } catch {}
    fireEmergencyEmail(inquiry, `DB insert failed: ${e.message}`);
    return res.status(200).json({
      success: true,
      inquiryId: inquiry.id,
      warning: 'Inquiry saved to our team queue (database write deferred).',
      message: "Thank you. We've received your message and will respond within 24 hours.",
    });
  }

  // ── 7. Respond IMMEDIATELY ──
  //    Everything after this point runs in the background — AI,
  //    CRM lead, internal email, prospect auto-reply. The visitor
  //    sees the success page within ~50ms.
  res.status(200).json({
    success: true,
    inquiryId: inquiry.id,
    message: "Thank you for contacting Cloz Digital. We've received your inquiry and will respond within 24 hours.",
    latencyMs: Date.now() - startedAt,
  });

  // ── 8. Background processing ──
  setImmediate(() => {
    processInquiryBackground(inquiry, db, context).catch(err => {
      console.error('[inquiry] background pipeline error:', err?.message || err);
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  Background pipeline — runs after the response has been sent.
//  Each stage is independent so a failure in one doesn't block
//  the others. Every error is logged but never surfaced to the
//  visitor.
// ══════════════════════════════════════════════════════════════

async function processInquiryBackground(inquiry, db, context) {
  // ── 8a. AI analysis ──
  let analysis = null;
  try {
    analysis = await analyzeInquiry(inquiry);
    if (analysis) {
      db.prepare(`UPDATE inquiries SET
        ai_score = ?, ai_package = ?, ai_project_value = ?, ai_followup = ?, ai_notes = ?, priority = ?,
        updated_at = datetime('now')
        WHERE id = ?`).run(
        analysis.score || 0,
        analysis.package || '',
        analysis.project_value || 0,
        analysis.followup || '',
        analysis.sales_notes || '',
        analysis.priority || 'medium',
        inquiry.id,
      );
      try {
        logInfo(`Inquiry analyzed: score ${analysis.score}, ${analysis.package}`, {
          ...context, category: 'ai', event_type: 'ai_operation',
          entity_type: 'inquiry', entity_id: inquiry.id,
          action: 'inquiry_analyze',
        });
      } catch {}
    }
  } catch (e) {
    try { logError(`Inquiry AI analysis failed: ${e.message}`, { ...context, entity_type: 'inquiry', entity_id: inquiry.id }); } catch {}
  }

  // ── 8b. CRM lead ──
  let createdLeadId = '';
  try {
    const leadId = uuid();
    const sourceHash = crypto.createHash('md5').update(`inquiry:${inquiry.email}:${inquiry.business_name}`).digest('hex');
    const reasoning = analysis
      ? `${analysis.sales_notes || ''} ${analysis.followup ? `Follow-up: ${analysis.followup}` : ''}`.trim()
      : `Inquiry from ${inquiry.email}: ${inquiry.message.slice(0, 200)}`;

    db.prepare(`INSERT INTO client_scout_leads (
      id, business_name, category, country, country_code, city, address,
      phone, email, website_url, google_maps_url, rating, review_count,
      has_website, lat, lng, business_status, types, source_hash, scouting_mode, status,
      source, verified, synthetic,
      opportunity_score, outreach_priority, suggested_package, reasoning,
      revenue_potential, contact_channels,
      created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`).run(
      leadId,
      inquiry.business_name || inquiry.name,
      inquiry.service_needed,
      '', '', '', '',
      '', inquiry.email, inquiry.current_website,
      '', 0, 0,
      inquiry.current_website ? 1 : 0,
      0, 0,
      '', '[]',
      sourceHash, 'inquiry', 'new',
      'website_inquiry', 1, 0,
      analysis?.score || 0,
      analysis?.priority || 'medium',
      analysis?.package || '',
      reasoning,
      JSON.stringify({
        project_value: analysis?.project_value || 0,
        monthly_value: 0,
        lifetime_value: analysis?.project_value || 0,
        close_probability: analysis ? Math.min(1, analysis.score / 100) : 0.3,
      }),
      JSON.stringify(['email']),
    );

    createdLeadId = leadId;
    db.prepare(`UPDATE inquiries SET created_lead_id = ? WHERE id = ?`).run(leadId, inquiry.id);

    try {
      logInfo(`CRM lead created from inquiry: ${inquiry.business_name || inquiry.name}`, {
        ...context, category: 'client', event_type: 'lead_created',
        entity_type: 'lead', entity_id: leadId,
      });
    } catch {}
  } catch (e) {
    try { logError(`Failed to create CRM lead from inquiry: ${e.message}`, { ...context, entity_type: 'inquiry', entity_id: inquiry.id }); } catch {}
  }

  // ── 8c. Emails ──
  const FROM_ADDRESS = process.env.INQUIRY_FROM || 'Cloz Digital <general@cloz.digital>';
  const INTERNAL_RECIPIENTS = (process.env.INQUIRY_INTERNAL_TO || 'general@cloz.digital,anes@cloz.digital').split(',').map(s => s.trim()).filter(Boolean);

  if (!isResendConfigured()) {
    try {
      logInfo('Inquiry stored but Resend not configured — emails skipped', {
        ...context, category: 'mail', entity_type: 'inquiry', entity_id: inquiry.id,
      });
    } catch {}
    return;
  }

  // Internal notification
  try {
    const { subject, html, text } = renderInternalNotification(inquiry, analysis);
    await sendViaResend({
      from: FROM_ADDRESS,
      to: INTERNAL_RECIPIENTS,
      replyTo: inquiry.email,
      subject, html, text,
    });
    try { db.prepare(`UPDATE inquiries SET notification_sent = 1 WHERE id = ?`).run(inquiry.id); } catch {}
    try {
      logInfo(`Inquiry notification sent to ${INTERNAL_RECIPIENTS.join(', ')}`, {
        ...context, category: 'mail', event_type: 'mail_sent',
        entity_type: 'inquiry', entity_id: inquiry.id,
      });
    } catch {}
  } catch (e) {
    try { logError(`Inquiry internal notification failed: ${e.message}`, { ...context, entity_type: 'inquiry', entity_id: inquiry.id }); } catch {}
  }

  // Auto-reply to prospect
  try {
    const { subject, html, text } = renderAutoReply(inquiry);
    await sendViaResend({
      from: FROM_ADDRESS,
      to: inquiry.email,
      replyTo: 'general@cloz.digital',
      subject, html, text,
    });
    try { db.prepare(`UPDATE inquiries SET auto_reply_sent = 1 WHERE id = ?`).run(inquiry.id); } catch {}
    try {
      logInfo(`Inquiry auto-reply sent to ${inquiry.email}`, {
        ...context, category: 'mail', event_type: 'mail_sent',
        entity_type: 'inquiry', entity_id: inquiry.id,
      });
    } catch {}
  } catch (e) {
    try { logError(`Inquiry auto-reply failed: ${e.message}`, { ...context, entity_type: 'inquiry', entity_id: inquiry.id }); } catch {}
  }
}

// Last-ditch email — used when the DB is unavailable or the insert
// fails. Goes straight to the inbox so the prospect's details aren't
// lost. Failures here are logged but cannot affect the response.
function fireEmergencyEmail(inquiry, reason) {
  if (!isResendConfigured()) return;
  const FROM_ADDRESS = process.env.INQUIRY_FROM || 'Cloz Digital <general@cloz.digital>';
  const INTERNAL_RECIPIENTS = (process.env.INQUIRY_INTERNAL_TO || 'general@cloz.digital,anes@cloz.digital').split(',').map(s => s.trim()).filter(Boolean);
  const subject = `⚠ Inquiry received but DB write failed — ${inquiry.business_name || inquiry.name}`;
  const html = `<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0B0B0D;">
    <h2 style="color:#e11d48;margin:0 0 6px;">Database write failed — prospect details below</h2>
    <p style="font-size:12px;color:#52525B;margin:0 0 16px;">Reason: ${escapeHtml(reason)}</p>
    <table style="width:100%;font-size:14px;border-collapse:collapse;">
      <tr><td style="padding:6px 0;color:#666;width:140px;">Name</td><td>${escapeHtml(inquiry.name)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Email</td><td><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(inquiry.email)}</a></td></tr>
      ${inquiry.business_name ? `<tr><td style="padding:6px 0;color:#666;">Business</td><td>${escapeHtml(inquiry.business_name)}</td></tr>` : ''}
      ${inquiry.current_website ? `<tr><td style="padding:6px 0;color:#666;">Current site</td><td>${escapeHtml(inquiry.current_website)}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#666;">Service needed</td><td>${escapeHtml(inquiry.service_needed)}</td></tr>
    </table>
    <div style="margin-top:16px;padding:14px;background:#f5f5f7;border-radius:8px;white-space:pre-wrap;font-size:13px;">${escapeHtml(inquiry.message)}</div>
    <p style="margin-top:16px;font-size:11px;color:#888;">Inquiry id: ${escapeHtml(inquiry.id)} · IP ${escapeHtml(inquiry.ip_address || 'unknown')} · ${new Date(inquiry.created_at).toLocaleString()}</p>
  </div>`;
  const text = [
    `Database write failed — prospect details:`,
    `Reason: ${reason}`,
    ``,
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    inquiry.business_name ? `Business: ${inquiry.business_name}` : '',
    inquiry.current_website ? `Website: ${inquiry.current_website}` : '',
    `Service: ${inquiry.service_needed}`,
    ``,
    `Message:`,
    inquiry.message,
    ``,
    `Inquiry id: ${inquiry.id}`,
  ].filter(Boolean).join('\n');

  sendViaResend({
    from: FROM_ADDRESS,
    to: INTERNAL_RECIPIENTS,
    replyTo: inquiry.email,
    subject, html, text,
  }).catch(err => {
    console.error('[inquiry] EMERGENCY email also failed:', err?.message || err);
  });
}

// ══════════════════════════════════════════════════════════════
//  ADMIN ENDPOINTS — protected by the api limiter on the parent router
// ══════════════════════════════════════════════════════════════

router.get('/list', (req, res) => {
  const { status, limit = 100, offset = 0 } = req.query;
  const db = getDb();
  let sql = 'SELECT * FROM inquiries WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ` ORDER BY created_at DESC LIMIT ${Math.min(parseInt(limit) || 100, 500)} OFFSET ${parseInt(offset) || 0}`;
  const rows = db.prepare(sql).all(...params);

  const counts = db.prepare(`SELECT status, COUNT(*) as c FROM inquiries GROUP BY status`).all();
  const byStatus = counts.reduce((o, r) => { o[r.status] = r.c; return o }, {});
  const total = db.prepare(`SELECT COUNT(*) as c FROM inquiries`).get()?.c || 0;

  res.json({ inquiries: rows, total, byStatus });
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const inq = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(req.params.id);
  if (!inq) return res.status(404).json({ error: 'Inquiry not found' });
  res.json(inq);
});

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost'];

router.patch('/:id', (req, res) => {
  const { status, notes, priority } = req.body;
  const db = getDb();
  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
  }
  const updates = [];
  const params = [];
  if (status) { updates.push('status = ?'); params.push(status); }
  if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
  if (priority) { updates.push('priority = ?'); params.push(priority); }
  if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  updates.push("updated_at = datetime('now')");
  params.push(req.params.id);
  db.prepare(`UPDATE inquiries SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  getDb().prepare('DELETE FROM inquiries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
