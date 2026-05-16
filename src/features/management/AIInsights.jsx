import { useState, useMemo } from 'react'
import { Brain, Sparkles, Loader2, RefreshCw, TrendingUp, AlertTriangle, Target, DollarSign } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'

// ══════════════════════════════════════════════════════════════
//  AI INSIGHTS — Strategic analysis built from live store data
// ══════════════════════════════════════════════════════════════

export default function AIInsights() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const deals = useStore(s => s.deals)
  const leads = useStore(s => s.leads)

  const ctx = useMemo(() => {
    const activeClients = clients.filter(c => c.status !== 'archived').length
    const mrr = clients.reduce((s, c) => s + (c.mrr || 0), 0)
    const totalRevenue = clients.reduce((s, c) => s + (c.totalRevenue || 0), 0)
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.amount || 0), 0)
    const atRiskClients = clients.filter(c => c.status === 'at-risk' || (c.healthScore || 0) < 70).length
    const pipelineValue = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value || 0), 0)
    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length
    const hotLeads = leads.filter(l => (l.score || 0) >= 80).length
    return { activeClients, mrr, totalRevenue, overdueInvoices, overdueTotal, atRiskClients, pipelineValue, activeDeals, hotLeads }
  }, [clients, invoices, deals, leads])

  const hasData = clients.length > 0 || invoices.length > 0 || leads.length > 0

  const categories = [
    {
      id: 'growth', label: 'Growth Opportunities', icon: TrendingUp, color: 'text-success',
      buildPrompt: () => `Analyze growth opportunities for Cloz Digital, a premium web design studio in Bosnia.
Current state: ${ctx.activeClients} active clients, ${ctx.mrr} BAM MRR, ${ctx.totalRevenue} BAM total revenue earned.
Pipeline: ${ctx.pipelineValue} BAM across ${ctx.activeDeals} active deals. ${ctx.hotLeads} hot leads.
Services: Launch Care (one-time builds, 800 BAM), Growth Care (1500 BAM + retainer), Presence Care (200 BAM/month).
Market: Bosnia and Herzegovina + Balkans, serving small-medium businesses.
Provide 5 specific, actionable growth strategies with expected impact and timeline.`
    },
    {
      id: 'risk', label: 'Risk Assessment', icon: AlertTriangle, color: 'text-warning',
      buildPrompt: () => `Assess business risks for Cloz Digital based on real metrics.
Overdue invoices: ${ctx.overdueInvoices.length} totaling ${ctx.overdueTotal} BAM.
At-risk clients: ${ctx.atRiskClients} out of ${ctx.activeClients} active.
MRR base: ${ctx.mrr} BAM from retainer clients.
Identify: 1) Revenue concentration risk 2) Client retention risk 3) Operational risk 4) Market risk. For each, suggest mitigation.`
    },
    {
      id: 'pricing', label: 'Pricing Optimization', icon: DollarSign, color: 'text-accent',
      buildPrompt: () => `Analyze pricing strategy for Cloz Digital in Bosnia. Current packages:
- Launch Care: 800 BAM (one-time, 5 pages)
- Growth Care: 1500 BAM + monthly retainer (12 pages + ongoing)
- Presence Care: 200 BAM/month (hosting + maintenance only)
Current MRR: ${ctx.mrr} BAM across ${clients.filter(c => c.mrr > 0).length} retainer clients.
Currency: BAM. Competitors: 200-3000 BAM. Provide: 1) Are packages priced correctly? 2) Upsell opportunities 3) New package ideas 4) Pricing psychology tips.`
    },
    {
      id: 'market', label: 'Market Analysis', icon: Target, color: 'text-info',
      buildPrompt: () => `Analyze the web design market in Bosnia and Herzegovina and the wider Balkans for Cloz Digital.
Focus: 1) Market size and growth 2) Underserved industries 3) Digital adoption trends 4) Geographic expansion (Sarajevo, Mostar, Banja Luka, Tuzla, Zenica, Croatia/Serbia markets) 5) Emerging needs (e-commerce, booking systems, AI integration). Current focus: small-medium businesses without professional web presence. ${leads.length} leads currently tracked.`
    },
  ]

  const [activeInsight, setActiveInsight] = useState(null)
  const insight = useAI(ai.generate)

  const runInsight = (category) => {
    setActiveInsight(category.id)
    insight.run(category.buildPrompt(), 0.7)
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">AI Insights</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">AI-generated strategic analysis built from your live business data</p>
      </div>

      {!hasData && (
        <div className="bg-info/5 border border-info/20 rounded-lg p-4 text-[12px] text-info">
          <Sparkles size={12} className="inline mr-1.5" />
          AI insights work best with real data. Add a few clients, invoices, or leads first for meaningful analysis.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map(cat => (
          <button key={cat.id} onClick={() => runInsight(cat)} disabled={insight.loading}
            className={`bg-surface border rounded-lg p-4 text-left transition-colors hover:border-accent/30 ${
              activeInsight === cat.id ? 'border-accent' : 'border-border'
            } disabled:opacity-50`}>
            <cat.icon size={18} className={cat.color} />
            <span className="text-[13px] font-medium block mt-2">{cat.label}</span>
            <span className="text-[10px] text-text-tertiary mt-1 block">Click to generate</span>
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-accent" />
          <h2 className="font-display font-semibold text-[15px]">
            {activeInsight ? categories.find(c => c.id === activeInsight)?.label : 'AI Analysis'}
          </h2>
          {activeInsight && !insight.loading && (
            <button onClick={() => runInsight(categories.find(c => c.id === activeInsight))}
              className="ml-auto text-[10px] text-text-tertiary hover:text-accent flex items-center gap-1">
              <RefreshCw size={10} /> Regenerate
            </button>
          )}
        </div>

        {insight.loading ? (
          <div className="flex items-center gap-2 py-12 justify-center">
            <Loader2 size={16} className="animate-spin text-accent" />
            <span className="text-[13px] text-text-tertiary">Generating strategic insights…</span>
          </div>
        ) : insight.error ? (
          <div className="text-error text-[12px] py-4">{insight.error}</div>
        ) : insight.data?.text ? (
          <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
            {insight.data.text.split('\n').map((line, i) => {
              if (line.includes('**')) {
                const parts = line.split(/\*\*(.*?)\*\*/g)
                return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
              }
              return line ? <p key={i} className="mb-2">{line}</p> : <br key={i} />
            })}
          </div>
        ) : (
          <p className="text-[13px] text-text-tertiary py-12 text-center">Select a category above to generate AI-powered strategic insights</p>
        )}
      </div>
    </div>
  )
}
