// ══════════════════════════════════════════════════════════════
//  PORTAL API CLIENT — Bearer-token authenticated.
//  Token stored in localStorage as 'cloz_portal_token_v1'.
// ══════════════════════════════════════════════════════════════

const TOKEN_KEY = 'cloz_portal_token_v1'
const CLIENT_KEY = 'cloz_portal_client_v1'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export function setToken(t) {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY) } catch {}
}

export function getCachedClient() {
  try { return JSON.parse(localStorage.getItem(CLIENT_KEY) || 'null') } catch { return null }
}

export function setCachedClient(c) {
  try { if (c) localStorage.setItem(CLIENT_KEY, JSON.stringify(c)); else localStorage.removeItem(CLIENT_KEY) } catch {}
}

export function clearPortalSession() {
  setToken(null)
  setCachedClient(null)
}

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api/portal${path}`, { ...options, headers })
  const json = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`)
  return json
}

export const portal = {
  // Auth
  requestMagicLink: (email) => req('/auth/request', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyMagicLink:  (token) => req('/auth/verify',  { method: 'POST', body: JSON.stringify({ token }) }),
  logout:           ()      => req('/auth/logout',  { method: 'POST' }),
  me:               ()      => req('/me'),

  // Dashboard
  dashboard:        ()      => req('/dashboard'),

  // Tickets
  tickets:          ()      => req('/tickets'),
  ticket:           (id)    => req(`/tickets/${id}`),
  createTicket:     (data)  => req('/tickets', { method: 'POST', body: JSON.stringify(data) }),
  replyTicket:      (id, body) => req(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) }),
  updateTicket:     (id, data) => req(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Assets
  assets:           (folder) => req(`/assets${folder ? '?folder=' + encodeURIComponent(folder) : ''}`),
  createAsset:      (data)  => req('/assets', { method: 'POST', body: JSON.stringify(data) }),
  deleteAsset:      (id)    => req(`/assets/${id}`, { method: 'DELETE' }),

  // Messages
  messages:         ()      => req('/messages'),
  sendMessage:      (body)  => req('/messages', { method: 'POST', body: JSON.stringify({ body }) }),

  // Billing / hosting / etc
  billing:          ()      => req('/billing'),
  hosting:          ()      => req('/hosting'),
  maintenance:      ()      => req('/maintenance'),
  maintenanceReport:(id)    => req(`/maintenance/${id}`),
  approvals:        ()      => req('/approvals'),
  decideApproval:   (id, data) => req(`/approvals/${id}/decision`, { method: 'POST', body: JSON.stringify(data) }),
  proposals:        ()      => req('/proposals'),
  proposal:         (id)    => req(`/proposals/${id}`),
  signProposal:     (id, signature_name) => req(`/proposals/${id}/sign`, { method: 'POST', body: JSON.stringify({ signature_name }) }),

  // AI assistant
  aiAssistant:      (messages) => req('/ai-assistant', { method: 'POST', body: JSON.stringify({ messages }) }),

  // Knowledge base
  knowledge:        () => req('/knowledge'),
}
