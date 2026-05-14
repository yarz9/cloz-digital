import { DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Calendar, Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const monthlyData = [
  { month: 'Jan', revenue: 2100, expenses: 450, net: 1650 },
  { month: 'Feb', revenue: 2400, expenses: 480, net: 1920 },
  { month: 'Mar', revenue: 2800, expenses: 520, net: 2280 },
  { month: 'Apr', revenue: 2600, expenses: 490, net: 2110 },
  { month: 'May', revenue: 3200, expenses: 540, net: 2660 },
]

const revenueByPackage = [
  { name: 'Growth Care', mrr: 650, clients: 2, total: 7800 },
  { name: 'Presence Care', mrr: 650, clients: 3, total: 11400 },
  { name: 'Launch Care', oneTime: 2400, projects: 3, total: 7200 },
]

export default function Revenue() {
  const forecast = useAI(ai.generate)

  const runForecast = () => {
    forecast.run(
      `Based on this revenue data for Cloz Digital web agency in Bosnia: Monthly revenue trend: Jan 2100, Feb 2400, Mar 2800, Apr 2600, May 3200 BAM. MRR: 1300 BAM from 5 clients (2 Growth Care at 325 each, 3 Presence Care at ~217 each). Pipeline: 5900 BAM in active deals. Provide: 1) 3-month revenue forecast 2) Key growth drivers 3) Risk factors 4) Recommended actions to hit 5000 BAM/month by Q4. Use BAM currency.`,
      0.6
    )
  }

  const totalRevenue = monthlyData.reduce((a, m) => a + m.revenue, 0)
  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue))

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Revenue</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Financial performance and AI-powered forecasting</p>
        </div>
        <button
          onClick={runForecast}
          disabled={forecast.loading}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors disabled:opacity-50"
        >
          {forecast.loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {forecast.loading ? 'Forecasting...' : 'AI Forecast'}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'YTD Revenue', value: `${totalRevenue.toLocaleString()} BAM`, change: '+52%', positive: true },
          { label: 'MRR', value: '1,300 BAM', change: '+200 BAM', positive: true },
          { label: 'Avg Deal Size', value: '1,100 BAM', change: '+100', positive: true },
          { label: 'Net Margin', value: '82%', change: '+3%', positive: true },
        ].map(k => (
          <div key={k.label} className="bg-surface border border-border rounded-lg p-4">
            <span className="text-[11px] text-text-tertiary">{k.label}</span>
            <div className="flex items-end gap-2 mt-1">
              <span className="text-[20px] font-display font-bold">{k.value}</span>
              <span className={`text-[11px] font-medium mb-0.5 flex items-center gap-0.5 ${k.positive ? 'text-success' : 'text-error'}`}>
                {k.positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                {k.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Monthly chart */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-4">Monthly Revenue</h2>
          <div className="space-y-3">
            {monthlyData.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-[12px] text-text-tertiary w-8">{m.month}</span>
                <div className="flex-1 h-6 bg-elevated rounded overflow-hidden flex">
                  <div className="h-full bg-accent rounded-l" style={{ width: `${(m.revenue / maxRevenue) * 100}%` }}>
                    <span className="text-[10px] text-white font-medium px-2 leading-6">{m.revenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by package */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-4">Revenue by Package</h2>
          <div className="space-y-4">
            {revenueByPackage.map(p => (
              <div key={p.name} className="p-3 bg-elevated rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium">{p.name}</span>
                  <span className="text-[12px] font-mono text-text-secondary">{p.total.toLocaleString()} BAM</span>
                </div>
                <div className="text-[11px] text-text-tertiary">
                  {p.mrr ? `${p.mrr} BAM/mo · ${p.clients} clients` : `${p.oneTime} BAM avg · ${p.projects} projects`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Forecast */}
      {(forecast.loading || forecast.data?.text) && (
        <div className="bg-surface border border-accent/20 rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-accent" /> AI Revenue Forecast
          </h2>
          {forecast.loading ? (
            <div className="flex items-center gap-2 py-4">
              <Loader2 size={14} className="animate-spin text-accent" />
              <span className="text-[12px] text-text-tertiary">Running forecast model...</span>
            </div>
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
    </div>
  )
}
