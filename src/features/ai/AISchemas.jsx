import { useState, useEffect } from 'react'
import { Database, ChevronDown, ChevronUp } from 'lucide-react'

export default function AISchemas() {
  const [schemas, setSchemas] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/schemas').then(r => r.json()).then(d => setSchemas(d || [])).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px]">Structured Output Schemas</h1>
        <p className="text-[13px] text-text-secondary mt-1">{schemas.length} schemas defined</p>
      </div>
      <div className="space-y-3">
        {schemas.map(s => (
          <div key={s.id} className="bg-surface border border-border rounded-lg">
            <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="w-full flex items-center justify-between p-4 text-left">
              <div>
                <span className="text-[14px] font-medium">{s.name}</span>
                <span className="ml-2 text-[10px] text-text-tertiary capitalize">{s.category}</span>
              </div>
              {expanded === s.id ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
            </button>
            {expanded === s.id && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <pre className="bg-elevated rounded-md p-3 text-[11px] font-mono text-text-secondary whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {typeof s.schema === 'string' ? s.schema : JSON.stringify(JSON.parse(s.schema || '{}'), null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
        {schemas.length === 0 && <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-tertiary text-[13px]">No schemas defined.</div>}
      </div>
    </div>
  )
}
