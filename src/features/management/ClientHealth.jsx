import { HeartPulse, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const clients = [
  { name: 'Peak Athletics', score: 92, trend: 'up', revenue: 4200, package: 'Growth Care', lastContact: '2 days ago', invoiceStatus: 'overdue', siteUptime: '99.9%', satisfaction: 'high' },
  { name: 'Brava Interiors', score: 88, trend: 'stable', revenue: 4500, package: 'Presence Care', lastContact: '5 days ago', invoiceStatus: 'paid', siteUptime: '99.8%', satisfaction: 'high' },
  { name: 'Harmony Yoga', score: 85, trend: 'up', revenue: 3900, package: 'Growth Care', lastContact: '1 week ago', invoiceStatus: 'paid', siteUptime: '99.5%', satisfaction: 'medium' },
  { name: 'Stari Grad Restaurant', score: 78, trend: 'down', revenue: 3700, package: 'Presence Care', lastContact: '2 weeks ago', invoiceStatus: 'paid', siteUptime: '98.2%', satisfaction: 'medium' },
  { name: 'Zenith Consulting', score: 74, trend: 'stable', revenue: 2800, package: 'Presence Care', lastContact: '3 days ago', invoiceStatus: 'paid', siteUptime: '99.7%', satisfaction: 'medium' },
  { name: 'Zen Café', score: 61, trend: 'down', revenue: 1800, package: 'Presence Care', lastContact: '3 weeks ago', invoiceStatus: 'overdue', siteUptime: '97.1%', satisfaction: 'low' },
]

export default function ClientHealth() {
  const [selected, setSelected] = useState(null)
  const healthAnalysis = useAI(ai.generate)

  const analyzeHealth = (client) => {
    setSelected(client.name)
    healthAnalysis.run(
      `Analyze the health of our client relationship with "${client.name}". They're on our "${client.package}" package. Key metrics: Health score ${client.score}/100 (trending ${client.trend}), total revenue ${client.revenue} BAM, last contact ${client.lastContact}, invoice status: ${client.invoiceStatus}, site uptime: ${client.siteUptime}, satisfaction: ${client.satisfaction}. Provide: 1) Risk assessment 2) Recommended actions 3) Upsell opportunities. Be specific and actionable.`,
      0.6
    )
  }

  const avgScore = Math.round(clients.reduce((a, c) => a + c.score, 0) / clients.length)
  const atRisk = clients.filter(c => c.score < 70).length

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">Client Health</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Monitor relationship health and identify at-risk accounts</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Average Health', value: `${avgScore}%`, color: avgScore >= 80 ? 'text-success' : 'text-warning' },
          { label: 'Healthy (80+)', value: clients.filter(c => c.score >= 80).length, color: 'text-success' },
          { label: 'Needs Attention', value: clients.filter(c => c.score >= 60 && c.score < 80).length, color: 'text-warning' },
          { label: 'At Risk (<60)', value: atRisk, color: atRisk > 0 ? 'text-error' : 'text-success' },
        ].map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <span className="text-[11px] text-text-tertiary">{s.label}</span>
            <div className={`text-[22px] font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Client health list */}
        <div className="lg:col-span-3 space-y-2">
          {clients.map(c => (
            <div
              key={c.name}
              onClick={() => analyzeHealth(c)}
              className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                selected === c.name ? 'border-accent' : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold font-mono ${
                  c.score >= 80 ? 'bg-success/15 text-success' : c.score >= 60 ? 'bg-warning/15 text-warning' : 'bg-error/15 text-error'
                }`}>
                  {c.score}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{c.name}</span>
                    {c.trend === 'up' && <TrendingUp size={12} className="text-success" />}
                    {c.trend === 'down' && <TrendingDown size={12} className="text-error" />}
                  </div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">{c.package} · {c.revenue.toLocaleString()} BAM revenue</div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5">
                    {c.invoiceStatus === 'overdue' && <AlertTriangle size={11} className="text-error" />}
                    <span className={`text-[10px] ${c.invoiceStatus === 'overdue' ? 'text-error' : 'text-success'}`}>{c.invoiceStatus}</span>
                  </div>
                  <span className="text-[10px] text-text-tertiary">Contact: {c.lastContact}</span>
                </div>
              </div>
              {/* Health bar */}
              <div className="mt-3 h-1.5 bg-elevated rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${
                  c.score >= 80 ? 'bg-success' : c.score >= 60 ? 'bg-warning' : 'bg-error'
                }`} style={{ width: `${c.score}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Analysis */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" /> Health Analysis
          </h2>
          {healthAnalysis.loading ? (
            <div className="flex items-center gap-2 py-8 justify-center">
              <Loader2 size={14} className="animate-spin text-accent" />
              <span className="text-[12px] text-text-tertiary">Analyzing client health...</span>
            </div>
          ) : healthAnalysis.data?.text ? (
            <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
              {healthAnalysis.data.text.split('\n').map((line, i) => {
                if (line.includes('**')) {
                  const parts = line.split(/\*\*(.*?)\*\*/g)
                  return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                }
                return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
              })}
            </div>
          ) : (
            <p className="text-[12px] text-text-tertiary py-8 text-center">Click a client to run AI health analysis</p>
          )}
        </div>
      </div>
    </div>
  )
}
