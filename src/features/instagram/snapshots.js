// ══════════════════════════════════════════════════════════════
//  AUTOSAVE & VERSION SNAPSHOTS
// ══════════════════════════════════════════════════════════════

const AUTOSAVE_KEY = 'cloz_studio_autosave_v1'
const SNAPSHOTS_KEY = 'cloz_studio_snapshots_v1'
const MAX_SNAPSHOTS = 20

export const autosave = {
  load() {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  },
  save(state) {
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...state, savedAt: new Date().toISOString() })) } catch {}
  },
  clear() {
    try { localStorage.removeItem(AUTOSAVE_KEY) } catch {}
  },
}

export const snapshots = {
  list() {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  },
  add(state, label) {
    try {
      const all = snapshots.list()
      const snap = {
        id: `snap_${Date.now()}`,
        label: label || `Snapshot ${new Date().toLocaleString()}`,
        createdAt: new Date().toISOString(),
        state,
      }
      const updated = [snap, ...all].slice(0, MAX_SNAPSHOTS)
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated))
      return snap
    } catch { return null }
  },
  remove(id) {
    try {
      const updated = snapshots.list().filter(s => s.id !== id)
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated))
    } catch {}
  },
  clear() {
    try { localStorage.removeItem(SNAPSHOTS_KEY) } catch {}
  },
}
