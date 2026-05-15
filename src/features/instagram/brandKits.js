// ══════════════════════════════════════════════════════════════
//  BRAND KIT SYSTEM — localStorage-backed brand profiles
// ══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'cloz_brand_kits_v1'
const ACTIVE_KEY = 'cloz_active_brand_kit_v1'

const DEFAULT_KITS = [
  {
    id: 'cloz_default',
    name: 'Cloz Digital',
    locked: true,
    colors: { bg: '#0B0B0D', primary: '#F5F5F7', accent: '#5E8DB5', muted: '#A1A1AA', secondary: '#18181C' },
    fonts: { heading: 'jakarta', body: 'inter' },
    voice: 'Premium, confident, expert. Speaks plainly. Avoids jargon. Always client-focused.',
    logoUrl: '',
    footer: 'CLOZ DIGITAL',
    website: 'cloz.digital',
  },
]

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_KITS
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_KITS
  } catch {
    return DEFAULT_KITS
  }
}

function save(kits) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(kits)) } catch {}
}

export const brandKits = {
  list() { return load() },

  get(id) { return load().find(k => k.id === id) },

  create(kit) {
    const kits = load()
    const id = `kit_${Date.now()}`
    const newKit = { id, locked: false, colors: {}, fonts: {}, voice: '', logoUrl: '', footer: '', website: '', ...kit }
    kits.push(newKit)
    save(kits)
    return newKit
  },

  update(id, updates) {
    const kits = load()
    const idx = kits.findIndex(k => k.id === id)
    if (idx === -1) return null
    if (kits[idx].locked) return kits[idx]
    kits[idx] = { ...kits[idx], ...updates }
    save(kits)
    return kits[idx]
  },

  remove(id) {
    const kits = load().filter(k => k.id !== id || k.locked)
    save(kits)
  },

  getActiveId() {
    try { return localStorage.getItem(ACTIVE_KEY) || 'cloz_default' } catch { return 'cloz_default' }
  },

  setActiveId(id) {
    try { localStorage.setItem(ACTIVE_KEY, id) } catch {}
  },
}
