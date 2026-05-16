import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  ANALYTICS — Live business performance metrics
// ══════════════════════════════════════════════════════════════

export default function Analytics() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const deals = useStore(s => s.deals)

  const data = useMemo(() => {
    const activeClients = clients.filter(c => c.status !== 'archived').length
    const mrr = clients.reduce((s, c) => s + (c.mrr || 0), 0)
    const paid = invoices.filter(i => i.status === 'paid')

    // This month vs last month revenue
    const now = new Date()
    const thisMonth = paid.filter(i => {
      if (!i.paid) return false
      const d = new Date(i.paid)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const thisMonthRevenue = thisMonth.reduce((s, i) => s + (i.amount || 0), 0)

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = paid.filter(i => {
      if (!i.paid) return false
      const d = new Date(i.paid)
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear()
    })
    const lastMonthRevenue = lastMonth.reduce((s, i) => s + (i.amount || 0), 0)
    const momChange = lastMonthRevenue ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : null

    const pipelineValue = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value || 0), 0)

    const wonDeals = deals.filter(d => d.stage === 'won')
    const closedDeals = deals.filter(d => d.stage === 'won' || d.stage === 'lost')
    const winRate = closedDeals.length ? Math.round((wonDeals.length / closedDeals.length) * 100) : null

    const avgDealSize = paid.length ? Math.round(paid.reduce((s, i) => s + (i.amount || 0), 0) / paid.length) : 0

    // Top clients by revenue
    const topClients = [...clients]
      .map(c => ({ ...c, revenue: c.totalRevenue || 0 }))
      .filter(c => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
    const maxRevenue = topClients[0]?.revenue || 1

    // Package distribution
    const packageGroups = {}
    clients.forEach(c => {
      const pkg = c.package || 'Other'
      if (!packageGroups[pkg]) packageGroups[pkg] = { name: pkg, count: 0, mrr: 0 }
      packageGroups[pkg].count++
      packageGroups[pkg].mrr += c.mrr || 0
    })
    const packageDistribution = Object.values(packageGroups).sort((a, b) => b.count - a.count)

    return { activeClients, mrr, thisMonthRevenue, momChange, pipelineValue, winRate, avgDealSize, topClients, maxRevenue, packageDistribution }
  }, [clients, invoices, deals])

  const hasData = clients.length > 0 || invoices.length > 0 || deals.length > 0

  const metrics = [
    { label: 'This Month Revenue', value: `${data.thisMonthRevenue.toLocaleString()} BAM`, change: data.momChange != null ? `${data.momChange > 0 ? '+' : ''}${data.momChange}%` : '—', positive: (data.momChange || 0) >= 0 },
    { label: 'Active Clients',     value: data.activeClients,             change: '', positive: true },
    { label: 'MRR',                value: `${data.mrr.toLocaleString()} BAM`,        change: '', positive: true },
    { label: 'Pipeline Value',     value: `${data.pipelineValue.toLocaleString()} BAM`,change: '', positive: true },
    { label: 'Win Rate',           value: data.winRate != null ? `${data.winRate}%` : '—', change: '', positive: (data.winRate || 0) >= 50 },
    { label: 'Avg Invoice',        value: `${data.avgDealSize.toLocaleString()} BAM`, change: '', positive: true },
  ]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[20px]">Analytics</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Live business performance metrics from your real data</p>
      </div>

      {!hasData ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={BarChart3}
            title="No analytics data yet"
            description="Analytics calculates metrics from clients, invoices, and deals. Add a few records to start seeing trends, top clients, and pipeline value."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(m => (
              <div key={m.label} className="bg-surface border border-border rounded-lg p-5">
                <span className="text-[11px] text-text-tertiary">{m.label}</span>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-[22px] font-display font-bold">{m.value}</span>
                  {m.change && (
                    <span className={`text-[12px] font-medium mb-0.5 ${m.positive ? 'text-success' : 'text-error'}`}>{m.change}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="bg-surface border border-border rounded-lg p-5">
              <h2 className="text-[14px] font-semibold mb-4">Top Clients by Revenue</h2>
              {data.topClients.length === 0 ? (
                <p className="text-[12px] text-text-tertiary py-4 text-center">No revenue recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.topClients.map(c => (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[13px] font-medium truncate">{c.name}</span>
                          <span className="text-[12px] font-mono text-text-secondary shrink-0 ml-2">{c.revenue.toLocaleString()} BAM</span>
                        </div>
                        <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${(c.revenue / data.maxRevenue) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-lg p-5">
              <h2 className="text-[14px] font-semibold mb-4">Package Distribution</h2>
              {data.packageDistribution.length === 0 ? (
                <p className="text-[12px] text-text-tertiary py-4 text-center">No clients yet.</p>
              ) : (
                <div className="space-y-4">
                  {data.packageDistribution.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-sm ${i === 0 ? 'bg-accent' : i === 1 ? 'bg-success' : 'bg-info'}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium">{p.name}</span>
                          <span className="text-[12px] text-text-secondary">{p.count} client{p.count !== 1 ? 's' : ''}</span>
                        </div>
                        {p.mrr > 0 && <span className="text-[11px] text-text-tertiary">MRR: {p.mrr} BAM</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
