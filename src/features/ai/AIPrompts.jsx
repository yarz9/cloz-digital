import { useState, useEffect } from 'react'
import { FileText, Plus, Edit2, Trash2, ChevronDown, ChevronUp, Copy } from 'lucide-react'

export default function AIPrompts() {
  const [prompts, setPrompts] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    fetch('/api/prompts').then(r => r.json()).then(d => setPrompts(d || [])).catch(() => {})
  }, [])

  return (
    <div className="p-6 max-w-[1000px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[24px]">Prompt Templates</h1>
          <p className="text-[13px] text-text-secondary mt-1">{prompts.length} templates configured</p>
        </div>
      </div>

      <div className="space-y-3">
        {prompts.map(p => (
          <div key={p.id || p.slug} className="bg-surface border border-border rounded-lg">
            <button
              onClick={() => setExpanded(expanded === p.slug ? null : p.slug)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <span className="text-[14px] font-medium">{p.title}</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-accent bg-accent-muted px-1.5 py-0.5 rounded">{p.slug}</span>
                  <span className="text-[10px] text-text-tertiary capitalize">{p.category}</span>
                </div>
              </div>
              {expanded === p.slug ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
            </button>
            {expanded === p.slug && (
              <div className="px-4 pb-4 border-t border-border pt-3">
                <p className="text-[11px] text-text-tertiary mb-2">{p.description}</p>
                <pre className="bg-elevated rounded-md p-3 text-[11px] font-mono text-text-secondary whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{p.body}</pre>
              </div>
            )}
          </div>
        ))}
        {prompts.length === 0 && (
          <div className="bg-surface border border-border rounded-lg p-8 text-center text-text-tertiary text-[13px]">No prompt templates found.</div>
        )}
      </div>
    </div>
  )
}
