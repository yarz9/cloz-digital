import { useState, useEffect } from 'react'
import { Cookie, X, Settings, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

// ══════════════════════════════════════════════════════════════
//  COOKIE CONSENT BANNER — Necessary / Analytics / Marketing
// ══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'cloz_cookie_consent_v1'
const POLICY_VERSION = '1'

function loadConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function saveConsent(consent) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(consent)) } catch {}
}

function visitorId() {
  let id = ''
  try { id = localStorage.getItem('cloz_visitor_id_v1') || '' } catch {}
  if (!id) {
    id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    try { localStorage.setItem('cloz_visitor_id_v1', id) } catch {}
  }
  return id
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [prefs, setPrefs] = useState({ necessary: true, analytics: false, marketing: false })

  useEffect(() => {
    const saved = loadConsent()
    if (!saved || saved.policy_version !== POLICY_VERSION) {
      // small delay to avoid jarring first paint
      setTimeout(() => setVisible(true), 600)
    } else {
      setPrefs(saved)
    }
  }, [])

  const persist = async (next) => {
    const payload = { ...next, policy_version: POLICY_VERSION, recorded_at: new Date().toISOString() }
    saveConsent(payload)
    setPrefs(payload)
    setVisible(false)
    setShowSettings(false)
    // Best-effort logging server-side
    try {
      await fetch('/api/legal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_id: visitorId(),
          necessary: payload.necessary,
          analytics: payload.analytics,
          marketing: payload.marketing,
          policy_version: POLICY_VERSION,
        }),
      })
    } catch {}
  }

  const acceptAll = () => persist({ necessary: true, analytics: true, marketing: true })
  const rejectAll = () => persist({ necessary: true, analytics: false, marketing: false })
  const saveCustom = () => persist({ ...prefs, necessary: true })

  if (!visible) return null

  return (
    <>
      {/* Backdrop for the settings drawer */}
      {showSettings && <div className="fixed inset-0 bg-black/40 z-[99]" onClick={() => setShowSettings(false)} />}

      <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-[440px] z-[100]">
        <div className="bg-surface border border-border rounded-xl shadow-2xl p-5">
          {!showSettings ? (
            <>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-muted flex items-center justify-center shrink-0">
                  <Cookie size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-[14px]">We use cookies</h3>
                  <p className="text-[12px] text-text-secondary leading-relaxed mt-1">
                    Necessary cookies make the site work. Optional cookies help us understand usage and improve.
                    See our <Link to="/cookie-policy" className="text-accent hover:text-accent-hover">Cookie Policy</Link>.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={acceptAll}
                  className="flex-1 min-w-[100px] bg-accent hover:bg-accent-hover text-white py-2 rounded-md text-[12px] font-semibold">
                  Accept All
                </button>
                <button onClick={rejectAll}
                  className="flex-1 min-w-[100px] bg-elevated hover:bg-raised text-text-secondary py-2 rounded-md text-[12px] font-medium">
                  Reject Optional
                </button>
                <button onClick={() => setShowSettings(true)}
                  className="px-3 py-2 text-[11px] text-text-tertiary hover:text-text-primary flex items-center gap-1">
                  <Settings size={11} />Customize
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-[14px]">Cookie Preferences</h3>
                <button onClick={() => setShowSettings(false)} className="text-text-tertiary hover:text-text-primary">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-3 mb-4">
                <ConsentRow
                  title="Necessary"
                  description="Required for the site to function (session, security, cookie preference itself)."
                  checked={true} locked
                />
                <ConsentRow
                  title="Analytics"
                  description="Anonymous usage analytics. Helps us improve."
                  checked={prefs.analytics}
                  onChange={v => setPrefs(p => ({ ...p, analytics: v }))}
                />
                <ConsentRow
                  title="Marketing"
                  description="Used to measure ad campaigns. Disabled by default."
                  checked={prefs.marketing}
                  onChange={v => setPrefs(p => ({ ...p, marketing: v }))}
                />
              </div>
              <div className="flex gap-2">
                <button onClick={saveCustom}
                  className="flex-1 bg-accent hover:bg-accent-hover text-white py-2 rounded-md text-[12px] font-semibold flex items-center justify-center gap-1">
                  <Check size={12} />Save Preferences
                </button>
                <button onClick={acceptAll}
                  className="px-3 py-2 bg-elevated hover:bg-raised text-text-secondary rounded-md text-[12px] font-medium">
                  Accept All
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function ConsentRow({ title, description, checked, onChange, locked }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-elevated rounded-md">
      <button onClick={() => !locked && onChange(!checked)} disabled={locked}
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 mt-0.5 ${
          checked ? 'bg-accent' : 'bg-text-tertiary/30'
        } ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <span className={`absolute top-0.5 ${checked ? 'right-0.5' : 'left-0.5'} w-4 h-4 rounded-full bg-white transition-all`} />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium">{title}</span>
          {locked && <span className="text-[9px] uppercase tracking-wider bg-elevated text-text-tertiary px-1.5 py-0.5 rounded">Always on</span>}
        </div>
        <p className="text-[11px] text-text-tertiary mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}
