// Tiny fetch wrapper used by every query/mutation hook.
// - Throws an Error with a useful .status + .body for non-2xx responses.
// - JSON in / JSON out.
// - 20s timeout (matches portal API).

export class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export async function apiFetch(path, { method = 'GET', body, headers, signal, timeoutMs = 20_000 } = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  const upstreamAbort = () => controller.abort()
  signal?.addEventListener('abort', upstreamAbort)

  try {
    const res = await fetch(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(headers || {}),
      },
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new ApiError(json.error || `Request failed: ${res.status}`, { status: res.status, body: json })
    }
    return json
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs}ms`, { status: 0 })
    }
    throw err
  } finally {
    clearTimeout(t)
    signal?.removeEventListener('abort', upstreamAbort)
  }
}

// Convenience verbs for terser hook code
export const api = {
  get:    (path, opts) => apiFetch(path, { ...opts, method: 'GET' }),
  post:   (path, body, opts) => apiFetch(path, { ...opts, method: 'POST', body }),
  patch:  (path, body, opts) => apiFetch(path, { ...opts, method: 'PATCH', body }),
  put:    (path, body, opts) => apiFetch(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => apiFetch(path, { ...opts, method: 'DELETE' }),
}
