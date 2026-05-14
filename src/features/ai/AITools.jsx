import { useState, useEffect } from 'react'
import { Wrench, ChevronDown, ChevronUp } from 'lucide-react'

export default function AITools() {
  const [tools, setTools] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/tools').then(r => r.json()).then(d => setTools(d || [])).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px]">Tool / Function Definitions</h1>
        <p className="text-[13px] text-text-secondary mt-1">{tools.length} tools registered</p>
      </div>
      <div className="space-y-3">
        {tools.map(t => (
          <div key={t.id} className="bg-surface border border-border rounded-lg">
            <button onClick={() => setExpanded(expanded === t.id ? null : t.id)} className="w-full flex items-center justify-between p-4 text-left">
              <div>
                <span className="text-[14px] font-mono font-medium">{t.name}</span>
                <p className="text-[11px] text-text-tertiary mt-0.5">{t.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${t.enabled ? 'bg-success/10 text-success' : 'bg-elevated text-text-tertiary'}`}>
                  {t.enabled ? 'Enabled' : 'Disabled'}
                </span>
                {expanded === t.id ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
              </div>
            </button>
            {expanded === t.id && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <pre className="bg-elevated rounded-md p-3 text-[11px] font-mono text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {typeof t.parameters === 'string' ? JSON.stringify(JSON.parse(t.parameters || '{}'), null, 2) : JSON.stringify(t.parameters, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
        {tools.length === 0 && <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-tertiary text-[13px]">No tools defined.</div>}
      </div>
    </div>
  )
}
