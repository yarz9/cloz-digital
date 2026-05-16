// ══════════════════════════════════════════════════════════════
//  CENTRALIZED URL CONFIGURATION
//  All systems that generate public URLs MUST import from here.
//  Canonical base: the apex domain (no www).
// ══════════════════════════════════════════════════════════════

// Canonical base URL — override via APP_URL env var if deploying elsewhere.
// Trailing slash is stripped automatically.
export const APP_URL = (process.env.APP_URL || 'https://cloz.digital').replace(/\/$/, '')

// Display-friendly host (no protocol, no trailing slash)
export const APP_HOST = APP_URL.replace(/^https?:\/\//, '')

// The hosts that should redirect to APP_URL (e.g. "www" prefix variant).
// Used by the redirect middleware in server.js.
const APEX_HOST = APP_HOST.replace(/^www\./, '')
export const REDIRECT_HOSTS = new Set([`www.${APEX_HOST}`])

/**
 * Build a fully-qualified URL from a relative path.
 * Pass an absolute URL and it's returned unchanged.
 */
export function buildUrl(path = '') {
  if (!path) return APP_URL
  if (/^https?:\/\//i.test(path)) return path
  return `${APP_URL}/${path.replace(/^\//, '')}`
}

// Legacy alias kept for backward compatibility.
export const url = buildUrl
