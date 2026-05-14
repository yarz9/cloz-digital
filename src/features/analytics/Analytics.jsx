import { BarChart3, TrendingUp, Users, Receipt, Target, Calendar } from 'lucide-react'

export default function Analytics() {
  const metrics = [
    { label: 'Monthly Revenue', value: '3,200 BAM', change: '+12%', positive: true },
    { label: 'Active Clients', value: '6', change: '+1', positive: true },
    { label: 'MRR', value: '1,300 BAM', change: '+200', positive: true },
    { label: 'Pipeline Value', value: '5,900 BAM', change: '+2,300', positive: true },
    { label: 'Win Rate', value: '67%', change: '-3%', positive: false },
    { label: 'Avg Deal Size', value: '1,100 BAM', change: '+100', positive: true },
  ]

  const topClients = [
    { name: 'Peak Athletics', revenue: 4200, package: 'Growth Care' },
    { name: 'Brava Interiors', revenue: 4500, package: 'Presence Care' },
    { name: 'Harmony Yoga', revenue: 3900, package: 'Growth Care' },
    { name: 'Stari Grad Restaurant', revenue: 3700, package: 'Presence Care' },
    { name: 'Zenith Consulting', revenue: 2800, package: 'Presence Care' },
  ]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[20px]">Analytics</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">Business performance metrics and insights</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map(m => (
          <div key={m.label} className="bg-surface border border-border rounded-lg p-5">
            <span className="text-[11px] text-text-tertiary">{m.label}</span>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-[22px] font-display font-bold">{m.value}</span>
              <span className={`text-[12px] font-medium mb-0.5 ${m.positive ? 'text-success' : 'text-error'}`}>{m.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Revenue by client */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-[14px] font-semibold mb-4">Revenue by Client (All Time)</h2>
          <div className="space-y-3">
            {topClients.map(c => (
              <div key={c.name} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium">{c.name}</span>
                    <span className="text-[12px] font-mono text-text-secondary">{c.revenue.toLocaleString()} BAM</span>
                  </div>
                  <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${(c.revenue / 4500) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Package distribution */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="text-[14px] font-semibold mb-4">Package Distribution</h2>
          <div className="space-y-4">
            {[
              { name: 'Presence Care', count: 3, mrr: 650, color: 'bg-success' },
              { name: 'Growth Care', count: 2, mrr: 650, color: 'bg-accent' },
              { name: 'Launch Care', count: 1, mrr: 0, color: 'bg-info' },
            ].map(p => (
              <div key={p.name} className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-sm ${p.color}`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium">{p.name}</span>
                    <span className="text-[12px] text-text-secondary">{p.count} clients</span>
                  </div>
                  {p.mrr > 0 && <span className="text-[11px] text-text-tertiary">MRR: {p.mrr} BAM</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
