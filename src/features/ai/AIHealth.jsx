import { useState, useEffect } from 'react'
import { Activity, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

export default function AIHealth() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/health').then(r => r.json()).then(d => { setHealth(d); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(load, [])

  const checks = health ? [
    { name: 'Database', ok: !!health.database, detail: health.database || 'unreachable' },
    { name: 'Provider', ok: !!health.provider, detail: health.provider || 'not configured' },
    { name: 'Model', ok: !!health.model, detail: health.model || 'not set' },
    { name: 'API Key', ok: health.hasKey, detail: health.hasKey ? 'configured' : 'missing' },
    { name: 'Node.js', ok: true, detail: health.node || process.version },
    { name: 'Environment', ok: true, detail: health.env || 'development' },
  ] : []

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[24px]">Health Checks</h1>
          <p className="text-[13px] text-text-secondary mt-1">System status and diagnostics</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border px-3 py-1.5 rounded-md text-[12px] text-text-secondary transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-surface border border-border rounded-lg p-8 flex items-center justify-center gap-2 text-text-tertiary">
          <Loader2 size={14} className="animate-spin" /> Running health checks...
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map(c => (
            <div key={c.name} className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {c.ok ? <CheckCircle size={15} className="text-success" /> : <XCircle size={15} className="text-error" />}
                <div>
                  <span className="text-[13px] font-medium">{c.name}</span>
                  <span className="text-[11px] text-text-tertiary ml-2">{c.detail}</span>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${c.ok ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                {c.ok ? 'OK' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
