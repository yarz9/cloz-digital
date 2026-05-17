// database/auditLog.js — Captures every mutation API call.
// Non-blocking: records to persistence_audit asynchronously.
//
// Mounted as middleware in server.js. Picks up POST/PATCH/PUT/DELETE
// against /api/* routes, records a row per response with status and
// duration. Skips noisy/read-only routes by allowlist.

import { v4 as uuid } from 'uuid'
import { getDb } from './init.js'

// Routes that produce a LOT of writes (e.g. activity log itself) — skip
// to avoid feedback loops or flooding the audit table.
const SKIP_ROUTES = [
  '/api/activity-logs',
  '/api/health',
  '/api/management/auth/status',
  '/api/localization/overrides',   // bulk reads pretending to be writes
]

// Best-effort entity extraction from URL: /api/<plural>/<id> → (plural, id)
function extractEntity(url) {
  const path = url.split('?')[0]
  const parts = path.split('/').filter(Boolean) // ["api", "service-desk", "requests", "ticket", "abc"]
  if (parts.length < 2) return { entity_type: '', entity_id: '' }
  // entity_type = the second-to-last alpha segment if URL ends with an id-looking thing
  const last = parts[parts.length - 1]
  const isIdish = /^[a-f0-9-]{6,}$|^\d+$/.test(last)
  if (isIdish && parts.length >= 3) {
    return { entity_type: parts.slice(1, parts.length - 1).join('/'), entity_id: last }
  }
  return { entity_type: parts.slice(1).join('/'), entity_id: '' }
}

function shortBody(body) {
  if (!body) return ''
  try {
    const s = typeof body === 'string' ? body : JSON.stringify(body)
    return s.length > 400 ? s.slice(0, 400) + '…' : s
  } catch { return '' }
}

export function auditMiddleware(req, res, next) {
  const method = req.method
  if (!['POST','PATCH','PUT','DELETE'].includes(method)) return next()
  if (!req.originalUrl.startsWith('/api/')) return next()
  if (SKIP_ROUTES.some(p => req.originalUrl.startsWith(p))) return next()

  const started = Date.now()
  const url = req.originalUrl
  const bodySnap = shortBody(req.body)

  res.on('finish', () => {
    try {
      const db = getDb()
      const { entity_type, entity_id } = extractEntity(url)
      const actor =
        req.headers['x-cloz-operator'] ||
        req.body?._actor ||
        req.headers['x-cloz-client-email'] ||
        ''
      const action =
        method === 'POST'   ? 'create'
      : method === 'PATCH'  ? 'update'
      : method === 'PUT'    ? 'replace'
      : method === 'DELETE' ? 'delete' : method.toLowerCase()
      const ip = (req.ip || req.headers['x-forwarded-for'] || '').toString().slice(0, 64)
      db.prepare(`INSERT INTO persistence_audit
        (id, actor, method, route, action, entity_type, entity_id, ip, status, duration_ms, summary, diff)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        uuid(), String(actor).slice(0, 200), method, url.slice(0, 500),
        action, entity_type.slice(0, 100), String(entity_id).slice(0, 200),
        ip, res.statusCode | 0, Date.now() - started,
        '', bodySnap
      )
    } catch {
      // Never let audit failures kill the response. They are observability,
      // not business logic.
    }
  })

  next()
}

// Direct programmatic logger for things outside the HTTP path (cron, queues)
export function logAudit({ actor = '', action = '', entity_type = '', entity_id = '', summary = '', diff = '' }) {
  try {
    getDb().prepare(`INSERT INTO persistence_audit
      (id, actor, method, route, action, entity_type, entity_id, ip, status, duration_ms, summary, diff)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      uuid(), actor, 'INTERNAL', '', action, entity_type, String(entity_id),
      '', 200, 0, summary.slice(0, 1000), typeof diff === 'string' ? diff.slice(0, 2000) : JSON.stringify(diff).slice(0, 2000)
    )
  } catch {}
}
