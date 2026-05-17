// src/i18n/I18nProvider.jsx
// Lightweight i18n: localStorage + cookie + browser-detect + DB overrides.
// Provides t(), language, setLanguage, switcher metadata.

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { dictionary, SUPPORTED, LANGUAGE_LABELS } from './dictionary'

const STORAGE_KEY  = 'preferredLanguage'
const COOKIE_KEY   = 'preferredLanguage'
const COOKIE_DAYS  = 365

const Ctx = createContext({
  lang: 'en',
  setLanguage: () => {},
  t: (k) => k,
  ready: false,
  hasPreference: false,
  detected: null,
  overrides: {},
  reloadOverrides: () => {},
})

function readCookie(name) {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}
function writeCookie(name, value, days = COOKIE_DAYS) {
  if (typeof document === 'undefined') return
  const d = new Date(); d.setTime(d.getTime() + days * 86400000)
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`
}

function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return null
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''])
    .map(s => (s || '').toLowerCase())
  for (const l of langs) {
    if (l.startsWith('bs') || l.startsWith('hr') || l.startsWith('sr') || l.startsWith('me')) return 'bcs'
    if (l.startsWith('en')) return 'en'
  }
  return null
}

function readUrlOverride() {
  if (typeof window === 'undefined') return null
  const p = new URLSearchParams(window.location.search).get('lang')
  if (p && SUPPORTED.includes(p)) return p
  return null
}

function loadStoredLanguage() {
  if (typeof window === 'undefined') return null
  const urlLang = readUrlOverride()
  if (urlLang) return urlLang
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || readCookie(COOKIE_KEY)
    if (stored && SUPPORTED.includes(stored)) return stored
  } catch {}
  return null
}

// Update <html lang> + hreflang link tags + canonical
function applyHtmlAttributes(lang) {
  if (typeof document === 'undefined') return
  try {
    document.documentElement.lang = lang === 'bcs' ? 'bs' : 'en'

    // hreflang link tags — built once if missing, updated each switch
    const head = document.head
    const ensureLink = (rel, hreflang, hrefSuffix) => {
      const selector = `link[rel="${rel}"]${hreflang ? `[hreflang="${hreflang}"]` : ''}`
      let el = head.querySelector(selector)
      if (!el) {
        el = document.createElement('link')
        el.rel = rel
        if (hreflang) el.hreflang = hreflang
        head.appendChild(el)
      }
      const base = window.location.origin + window.location.pathname
      el.href = base + (hrefSuffix || '')
    }
    ensureLink('alternate', 'en',       '?lang=en')
    ensureLink('alternate', 'bs',       '?lang=bcs')
    ensureLink('alternate', 'hr',       '?lang=bcs')
    ensureLink('alternate', 'sr-Latn',  '?lang=bcs')
    ensureLink('alternate', 'x-default','?lang=en')
  } catch {}
}

export function I18nProvider({ children }) {
  // Resolve initial language synchronously so the first render is correct
  const [lang, setLangState] = useState(() => loadStoredLanguage() || 'en')
  const [hasPreference, setHasPreference] = useState(() => !!loadStoredLanguage())
  const [detected]       = useState(() => detectBrowserLanguage())
  const [overrides, setOverrides] = useState({}) // { 'key': { en, bcs } }
  const [ready, setReady] = useState(false)

  const setLanguage = useCallback((next, persist = true) => {
    if (!SUPPORTED.includes(next)) return
    setLangState(next)
    if (persist) {
      try { localStorage.setItem(STORAGE_KEY, next) } catch {}
      writeCookie(COOKIE_KEY, next)
      setHasPreference(true)
    }
    applyHtmlAttributes(next)
  }, [])

  // Apply HTML attributes on mount + lang change
  useEffect(() => { applyHtmlAttributes(lang) }, [lang])

  // Load DB overrides (admin edits)
  const reloadOverrides = useCallback(async () => {
    try {
      const r = await fetch('/api/localization/overrides')
      if (r.ok) {
        const json = await r.json()
        const map = {}
        for (const row of (json.overrides || [])) {
          if (!map[row.key]) map[row.key] = {}
          map[row.key][row.lang] = row.value
        }
        setOverrides(map)
      }
    } catch {}
    setReady(true)
  }, [])
  useEffect(() => { reloadOverrides() }, [reloadOverrides])

  const t = useMemo(() => (key, fallback) => {
    const entry = dictionary[key]
    const override = overrides[key]?.[lang]
    if (override !== undefined && override !== null && override !== '') return override
    if (entry && entry[lang]) return entry[lang]
    if (entry && entry.en) return entry.en
    return fallback !== undefined ? fallback : key
  }, [lang, overrides])

  const value = useMemo(() => ({
    lang, setLanguage, t, ready, hasPreference, detected, overrides, reloadOverrides,
    label: LANGUAGE_LABELS[lang],
  }), [lang, setLanguage, t, ready, hasPreference, detected, overrides, reloadOverrides])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() { return useContext(Ctx) }
export function useT()    { return useContext(Ctx).t }
export function useLang() { return useContext(Ctx).lang }
