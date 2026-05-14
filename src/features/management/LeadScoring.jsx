import { useState } from 'react'
import { Target, TrendingUp, ArrowUpRight, Sparkles, Loader2, RefreshCw } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const leads = [
  { id: 1, name: 'Sarajevo Dental Clinic', score: 92, source: 'Google Maps', industry: 'Healthcare', signals: ['No website', '4.8 rating', '200+ reviews', 'Active posting'], status: 'hot', lastContact: null },
  { id: 2, name: 'Alpine Outdoor Shop', score: 87, source: 'Manual scout', industry: 'Retail', signals: ['Outdated site (2018)', 'No mobile', 'Broken forms', 'High traffic area'], status: 'hot', lastContact: '2026-05-11' },
  { id: 3, name: 'Mostar Photography Studio', score: 81, source: 'Referral', industry: 'Creative', signals: ['Wix free plan', 'Slow load', 'No portfolio gallery', 'Active Instagram'], status: 'warm', lastContact: null },
  { id: 4, name: 'Banja Luka Bakery Co', score: 74, source: 'Google Maps', industry: 'Food & Bev', signals: ['Facebook only', '4.2 rating', 'No online ordering'], status: 'warm', lastContact: '2026-05-06' },
  { id: 5, name: 'Tuzla Legal Associates', score: 68, source: 'LinkedIn', industry: 'Legal', signals: ['Basic template site', 'No SSL', 'Outdated content'], status: 'cool', lastContact: '2026-04-28' },
  { id: 6, name: 'Zenica Fitness Hub', score: 63, source: 'Manual scout', industry: 'Fitness', signals: ['Squarespace', 'Poor SEO', 'No booking system'], status: 'cool', lastContact: null },
]

export default function LeadScoring() {
  const [selected, setSelected] = useState(null)
  const analysis = useAI(ai.leadAnalysis)

  const analyze = (lead) => {
    setSelected(lead.id)
    analysis.run({
      businessName: lead.name,
      industry: lead.industry,
      signals: lead.signals.join(', '),
      currentScore: lead.score,
      source: lead.source,
    })
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Lead Scoring</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">AI-powered lead qualification and prioritization</p>
        </div>
        <div className="flex gap-2">
          <span className="text-[11px] text-text-tertiary bg-elevated px-2 py-1 rounded">{leads.length} leads tracked</span>
        </div>
      </div>

      {/* Score distribution */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Hot Leads (80+)', count: leads.filter(l => l.score >= 80).length, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Warm Leads (60-79)', count: leads.filter(l => l.score >= 60 && l.score < 80).length, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Avg Score', count: Math.round(leads.reduce((a, l) => a + l.score, 0) / leads.length), color: 'text-accent', bg: 'bg-accent-muted' },
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
          {leads.map(lead => (
            <div
              key={lead.id}
              onClick={() => analyze(lead)}
              className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                selected === lead.id ? 'border-accent' : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold font-mono ${
                    lead.score >= 80 ? 'bg-success/15 text-success' : lead.score >= 60 ? 'bg-warning/15 text-warning' : 'bg-text-tertiary/15 text-text-tertiary'
                  }`}>
                    {lead.score}
                  </div>
                  <div>
                    <span className="text-[13px] font-medium">{lead.name}</span>
                    <div className="text-[10px] text-text-tertiary mt-0.5">{lead.industry} · {lead.source}</div>
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  lead.status === 'hot' ? 'bg-error/10 text-error' : lead.status === 'warm' ? 'bg-warning/10 text-warning' : 'bg-elevated text-text-tertiary'
                }`}>{lead.status}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {lead.signals.map(s => (
                  <span key={s} className="text-[9px] text-text-tertiary bg-elevated px-1.5 py-0.5 rounded">{s}</span>
                ))}
              </div>
            </div>
          ))}
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
              <span className="text-[12px] text-text-tertiary">Analyzing lead...</span>
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
    </div>
  )
}
