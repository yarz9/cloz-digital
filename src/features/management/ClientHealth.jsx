import { useState, useMemo } from 'react'
import { HeartPulse, TrendingUp, TrendingDown, AlertTriangle, Sparkles, Loader2 } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  CLIENT HEALTH — Real metrics derived from client + invoice data
// ══════════════════════════════════════════════════════════════

export default function ClientHealth() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)

  const [selected, setSelected] = useState(null)
  const healthAnalysis = useAI(ai.generate)

  const enriched = useMemo(() => {
    return clients.map(c => {
      const clientInvoices = invoices.filter(i => i.client === c.name)
      const overdue = clientInvoices.filter(i => i.status === 'overdue').length
      const invoiceStatus = overdue > 0 ? 'overdue' : 'paid'
      return {
        ...c,
        score: c.healthScore || 0,
        revenue: c.totalRevenue || 0,
        invoiceStatus,
        trend: c.status === 'at-risk' ? 'down' : 'stable',
      }
    }).sort((a, b) => b.score - a.score)
  }, [clients, invoices])

  const avgScore = enriched.length ? Math.round(enriched.reduce((a, c) => a + (c.score || 0), 0) / enriched.length) : 0
  const atRisk = enriched.filter(c => (c.score || 0) < 60).length
  const healthy = enriched.filter(c => (c.score || 0) >= 80).length
  const needAttention = enriched.filter(c => (c.score || 0) >= 60 && (c.score || 0) < 80).length

  const analyzeHealth = (client) => {
    setSelected(client.id)
    healthAnalysis.run(
      `Analyze the health of our client relationship with "${client.name}" on "${client.package}" package. Key metrics: Health score ${client.score}/100, total revenue ${client.revenue} BAM, status: ${client.status}, invoice status: ${client.invoiceStatus}, last maintenance: ${client.lastMaintenance || 'never'}. Provide: 1) Risk assessment 2) Recommended actions 3) Upsell opportunities. Be specific and actionable.`,
      0.6
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[20px]">Client Health</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Monitor relationship health and identify at-risk accounts</p>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={HeartPulse}
            title="No clients to assess"
            description="Client health scores appear here once you register clients. Score factors include payment timeliness, maintenance recency, and overall account status."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Average Health',  value: `${avgScore}%`, color: avgScore >= 80 ? 'text-success' : avgScore >= 60 ? 'text-warning' : 'text-error' },
              { label: 'Healthy (80+)',   value: healthy,         color: 'text-success' },
              { label: 'Needs Attention', value: needAttention,   color: 'text-warning' },
              { label: 'At Risk (<60)',   value: atRisk,          color: atRisk > 0 ? 'text-error' : 'text-success' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
                <span className="text-[11px] text-text-tertiary">{s.label}</span>
                <div className={`text-[22px] font-display font-bold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-2">
              {enriched.map(c => (
                <div key={c.id} onClick={() => analyzeHealth(c)}
                  className={`bg-surface border rounded-lg p-4 cursor-pointer transition-colors ${
                    selected === c.id ? 'border-accent' : 'border-border hover:border-border-strong'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold font-mono shrink-0 ${
                      c.score >= 80 ? 'bg-success/15 text-success' : c.score >= 60 ? 'bg-warning/15 text-warning' : 'bg-error/15 text-error'
                    }`}>
                      {c.score || '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium truncate">{c.name}</span>
                        {c.trend === 'up' && <TrendingUp size={12} className="text-success" />}
                        {c.trend === 'down' && <TrendingDown size={12} className="text-error" />}
                      </div>
                      <div className="text-[10px] text-text-tertiary mt-0.5">{c.package} · {c.revenue.toLocaleString()} BAM revenue</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        {c.invoiceStatus === 'overdue' && <AlertTriangle size={11} className="text-error" />}
                        <span className={`text-[10px] ${c.invoiceStatus === 'overdue' ? 'text-error' : 'text-success'}`}>{c.invoiceStatus}</span>
                      </div>
                      <span className="text-[10px] text-text-tertiary">{c.lastMaintenance ? `Maint: ${c.lastMaintenance}` : 'No maint. yet'}</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-elevated rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${c.score >= 80 ? 'bg-success' : c.score >= 60 ? 'bg-warning' : 'bg-error'}`}
                      style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
              <h2 className="font-display font-semibold text-[14px] mb-4 flex items-center gap-2">
                <Sparkles size={14} className="text-accent" /> Health Analysis
              </h2>
              {healthAnalysis.loading ? (
                <div className="flex items-center gap-2 py-8 justify-center">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-[12px] text-text-tertiary">Analyzing client health…</span>
                </div>
              ) : healthAnalysis.error ? (
                <div className="text-[12px] text-error py-2">{healthAnalysis.error}</div>
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
        </>
      )}
    </div>
  )
}
