import { useState, useMemo } from 'react'
import { Target, Sparkles, Loader2 } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  LEAD SCORING — Real leads from the store + AI analysis
// ══════════════════════════════════════════════════════════════

export default function LeadScoring() {
  const leads = useStore(s => s.leads)
  const [selected, setSelected] = useState(null)
  const analysis = useAI(ai.leadAnalysis)

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => (b.score || 0) - (a.score || 0))
  }, [leads])

  const stats = useMemo(() => ({
    hot: leads.filter(l => (l.score || 0) >= 80).length,
    warm: leads.filter(l => (l.score || 0) >= 60 && (l.score || 0) < 80).length,
    avg: leads.length ? Math.round(leads.reduce((a, l) => a + (l.score || 0), 0) / leads.length) : 0,
  }), [leads])

  const analyze = (lead) => {
    setSelected(lead.id)
    analysis.run({
      businessName: lead.name,
      industry: lead.niche || lead.industry || '',
      signals: Array.isArray(lead.signals) ? lead.signals.join(', ') : (lead.reason || lead.auditSummary || ''),
      currentScore: lead.score || 0,
      source: lead.source || lead.location || '',
    })
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px]">Lead Scoring</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">AI-powered qualification of your active leads</p>
        </div>
        <span className="text-[11px] text-text-tertiary bg-elevated px-2 py-1 rounded">
          {leads.length} lead{leads.length === 1 ? '' : 's'} tracked
        </span>
      </div>

      {leads.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Target}
            title="No leads to score"
            description="Add leads from the Scout module (real businesses from OpenStreetMap) and they'll appear here ranked by opportunity score."
            actionLabel="Open Scout"
            onAction={() => window.location.href = '/management/scout'}
          />
        </div>
      ) : (
        <>
          {/* Score distribution */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Hot Leads (80+)',    count: stats.hot,  color: 'text-success' },
              { label: 'Warm Leads (60-79)', count: stats.warm, color: 'text-warning' },
              { label: 'Avg Score',          count: stats.avg,  color: 'text-accent' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
                <span className="text-[11px] text-text-tertiary">{s.label}</span>
                <div className={`text-[24px] font-display font-bold mt-1 ${s.color}`}>{s.count}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            {/* Lead list */}
            <div className="lg:col-span-3 space-y-2">
              {sortedLeads.map(lead => {
                const score = lead.score || 0
                const status = score >= 80 ? 'hot' : score >= 60 ? 'warm' : 'cool'
                const signals = Array.isArray(lead.signals) ? lead.signals
                  : lead.auditSummary ? [lead.auditSummary]
                  : lead.reason ? [lead.reason]
                  : []
                return (
                  <div key={lead.id} onClick={() => analyze(lead)}
                    className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                      selected === lead.id ? 'border-accent' : 'border-border hover:border-border-strong'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold font-mono shrink-0 ${
                          score >= 80 ? 'bg-success/15 text-success' : score >= 60 ? 'bg-warning/15 text-warning' : 'bg-text-tertiary/15 text-text-tertiary'
                        }`}>
                          {score || '—'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium truncate block">{lead.name}</span>
                          <div className="text-[10px] text-text-tertiary mt-0.5 truncate">
                            {[lead.niche, lead.location].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                        status === 'hot' ? 'bg-error/10 text-error' : status === 'warm' ? 'bg-warning/10 text-warning' : 'bg-elevated text-text-tertiary'
                      }`}>{status}</span>
                    </div>
                    {signals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {signals.slice(0, 4).map((s, i) => (
                          <span key={i} className="text-[9px] text-text-tertiary bg-elevated px-1.5 py-0.5 rounded line-clamp-1">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* AI Analysis panel */}
            <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-accent" />
                <h2 className="font-display font-semibold text-[14px]">AI Analysis</h2>
              </div>
              {analysis.loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-[12px] text-text-tertiary">Analyzing lead…</span>
                </div>
              ) : analysis.error ? (
                <div className="text-error text-[12px] py-2">{analysis.error}</div>
              ) : analysis.data?.text ? (
                <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
                  {analysis.data.text.split('\n').map((line, i) => {
                    if (line.includes('**')) {
                      const parts = line.split(/\*\*(.*?)\*\*/g)
                      return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                    }
                    return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
                  })}
                </div>
              ) : (
                <p className="text-[12px] text-text-tertiary py-8 text-center">Click a lead to run AI analysis</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
