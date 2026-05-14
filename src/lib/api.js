// AI API client — calls /api/ai/* endpoints (no auth required)

const BASE = '/api/ai';

async function post(endpoint, body = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'AI request failed');
  }
  return res.json();
}

export const ai = {
  /** Daily dashboard briefing */
  dashboardBriefing: (data) => post('/dashboard-briefing', data),

  /** Analyze a lead */
  leadAnalysis: (data) => post('/lead-analysis', data),

  /** Generate outreach message */
  outreach: (data) => post('/outreach', data),

  /** Generate Instagram content */
  contentGenerate: (data) => post('/content-generate', data),

  /** Explain an invoice */
  invoiceExplanation: (data) => post('/invoice-explanation', data),

  /** Summarize a client relationship */
  clientSummary: (data) => post('/client-summary', data),

  /** Generate a proposal draft */
  proposalDraft: (data) => post('/proposal-draft', data),

  /** Generate maintenance summary */
  maintenanceSummary: (data) => post('/maintenance-summary', data),

  /** Rewrite text in a different tone */
  rewrite: (data) => post('/rewrite', data),

  /** Summarize content */
  summarize: (data) => post('/summarize', data),

  /** Translate text */
  translate: (data) => post('/translate', data),

  /** Suggest package upgrade for a client */
  packageSuggest: (data) => post('/package-suggest', data),

  /** Revenue health insight */
  revenueInsight: (data) => post('/revenue-insight', data),

  /** Blog / content draft */
  blogDraft: (data) => post('/blog-draft', data),

  /** Next actions for a client */
  nextActions: (data) => post('/next-actions', data),

  /** Draft an email */
  emailDraft: (data) => post('/email-draft', data),

  /** Draft a Viber message */
  viberDraft: (data) => post('/viber-draft', data),

  /** Freeform prompt */
  generate: (prompt, temperature) => post('/generate', { prompt, temperature }),
};

// ── Client Scout API ──
const SCOUT_BASE = '/api/client-scout';

async function scoutGet(endpoint) {
  const res = await fetch(`${SCOUT_BASE}${endpoint}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Scout request failed');
  }
  return res.json();
}

async function scoutPost(endpoint, body = {}) {
  const res = await fetch(`${SCOUT_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Scout request failed');
  }
  return res.json();
}

async function scoutPatch(endpoint, body = {}) {
  const res = await fetch(`${SCOUT_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Scout request failed');
  }
  return res.json();
}

export const scout = {
  meta: () => scoutGet('/meta'),
  stats: () => scoutGet('/stats'),
  leads: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return scoutGet(`/leads${qs ? '?' + qs : ''}`);
  },
  lead: (id) => scoutGet(`/leads/${id}`),
  discover: (data) => scoutPost('/discover', data),
  analyze: (id) => scoutPost(`/leads/${id}/analyze`),
  generateOutreach: (id, data) => scoutPost(`/leads/${id}/generate-outreach`, data),
  updateStatus: (id, data) => scoutPatch(`/leads/${id}/status`, data),
  scanStart: (data) => scoutPost('/scan/start', data),
  scanStop: (data) => scoutPost('/scan/stop', data || {}),
  scanStatus: () => scoutGet('/scan/status'),
};

// ── Audit Lab API ──
const AUDIT_BASE = '/api/audit';

async function auditPost(endpoint, body = {}) {
  const res = await fetch(`${AUDIT_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Audit request failed');
  }
  return res.json();
}

export const audit = {
  /** Run a full website review */
  review: (data) => auditPost('/review', data),

  /** Generate a specific Claude prompt variant */
  generatePrompt: (data) => auditPost('/review/prompt', data),
};
