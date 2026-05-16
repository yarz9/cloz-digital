import { useMemo } from 'react'
import { ArrowUpRight, ArrowDownRight, Sparkles, Loader2, TrendingUp } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  REVENUE — Live financial metrics derived from invoices & clients
// ══════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function Revenue() {
  const invoices = useStore(s => s.invoices)
  const clients = useStore(s => s.clients)

  const forecast = useAI(ai.generate)

  // ── Derive monthly revenue from paid invoices ──
  const metrics = useMemo(() => {
    const paid = invoices.filter(i => i.status === 'paid' && i.paid)
    const thisYear = new Date().getFullYear()

    const monthly = MONTHS.map((m, idx) => {
      const monthInvoices = paid.filter(i => {
        const d = new Date(i.paid)
        return d.getFullYear() === thisYear && d.getMonth() === idx
      })
      const revenue = monthInvoices.reduce((s, i) => s + (i.amount || 0), 0)
      return { month: m, revenue }
    })

    const ytd = monthly.reduce((s, m) => s + m.revenue, 0)
    const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1)

    const mrr = clients.reduce((s, c) => s + (c.mrr || 0), 0)

    // Revenue by package
    const packageGroups = {}
    paid.forEach(i => {
      // Match invoice to client to find package
      const client = clients.find(c => c.name === i.client)
      const pkg = client?.package || 'Other'
      if (!packageGroups[pkg]) packageGroups[pkg] = { name: pkg, total: 0, count: 0, mrr: 0 }
      packageGroups[pkg].total += i.amount || 0
      packageGroups[pkg].count++
    })
    clients.forEach(c => {
      const pkg = c.package || 'Other'
      if (!packageGroups[pkg]) packageGroups[pkg] = { name: pkg, total: 0, count: 0, mrr: 0 }
      packageGroups[pkg].mrr += c.mrr || 0
    })
    const revenueByPackage = Object.values(packageGroups).sort((a, b) => b.total - a.total)

    const paidInvoiceCount = paid.length
    const avgDealSize = paidInvoiceCount ? Math.round(ytd / paidInvoiceCount) : 0

    // Simple month-over-month comparison (last two months with data)
    const currentMonth = new Date().getMonth()
    const lastMonthRevenue = monthly[currentMonth]?.revenue || 0
    const prevMonthRevenue = monthly[currentMonth - 1]?.revenue || 0
    const momChange = prevMonthRevenue ? Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0

    return { monthly, ytd, maxRevenue, mrr, revenueByPackage, paidInvoiceCount, avgDealSize, momChange }
  }, [invoices, clients])

  const hasData = invoices.length > 0 || clients.length > 0

  const runForecast = () => {
    if (!hasData) return
    const trend = metrics.monthly.filter(m => m.revenue > 0).map(m => `${m.month}: ${m.revenue} BAM`).join(', ')
    forecast.run(
      `You are a financial analyst for Cloz Digital, a web agency in Bosnia. Analyze this real performance data and provide a forecast.

Monthly revenue: ${trend || 'No paid invoices yet'}
YTD revenue: ${metrics.ytd} BAM
MRR: ${metrics.mrr} BAM from ${clients.filter(c => c.mrr > 0).length} retainers
Total clients: ${clients.length}
Paid invoices YTD: ${metrics.paidInvoiceCount}

Provide:
1. 3-month revenue forecast (realistic, based on the actual trend)
2. Key growth drivers
3. Risk factors
4. Three recommended actions to grow MRR

Use BAM currency. Be concise and concrete.`,
      0.6
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px]">Revenue</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Live financial performance from your invoices and retainers</p>
        </div>
        <button
          onClick={runForecast}
          disabled={forecast.loading || !hasData}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors disabled:opacity-40"
        >
          {forecast.loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {forecast.loading ? 'Forecasting…' : 'AI Forecast'}
        </button>
      </div>

      {!hasData ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={TrendingUp}
            title="No revenue data yet"
            description="Revenue charts populate from paid invoices and client retainers. Create your first invoice or register a retainer client to get started."
            actionLabel="Create Invoice"
            onAction={() => window.location.href = '/management/billing'}
            secondaryActionLabel="Add Client"
            onSecondaryAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'YTD Revenue',  value: `${metrics.ytd.toLocaleString()} BAM`, change: metrics.momChange ? `${metrics.momChange > 0 ? '+' : ''}${metrics.momChange}% MoM` : '', positive: metrics.momChange >= 0 },
              { label: 'Current MRR',  value: `${metrics.mrr.toLocaleString()} BAM`, change: `${clients.filter(c => c.mrr > 0).length} retainers`, positive: true },
              { label: 'Avg Invoice',  value: `${metrics.avgDealSize.toLocaleString()} BAM`, change: `${metrics.paidInvoiceCount} paid`, positive: true },
              { label: 'Paid Invoices',value: metrics.paidInvoiceCount,            change: `of ${invoices.length} total`, positive: true },
            ].map(k => (
              <div key={k.label} className="bg-surface border border-border rounded-lg p-4">
                <span className="text-[11px] text-text-tertiary">{k.label}</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-[20px] font-display font-bold">{k.value}</span>
                  {k.change && (
                    <span className={`text-[11px] font-medium mb-0.5 flex items-center gap-0.5 ${k.positive ? 'text-success' : 'text-error'}`}>
                      {k.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {k.change}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Monthly chart */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <h2 className="font-display font-semibold text-[14px] mb-4">Monthly Revenue ({new Date().getFullYear()})</h2>
              <div className="space-y-2">
                {metrics.monthly.map(m => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-[11px] text-text-tertiary w-8">{m.month}</span>
                    <div className="flex-1 h-5 bg-elevated rounded overflow-hidden">
                      <div className="h-full bg-accent rounded transition-all" style={{ width: `${(m.revenue / metrics.maxRevenue) * 100}%` }}>
                        {m.revenue > 0 && (
                          <span className="text-[10px] text-white font-medium px-2 leading-5">{m.revenue.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue by package */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <h2 className="font-display font-semibold text-[14px] mb-4">Revenue by Package</h2>
              {metrics.revenueByPackage.length === 0 ? (
                <p className="text-[12px] text-text-tertiary text-center py-4">No package data yet.</p>
              ) : (
                <div className="space-y-3">
                  {metrics.revenueByPackage.map(p => (
                    <div key={p.name} className="p-3 bg-elevated rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium">{p.name}</span>
                        <span className="text-[12px] font-mono text-text-secondary">{p.total.toLocaleString()} BAM</span>
                      </div>
                      <div className="text-[11px] text-text-tertiary">
                        {p.mrr > 0 ? `${p.mrr} BAM/mo MRR · ` : ''}{p.count} paid invoice{p.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Forecast */}
          {(forecast.loading || forecast.data?.text || forecast.error) && (
            <div className="bg-surface border border-accent/20 rounded-lg p-5">
              <h2 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2">
                <Sparkles size={14} className="text-accent" /> AI Revenue Forecast
              </h2>
              {forecast.loading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-[12px] text-text-tertiary">Running forecast model on your live data…</span>
                </div>
              ) : forecast.error ? (
                <div className="text-error text-[12px] py-2">{forecast.error} <button onClick={runForecast} className="underline">Retry</button></div>
              ) : (
                <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
                  {forecast.data.text.split('\n').map((line, i) => {
                    if (line.includes('**')) {
                      const parts = line.split(/\*\*(.*?)\*\*/g)
                      return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                    }
                    return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
