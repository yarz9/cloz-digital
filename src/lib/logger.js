// ══════════════════════════════════════════════════════════════
//  CLIENT-SIDE LOGGER — Sends events to /api/activity-logs/event
// ══════════════════════════════════════════════════════════════

const LOG_ENDPOINT = '/api/activity-logs/event';

async function sendEvent(payload) {
  try {
    await fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Never break the app due to logging failure
  }
}

export const logger = {
  /** Log a UI interaction */
  ui(action, details = {}) {
    sendEvent({ level: 'info', category: 'ui', event_type: 'ui_event', action, message: action, details });
  },

  /** Log a navigation event */
  navigate(route, details = {}) {
    sendEvent({ level: 'info', category: 'ui', event_type: 'navigation', action: `navigate:${route}`, message: `Navigated to ${route}`, details });
  },

  /** Log an error from the frontend */
  error(message, details = {}) {
    sendEvent({ level: 'error', category: 'ui', event_type: 'client_error', action: 'error', message, details });
  },

  /** Log an AI operation initiated from the UI */
  aiAction(action, details = {}) {
    sendEvent({ level: 'info', category: 'ai', event_type: 'ai_operation', action, message: `AI: ${action}`, details });
  },

  /** Log a mail action from the UI */
  mailAction(action, details = {}) {
    sendEvent({ level: 'info', category: 'mail', event_type: 'mail_activity', action, message: `Mail: ${action}`, details });
  },

  /** Log a scout action */
  scoutAction(action, details = {}) {
    sendEvent({ level: 'info', category: 'scout', event_type: 'scout_activity', action, message: `Scout: ${action}`, details });
  },

  /** Log a billing action */
  billingAction(action, details = {}) {
    sendEvent({ level: 'info', category: 'billing', event_type: 'billing_activity', action, message: `Billing: ${action}`, details });
  },

  /** Generic custom event */
  custom(level, category, action, message, details = {}) {
    sendEvent({ level, category, event_type: 'custom', action, message, details });
  },
};

// ── Activity Logs API ──
const LOGS_BASE = '/api/activity-logs';

async function logsGet(endpoint, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${LOGS_BASE}${endpoint}${qs ? '?' + qs : ''}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Logs request failed');
  }
  return res.json();
}

async function logsPost(endpoint, body = {}) {
  const res = await fetch(`${LOGS_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Logs request failed');
  }
  return res.json();
}

export const activityLogs = {
  list: (params) => logsGet('', params),
  get: (id) => logsGet(`/${id}`),
  stats: () => logsGet('/overview/stats'),
  exportJson: (params) => logsGet('/export/json', params),
  prune: (data) => logsPost('/prune', data),
  clear: () => logsPost('/clear'),
  analyze: (data) => logsPost('/analyze', data),
};
