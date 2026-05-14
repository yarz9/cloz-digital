import { Brain, Sparkles, Loader2, RefreshCw, TrendingUp, AlertTriangle, Target, DollarSign } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const insightCategories = [
  { id: 'growth', label: 'Growth Opportunities', icon: TrendingUp, color: 'text-success',
    prompt: 'Analyze growth opportunities for Cloz Digital, a web design studio in Bosnia. Current state: 12 active clients, 3200 BAM monthly revenue, 1300 BAM MRR, services include Launch Care (one-time builds), Growth Care (monthly), Presence Care (monthly). Pipeline: 5900 BAM in deals. Market: Bosnia and Herzegovina, serving small-medium businesses. Provide 5 specific, actionable growth strategies with expected impact and timeline.' },
  { id: 'risk', label: 'Risk Assessment', icon: AlertTriangle, color: 'text-warning',
    prompt: 'Assess business risks for Cloz Digital, a web design studio in Bosnia. Key data: 2 overdue invoices (650 BAM total), 2 domains expiring soon, 1 client with declining health score, dependency on 5 recurring clients for MRR. Identify: 1) Revenue risks 2) Client retention risks 3) Operational risks 4) Market risks. For each, suggest mitigation strategies.' },
  { id: 'pricing', label: 'Pricing Optimization', icon: DollarSign, color: 'text-accent',
    prompt: 'Analyze pricing strategy for Cloz Digital in Bosnia. Current packages: Launch Care (one-time, from 800 BAM), Growth Care (325 BAM/month, includes SEO, content, analytics), Presence Care (217 BAM/month, hosting, maintenance, support). Average deal size: 1100 BAM. Competitors charge 200-3000 BAM. Currency: BAM (Bosnian convertible mark). Provide: 1) Are we priced correctly? 2) Upsell opportunities 3) New package ideas 4) Pricing psychology tips.' },
  { id: 'market', label: 'Market Analysis', icon: Target, color: 'text-info',
    prompt: 'Analyze the web design market in Bosnia and Herzegovina for Cloz Digital. Focus areas: 1) Market size and growth 2) Underserved industries 3) Digital adoption trends 4) Geographic expansion opportunities (Sarajevo, Mostar, Banja Luka, Tuzla, Zenica) 5) Emerging needs (e-commerce, booking systems, AI integration). Our current focus: small-medium businesses without professional web presence.' },
]

export default function AIInsights() {
  const [activeInsight, setActiveInsight] = useState(null)
  const insight = useAI(ai.generate)

  const runInsight = (category) => {
    setActiveInsight(category.id)
    insight.run(category.prompt, 0.7)
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">AI Insights</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">AI-generated strategic analysis and business intelligence</p>
      </div>

      {/* Insight categories */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {insightCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => runInsight(cat)}
            disabled={insight.loading}
            className={`bg-surface border rounded-lg p-4 text-left transition-colors hover:border-accent/30 ${
              activeInsight === cat.id ? 'border-accent' : 'border-border'
            } disabled:opacity-50`}
          >
            <cat.icon size={18} className={cat.color} />
            <span className="text-[13px] font-medium block mt-2">{cat.label}</span>
            <span className="text-[10px] text-text-tertiary mt-1 block">Click to generate</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="bg-surface border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain size={16} className="text-accent" />
          <h2 className="font-display font-semibold text-[15px]">
            {activeInsight ? insightCategories.find(c => c.id === activeInsight)?.label : 'AI Analysis'}
          </h2>
          {activeInsight && !insight.loading && (
            <button
              onClick={() => runInsight(insightCategories.find(c => c.id === activeInsight))}
              className="ml-auto text-[10px] text-text-tertiary hover:text-accent flex items-center gap-1"
            >
              <RefreshCw size={10} /> Regenerate
            </button>
          )}
        </div>

        {insight.loading ? (
          <div className="flex items-center gap-2 py-12 justify-center">
            <Loader2 size={16} className="animate-spin text-accent" />
            <span className="text-[13px] text-text-tertiary">Generating strategic insights...</span>
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
