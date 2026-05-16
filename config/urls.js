// ══════════════════════════════════════════════════════════════
//  CENTRALIZED URL CONFIGURATION
//  All systems that generate public URLs MUST import from here.
// ══════════════════════════════════════════════════════════════

// Canonical base URL — apex domain. The www subdomain is NOT configured
// in DNS, so any link to https://www.cloz.digital fails resolution.
// Override via APP_URL env var if deploying to a different domain.
export const APP_URL = (process.env.APP_URL || 'https://cloz.digital').replace(/\/$/, '')

// Display-friendly host (no protocol, no trailing slash)
export const APP_HOST = APP_URL.replace(/^https?:\/\//, '')

// Build a full URL from a path
export function url(path = '') {
  if (!path) return APP_URL
  if (path.startsWith('http')) return path
  return `${APP_URL}/${path.replace(/^\//, '')}`
}
