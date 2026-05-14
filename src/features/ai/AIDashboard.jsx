import { useState, useEffect } from 'react'
import { Zap, Server, FileText, Database, Wrench, ToggleLeft, Activity, Clock, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

export default function AIDashboard() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(d => { setHealth(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const cards = [
    { label: 'Provider', value: health?.provider || '—', icon: Server, color: 'text-accent' },
    { label: 'Model', value: health?.model || '—', icon: Zap, color: 'text-info' },
    { label: 'Prompts', value: health?.prompts ?? '—', icon: FileText, color: 'text-success' },
    { label: 'Schemas', value: health?.schemas ?? '—', icon: Database, color: 'text-warning' },
    { label: 'Tools', value: health?.tools ?? '—', icon: Wrench, color: 'text-accent' },
    { label: 'Features', value: health?.features ?? '—', icon: ToggleLeft, color: 'text-info' },
  ]

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px]">AI Dashboard</h1>
        <p className="text-[13px] text-text-secondary mt-1">System overview and diagnostics</p>
      </div>

      {/* Status */}
      <div className="bg-surface border border-border rounded-lg p-5 flex items-center gap-4">
        {loading ? (
          <><Loader2 size={16} className="animate-spin text-accent" /><span className="text-[13px] text-text-secondary">Checking system health...</span></>
        ) : health ? (
          <><CheckCircle size={16} className="text-success" /><span className="text-[13px] text-text-secondary">AI system operational &mdash; {health.provider} / {health.model}</span></>
        ) : (
          <><AlertTriangle size={16} className="text-error" /><span className="text-[13px] text-error">Could not reach API</span></>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-text-tertiary uppercase tracking-wider">{c.label}</span>
              <c.icon size={15} className={c.color} strokeWidth={1.5} />
            </div>
            <div className="text-[18px] font-display font-bold truncate">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-[14px] font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Test Connection', href: '/ai/tests', icon: Activity },
            { label: 'Edit Prompts', href: '/ai/prompts', icon: FileText },
            { label: 'View Logs', href: '/ai/logs', icon: Clock },
            { label: 'Provider Settings', href: '/ai/provider', icon: Server },
          ].map(a => (
            <a key={a.label} href={a.href} className="flex items-center gap-2 p-3 bg-elevated hover:bg-raised rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors">
              <a.icon size={14} />
              {a.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
