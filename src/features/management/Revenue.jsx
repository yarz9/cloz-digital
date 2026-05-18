import { useMemo, useState } from 'react'
import {
  ArrowUpRight, ArrowDownRight, Sparkles, Loader2, TrendingUp,
  Layout, DollarSign, Repeat, Target, BarChart3, Activity, Brain, AlertTriangle,
  CheckCircle2, RefreshCw, Calendar,
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  useInvoices, useRetainers, useRevenueOverview,
  useGenerateAIForecast, useForecastSnapshots,
} from '@/hooks/queries/finance'
import { useToast } from '@/components/ui/Toast'
import { useUser } from '@/contexts/UserContext'
import FinanceImportPrompt from './FinanceImportPrompt'

// Adapter — normalises a /api/finance/invoices row onto the legacy
// shape that computeMetrics + every tab still expects. Lets us swap
// the data source without rewriting 800+ lines of derived analysis.
function adaptInvoice(row) {
  return {
    ...row,
    id: row.invoice_number || row.id,
    client: row.client_name || '',
    issued: row.issued_date || '',
    due: row.due_date || '',
    paid: row.paid_date || '',
    amount: row.amount || 0,
  }
}

// Merge backend retainers into the legacy `clients` shape used by
// computeMetrics' MRR / LTV / churn logic. Each retainer becomes a
// pseudo-client with mrr=monthly_amount; if a real Zustand client of
// the same name already exists we update its mrr in place.
function mergeRetainers(zustandClients, retainers) {
  const out = (zustandClients || []).map(c => ({ ...c }))
  const byName = new Map(out.map(c => [(c.name || '').toLowerCase(), c]))
  for (const r of (retainers || [])) {
    const key = (r.client_name || '').toLowerCase()
    if (byName.has(key)) {
      byName.get(key).mrr = r.monthly_amount || 0
      byName.get(key).package = byName.get(key).package || r.package || ''
    } else {
      out.push({
        id: r.id,
        name: r.client_name || '(retainer)',
        package: r.package || '',
        mrr: r.monthly_amount || 0,
        healthScore: 80,
      })
    }
  }
  return out
}

// ══════════════════════════════════════════════════════════════
//  REVENUE — Financial Intelligence & Executive Dashboard
//  Builds on the existing invoice + retainer model with cash flow,
//  MRR/ARR, profitability, weighted forecasting, LTV, churn risk,
//  KPI scorecards, tax reserve, and budget planning.
// ══════════════════════════════════════════════════════════════

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Configurable defaults — kept conservative for a small Bosnia-based agency
const TAX_RESERVE_PCT = 0.25       // % of paid revenue to reserve for tax obligations
const OPEX_PCT = 0.18              // baseline cost-of-revenue assumption (hosting, tools, fees)
const RETAINER_MULT = 24           // months for LTV projection on retainers
const CHURN_HEALTH_THRESHOLD = 70  // health score below this counts as at-risk
const CHURN_INACTIVITY_DAYS = 60   // no maintenance in 60+ days = at-risk

const TABS = [
  { key: 'overview',      label: 'Overview',         icon: Layout },
  { key: 'cashflow',      label: 'Cash Flow',        icon: DollarSign },
  { key: 'recurring',     label: 'Recurring Revenue',icon: Repeat },
  { key: 'profitability', label: 'Profitability',    icon: BarChart3 },
  { key: 'forecasting',   label: 'Forecasting',      icon: Target },
  { key: 'kpis',          label: 'KPI Scorecards',   icon: Activity },
  { key: 'ai',            label: 'AI Insights',      icon: Brain },
]

export default function Revenue() {
  // ── Authoritative finance data — PostgreSQL via TanStack Query ──
  const invoicesQuery  = useInvoices()
  const retainersQuery = useRetainers()
  const overviewQuery  = useRevenueOverview()

  // CRM analytics inputs (LTV / churn) — still Zustand stubs until
  // the Clients + Pipeline backends land in their own focused work.
  const zustandClients = useStore(s => s.clients)
  const deals          = useStore(s => s.deals)

  const [tab, setTab] = useState('overview')

  const invoices  = useMemo(
    () => (invoicesQuery.data?.invoices || []).map(adaptInvoice),
    [invoicesQuery.data]
  )
  const clients   = useMemo(
    () => mergeRetainers(zustandClients, retainersQuery.data?.retainers || []),
    [zustandClients, retainersQuery.data]
  )

  const metrics  = useMemo(() => computeMetrics({ invoices, clients, deals }), [invoices, clients, deals])
  const loading  = invoicesQuery.isLoading || retainersQuery.isLoading || overviewQuery.isLoading
  const hasData  = invoices.length > 0 || clients.length > 0 || deals.length > 0

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">Financial Intelligence</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Executive view of cash flow, MRR/ARR, profitability, forecasts, and KPIs</p>
        </div>
      </div>

      {/* One-time legacy localStorage lift */}
      <FinanceImportPrompt backendOverview={overviewQuery.data} />

      {/* Tab nav */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors focus-ring ${
              tab === t.key ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
            }`}>
            <t.icon size={12} />{t.label}
          </button>
        ))}
      </div>

      {loading && !hasData ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-premium space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-28" />
              <Skeleton className="h-2 w-20" />
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={TrendingUp}
            title="No financial data yet"
            description="The Financial Intelligence Dashboard becomes live as soon as you have invoices, retainers, or pipeline. Create your first invoice or register a retainer client to begin."
            actionLabel="Create Invoice"
            onAction={() => window.location.href = '/management/billing'}
            secondaryActionLabel="Add Client"
            onSecondaryAction={() => window.location.href = '/management/clients'}
          />
        </div>
      ) : (
        <>
          {tab === 'overview'      && <OverviewTab metrics={metrics} clients={clients} invoices={invoices} />}
          {tab === 'cashflow'      && <CashFlowTab metrics={metrics} invoices={invoices} />}
          {tab === 'recurring'     && <RecurringTab metrics={metrics} clients={clients} />}
          {tab === 'profitability' && <ProfitabilityTab metrics={metrics} clients={clients} invoices={invoices} />}
          {tab === 'forecasting'   && <ForecastingTab metrics={metrics} deals={deals} />}
          {tab === 'kpis'          && <KPITab metrics={metrics} />}
          {tab === 'ai'            && <AIInsightsTab metrics={metrics} clients={clients} deals={deals} />}
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  METRIC COMPUTATION
// ══════════════════════════════════════════════════════════════

function daysBetween(dateStr) {
  if (!dateStr) return null
  return Math.round((new Date() - new Date(dateStr)) / 86400000)
}

function computeMetrics({ invoices, clients, deals }) {
  const thisYear = new Date().getFullYear()
  const now = new Date()
  const currentMonth = now.getMonth()

  // ── Invoice classification ──
  const paid = invoices.filter(i => i.status === 'paid' && i.paid)
  const pending = invoices.filter(i => i.status === 'pending')
  const overdue = invoices.filter(i => i.status === 'overdue')

  // ── Monthly revenue series (this year) ──
  const monthly = MONTHS.map((m, idx) => {
    const monthPaid = paid.filter(i => {
      const d = new Date(i.paid)
      return d.getFullYear() === thisYear && d.getMonth() === idx
    })
    const monthIssued = invoices.filter(i => {
      if (!i.issued) return false
      const d = new Date(i.issued)
      return d.getFullYear() === thisYear && d.getMonth() === idx
    })
    return {
      month: m,
      revenue: monthPaid.reduce((s, i) => s + (i.amount || 0), 0),
      issued: monthIssued.reduce((s, i) => s + (i.amount || 0), 0),
      paidCount: monthPaid.length,
    }
  })

  const ytd = monthly.reduce((s, m) => s + m.revenue, 0)
  const maxRevenue = Math.max(...monthly.map(m => m.revenue), 1)

  // ── MRR / ARR ──
  const retainerClients = clients.filter(c => (c.mrr || 0) > 0)
  const mrr = retainerClients.reduce((s, c) => s + (c.mrr || 0), 0)
  const arr = mrr * 12

  // ── Cash flow ──
  // Inflows = paid invoices; outflows = OPEX estimate; tax reserve = % of revenue
  const outstanding = pending.reduce((s, i) => s + (i.amount || 0), 0)
  const overdueTotal = overdue.reduce((s, i) => s + (i.amount || 0), 0)
  const cashIn30 = pending.filter(i => {
    const d = daysBetween(i.due)
    return d != null && d >= -60 && d <= 30  // due within 30 days, or recently overdue
  }).reduce((s, i) => s + (i.amount || 0), 0) + (mrr || 0)  // assume MRR continues

  const expectedOpex = Math.round(ytd * OPEX_PCT)
  const taxReserve = Math.round(ytd * TAX_RESERVE_PCT)
  const cashFromMonth = monthly[currentMonth]?.revenue || 0
  const runwayMonths = mrr > 0 ? Math.round((cashFromMonth * 12) / Math.max(mrr * 1, 1)) : null

  // ── Profitability by client (LTV-style) ──
  const profitabilityByClient = clients.map(c => {
    const clientInvoices = paid.filter(i => i.client === c.name)
    const total = clientInvoices.reduce((s, i) => s + (i.amount || 0), 0)
    const projectedLtv = total + ((c.mrr || 0) * RETAINER_MULT)
    const grossMargin = Math.round(total * (1 - OPEX_PCT))
    return {
      id: c.id,
      name: c.name,
      package: c.package || 'Other',
      mrr: c.mrr || 0,
      totalPaid: total,
      invoiceCount: clientInvoices.length,
      projectedLtv,
      grossMargin,
      healthScore: c.healthScore || 0,
      lastMaintenance: c.lastMaintenance,
      churnRisk: classifyChurnRisk(c),
    }
  }).sort((a, b) => b.projectedLtv - a.projectedLtv)

  // ── Profitability by package / service ──
  const packageGroups = {}
  paid.forEach(i => {
    const client = clients.find(c => c.name === i.client)
    const pkg = client?.package || 'Other'
    if (!packageGroups[pkg]) packageGroups[pkg] = { name: pkg, total: 0, count: 0, mrr: 0, clients: 0 }
    packageGroups[pkg].total += i.amount || 0
    packageGroups[pkg].count++
  })
  clients.forEach(c => {
    const pkg = c.package || 'Other'
    if (!packageGroups[pkg]) packageGroups[pkg] = { name: pkg, total: 0, count: 0, mrr: 0, clients: 0 }
    packageGroups[pkg].mrr += c.mrr || 0
    packageGroups[pkg].clients++
  })
  const revenueByPackage = Object.values(packageGroups).map(p => ({
    ...p,
    grossMargin: Math.round(p.total * (1 - OPEX_PCT)),
    marginPct: 100 - Math.round(OPEX_PCT * 100),
  })).sort((a, b) => b.total - a.total)

  // ── Pipeline forecast (weighted) ──
  const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost')
  const stageProb = { new: 0.10, qualified: 0.30, proposal: 0.50, negotiation: 0.70, won: 1.0, lost: 0 }
  const weightedPipeline = activeDeals.reduce((s, d) => {
    const prob = d.prob != null ? d.prob / 100 : (stageProb[d.stage] || 0.2)
    return s + (d.value || 0) * prob
  }, 0)
  const totalPipeline = activeDeals.reduce((s, d) => s + (d.value || 0), 0)

  // ── Churn risk ──
  const atRiskClients = profitabilityByClient.filter(c => c.churnRisk !== 'low')
  const churnRiskMrr = atRiskClients.reduce((s, c) => s + (c.mrr || 0), 0)
  const churnRate = clients.length ? Math.round((atRiskClients.length / clients.length) * 100) : 0

  // ── KPIs ──
  const avgInvoice = paid.length ? Math.round(ytd / paid.length) : 0
  const collectionRate = invoices.length ? Math.round((paid.length / invoices.length) * 100) : 100
  const lastMonthRevenue = monthly[currentMonth]?.revenue || 0
  const prevMonthRevenue = monthly[currentMonth - 1]?.revenue || 0
  const momChange = prevMonthRevenue ? Math.round(((lastMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100) : 0

  // Trailing 3-month avg → next-month estimate
  const trailing3 = monthly.slice(Math.max(0, currentMonth - 2), currentMonth + 1).filter(m => m.revenue > 0)
  const trailingAvg = trailing3.length ? Math.round(trailing3.reduce((s, m) => s + m.revenue, 0) / trailing3.length) : 0
  const nextMonthForecast = Math.round(trailingAvg + mrr * 0.05)  // simple uplift from MRR growth assumption
  const ninetyDayForecast = Math.round((trailingAvg + mrr) * 3)

  // ── Revenue attribution by source ──
  const sourceGroups = { 'Retainer (MRR)': mrr, 'Project (one-time)': 0 }
  paid.forEach(i => {
    const client = clients.find(c => c.name === i.client)
    if (!client?.mrr) sourceGroups['Project (one-time)'] += i.amount || 0
  })
  const sourceTotal = Object.values(sourceGroups).reduce((s, v) => s + v, 0) || 1
  const attribution = Object.entries(sourceGroups).map(([source, amount]) => ({
    source, amount, pct: Math.round((amount / sourceTotal) * 100),
  })).filter(s => s.amount > 0)

  return {
    monthly, ytd, maxRevenue, mrr, arr,
    paid, pending, overdue, outstanding, overdueTotal, cashIn30,
    expectedOpex, taxReserve, runwayMonths,
    revenueByPackage, profitabilityByClient,
    activeDeals, weightedPipeline, totalPipeline,
    atRiskClients, churnRiskMrr, churnRate,
    avgInvoice, collectionRate, momChange,
    trailingAvg, nextMonthForecast, ninetyDayForecast,
    attribution,
    retainerCount: retainerClients.length,
  }
}

function classifyChurnRisk(client) {
  const health = client.healthScore || 0
  const daysSinceMaintenance = daysBetween(client.lastMaintenance)
  if (client.status === 'at-risk') return 'high'
  if (health > 0 && health < CHURN_HEALTH_THRESHOLD) return 'high'
  if (daysSinceMaintenance != null && daysSinceMaintenance > CHURN_INACTIVITY_DAYS && client.mrr > 0) return 'medium'
  if (health > 0 && health < 85) return 'medium'
  return 'low'
}

// ══════════════════════════════════════════════════════════════
//  SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════

const fmtBAM = (n) => `${Math.round(n || 0).toLocaleString()} BAM`

function KPI({ label, value, change, positive, sub, color, icon: Icon }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-text-tertiary">{label}</span>
        {Icon && <Icon size={13} className={color || 'text-text-tertiary'} />}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-[20px] font-display font-bold ${color || ''}`}>{value}</span>
        {change && (
          <span className={`text-[11px] font-medium mb-0.5 flex items-center gap-0.5 ${positive ? 'text-success' : 'text-error'}`}>
            {positive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}{change}
          </span>
        )}
      </div>
      {sub && <span className="text-[10px] text-text-tertiary mt-1 block">{sub}</span>}
    </div>
  )
}

function Card({ title, subtitle, children, action }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-semibold text-[14px]">{title}</h2>
          {subtitle && <p className="text-[10px] text-text-tertiary mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Bar({ value, max, color = 'bg-accent' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-elevated rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function ChurnPill({ risk }) {
  return (
    <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
      risk === 'high' ? 'bg-error/15 text-error' :
      risk === 'medium' ? 'bg-warning/15 text-warning' :
      'bg-success/10 text-success'
    }`}>{risk}</span>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: OVERVIEW
// ══════════════════════════════════════════════════════════════

function OverviewTab({ metrics, clients, invoices }) {
  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="YTD Revenue"  value={fmtBAM(metrics.ytd)} change={metrics.momChange ? `${metrics.momChange > 0 ? '+' : ''}${metrics.momChange}% MoM` : ''} positive={metrics.momChange >= 0} icon={DollarSign} color="text-success" />
        <KPI label="MRR"          value={fmtBAM(metrics.mrr)} sub={`ARR ≈ ${fmtBAM(metrics.arr)}`} icon={Repeat} color="text-accent" />
        <KPI label="Outstanding"  value={fmtBAM(metrics.outstanding)} sub={metrics.overdueTotal > 0 ? `${fmtBAM(metrics.overdueTotal)} overdue` : 'All current'} icon={AlertTriangle} color={metrics.overdueTotal > 0 ? 'text-warning' : 'text-success'} />
        <KPI label="Pipeline"     value={fmtBAM(metrics.weightedPipeline)} sub={`${fmtBAM(metrics.totalPipeline)} unweighted`} icon={Target} color="text-info" />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Collection Rate"   value={`${metrics.collectionRate}%`} sub={`${metrics.paid.length} of ${invoices.length} invoices paid`} />
        <KPI label="Avg Invoice"       value={fmtBAM(metrics.avgInvoice)} sub={`${metrics.paid.length} paid YTD`} />
        <KPI label="Retainer Clients"  value={metrics.retainerCount} sub={`${clients.length} total clients`} color="text-accent" />
        <KPI label="Churn Risk"        value={metrics.atRiskClients.length} sub={`${fmtBAM(metrics.churnRiskMrr)} MRR at risk`} color={metrics.atRiskClients.length > 0 ? 'text-warning' : 'text-success'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`Monthly Revenue (${new Date().getFullYear()})`} subtitle="Cash received per month">
          <div className="space-y-2">
            {metrics.monthly.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-[11px] text-text-tertiary w-8">{m.month}</span>
                <div className="flex-1 h-5 bg-elevated rounded overflow-hidden">
                  <div className="h-full bg-accent rounded transition-all" style={{ width: `${(m.revenue / metrics.maxRevenue) * 100}%` }}>
                    {m.revenue > 0 && <span className="text-[10px] text-white font-medium px-2 leading-5">{m.revenue.toLocaleString()}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Revenue Attribution" subtitle="Where your money comes from">
          {metrics.attribution.length === 0 ? (
            <p className="text-[12px] text-text-tertiary text-center py-4">No attribution data yet.</p>
          ) : (
            <div className="space-y-3">
              {metrics.attribution.map(s => (
                <div key={s.source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium">{s.source}</span>
                    <span className="text-[12px] font-mono text-text-secondary">{fmtBAM(s.amount)} <span className="text-text-tertiary">({s.pct}%)</span></span>
                  </div>
                  <Bar value={s.pct} max={100} color={s.source.includes('Retainer') ? 'bg-success' : 'bg-accent'} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: CASH FLOW
// ══════════════════════════════════════════════════════════════

function CashFlowTab({ metrics, invoices }) {
  const netThisMonth = (metrics.monthly[new Date().getMonth()]?.revenue || 0) - Math.round((metrics.monthly[new Date().getMonth()]?.revenue || 0) * OPEX_PCT)
  const alerts = []
  if (metrics.overdueTotal > 0) alerts.push({ type: 'warning', text: `${fmtBAM(metrics.overdueTotal)} in overdue invoices — initiate collections.` })
  if (metrics.outstanding > metrics.mrr * 2) alerts.push({ type: 'info', text: 'Outstanding receivables exceed 2× MRR. Consider tighter payment terms or deposits.' })
  if (metrics.taxReserve > 0 && metrics.ytd > 0) alerts.push({ type: 'info', text: `Reserve ${fmtBAM(metrics.taxReserve)} (${Math.round(TAX_RESERVE_PCT * 100)}% of YTD revenue) for tax obligations.` })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Cash In (next 30d)"  value={fmtBAM(metrics.cashIn30)} sub="Due invoices + MRR" color="text-success" icon={ArrowDownRight} />
        <KPI label="Expected OPEX YTD"   value={fmtBAM(metrics.expectedOpex)} sub={`${Math.round(OPEX_PCT * 100)}% of revenue`} color="text-warning" icon={ArrowUpRight} />
        <KPI label="Tax Reserve"         value={fmtBAM(metrics.taxReserve)} sub={`${Math.round(TAX_RESERVE_PCT * 100)}% of YTD`} color="text-info" />
        <KPI label="Net This Month"      value={fmtBAM(netThisMonth)} sub="After OPEX estimate" color={netThisMonth >= 0 ? 'text-success' : 'text-error'} />
      </div>

      {alerts.length > 0 && (
        <Card title="Cash Flow Alerts">
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-2 text-[12px] p-3 rounded-md ${a.type === 'warning' ? 'bg-warning/5 border border-warning/20 text-warning' : 'bg-info/5 border border-info/20 text-info'}`}>
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Issued vs Paid (per month)" subtitle="Lag between issuance and collection">
        <div className="space-y-2">
          {metrics.monthly.map(m => {
            const max = Math.max(...metrics.monthly.flatMap(x => [x.issued, x.revenue]), 1)
            return (
              <div key={m.month} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-text-tertiary">
                  <span className="w-8">{m.month}</span>
                  <span>issued {m.issued.toLocaleString()} BAM · paid {m.revenue.toLocaleString()} BAM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-elevated rounded overflow-hidden relative">
                    <div className="absolute inset-y-0 left-0 bg-info/60 rounded" style={{ width: `${(m.issued / max) * 100}%` }} />
                    <div className="absolute inset-y-0 left-0 bg-success rounded" style={{ width: `${(m.revenue / max) * 100}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-text-tertiary">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-info/60" />Issued</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-success" />Paid</span>
        </div>
      </Card>

      <Card title="Outstanding Invoices" subtitle={`${metrics.pending.length + metrics.overdue.length} unpaid`}>
        {metrics.pending.length + metrics.overdue.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-4">No outstanding invoices. <span className="text-success">All clear.</span></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-left text-[10px] text-text-tertiary uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Amount</th>
                  <th className="py-2 pr-3">Due</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...metrics.overdue, ...metrics.pending].slice(0, 12).map(inv => {
                  const d = daysBetween(inv.due)
                  return (
                    <tr key={inv.id}>
                      <td className="py-2 pr-3 font-mono text-text-tertiary">{inv.id?.slice(0, 8)}</td>
                      <td className="py-2 pr-3 font-medium">{inv.client}</td>
                      <td className="py-2 pr-3">{fmtBAM(inv.amount)}</td>
                      <td className="py-2 pr-3 text-text-tertiary">{inv.due || '—'} {d != null && d < 0 && <span className="text-error">({Math.abs(d)}d late)</span>}</td>
                      <td className="py-2 pr-3"><span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${inv.status === 'overdue' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'}`}>{inv.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: RECURRING REVENUE (MRR / ARR)
// ══════════════════════════════════════════════════════════════

function RecurringTab({ metrics, clients }) {
  const retainerClients = clients.filter(c => (c.mrr || 0) > 0)
    .map(c => ({ ...c, churnRisk: classifyChurnRisk(c) }))
    .sort((a, b) => (b.mrr || 0) - (a.mrr || 0))

  const mrrByPackage = {}
  retainerClients.forEach(c => {
    const pkg = c.package || 'Other'
    mrrByPackage[pkg] = (mrrByPackage[pkg] || 0) + (c.mrr || 0)
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="MRR"           value={fmtBAM(metrics.mrr)} icon={Repeat} color="text-accent" />
        <KPI label="ARR"           value={fmtBAM(metrics.arr)} sub="MRR × 12" icon={TrendingUp} color="text-success" />
        <KPI label="Retainers"     value={metrics.retainerCount} sub="active subscriptions" />
        <KPI label="MRR at Risk"   value={fmtBAM(metrics.churnRiskMrr)} sub={`${metrics.atRiskClients.length} at-risk clients`} color={metrics.churnRiskMrr > 0 ? 'text-warning' : 'text-success'} icon={AlertTriangle} />
      </div>

      <Card title="MRR by Package">
        {Object.keys(mrrByPackage).length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-4">No active retainers yet.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(mrrByPackage).sort((a, b) => b[1] - a[1]).map(([pkg, amt]) => (
              <div key={pkg}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium">{pkg}</span>
                  <span className="text-[12px] font-mono">{fmtBAM(amt)}/mo · {fmtBAM(amt * 12)} ARR</span>
                </div>
                <Bar value={amt} max={metrics.mrr || 1} color="bg-accent" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Retainer Clients" subtitle={`${retainerClients.length} active · sorted by MRR`}>
        {retainerClients.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-4">No retainer clients yet. Sell a care plan to start MRR.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-left text-[10px] text-text-tertiary uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Package</th>
                  <th className="py-2 pr-3">MRR</th>
                  <th className="py-2 pr-3">ARR</th>
                  <th className="py-2 pr-3">Health</th>
                  <th className="py-2 pr-3">Churn Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {retainerClients.map(c => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    <td className="py-2 pr-3 text-text-tertiary">{c.package || '—'}</td>
                    <td className="py-2 pr-3">{fmtBAM(c.mrr)}</td>
                    <td className="py-2 pr-3 text-text-tertiary">{fmtBAM((c.mrr || 0) * 12)}</td>
                    <td className="py-2 pr-3">
                      {c.healthScore > 0 ? (
                        <span className={c.healthScore >= 80 ? 'text-success' : c.healthScore >= 60 ? 'text-warning' : 'text-error'}>{c.healthScore}</span>
                      ) : <span className="text-text-tertiary">—</span>}
                    </td>
                    <td className="py-2 pr-3"><ChurnPill risk={c.churnRisk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: PROFITABILITY
// ══════════════════════════════════════════════════════════════

function ProfitabilityTab({ metrics }) {
  return (
    <div className="space-y-4">
      <div className="bg-info/5 border border-info/20 rounded-md p-3 text-[11px] text-info">
        Gross margin uses a baseline {Math.round(OPEX_PCT * 100)}% cost-of-revenue assumption (hosting, tools, fees). For exact margins, log per-project costs in a future Cost Tracking module.
      </div>

      <Card title="Profitability by Package">
        {metrics.revenueByPackage.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-4">No revenue data yet.</p>
        ) : (
          <div className="space-y-3">
            {metrics.revenueByPackage.map(p => (
              <div key={p.name} className="bg-elevated rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium">{p.name}</span>
                  <span className="text-[12px] font-mono">{fmtBAM(p.total)} revenue · {fmtBAM(p.grossMargin)} margin</span>
                </div>
                <div className="text-[10px] text-text-tertiary mb-2">
                  {p.clients} client{p.clients !== 1 ? 's' : ''} · {p.count} paid invoice{p.count !== 1 ? 's' : ''} · {p.marginPct}% gross margin
                  {p.mrr > 0 && ` · ${fmtBAM(p.mrr)}/mo recurring`}
                </div>
                <Bar value={p.total} max={metrics.revenueByPackage[0].total} color="bg-accent" />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Client Lifetime Value" subtitle={`Top clients by projected LTV (paid + ${RETAINER_MULT}mo retainer)`}>
        {metrics.profitabilityByClient.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-4">No client revenue data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-left text-[10px] text-text-tertiary uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Client</th>
                  <th className="py-2 pr-3">Package</th>
                  <th className="py-2 pr-3">Paid</th>
                  <th className="py-2 pr-3">MRR</th>
                  <th className="py-2 pr-3">Projected LTV</th>
                  <th className="py-2 pr-3">Gross Margin</th>
                  <th className="py-2 pr-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.profitabilityByClient.slice(0, 15).map(c => (
                  <tr key={c.id}>
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    <td className="py-2 pr-3 text-text-tertiary">{c.package}</td>
                    <td className="py-2 pr-3">{fmtBAM(c.totalPaid)}</td>
                    <td className="py-2 pr-3">{c.mrr > 0 ? fmtBAM(c.mrr) : <span className="text-text-tertiary">—</span>}</td>
                    <td className="py-2 pr-3 font-medium text-accent">{fmtBAM(c.projectedLtv)}</td>
                    <td className="py-2 pr-3 text-success">{fmtBAM(c.grossMargin)}</td>
                    <td className="py-2 pr-3"><ChurnPill risk={c.churnRisk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: FORECASTING
// ══════════════════════════════════════════════════════════════

function ForecastingTab({ metrics, deals }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <KPI label="Next Month Forecast"  value={fmtBAM(metrics.nextMonthForecast)} sub="Trailing 3-mo avg + MRR uplift" color="text-accent" icon={Target} />
        <KPI label="90-Day Forecast"      value={fmtBAM(metrics.ninetyDayForecast)} sub="Avg × 3 + MRR continuation" color="text-success" />
        <KPI label="Weighted Pipeline"    value={fmtBAM(metrics.weightedPipeline)} sub={`${metrics.activeDeals.length} active deals`} color="text-info" />
      </div>

      <AIForecastSnapshotCard />


      <Card title="Pipeline by Stage" subtitle="Weighted value uses stage probability or per-deal probability when set">
        {metrics.activeDeals.length === 0 ? (
          <p className="text-[12px] text-text-tertiary text-center py-4">No active deals. <a href="/management/pipeline" className="text-accent">Open Pipeline →</a></p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="text-left text-[10px] text-text-tertiary uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-2 pr-3">Deal</th>
                  <th className="py-2 pr-3">Stage</th>
                  <th className="py-2 pr-3">Value</th>
                  <th className="py-2 pr-3">Probability</th>
                  <th className="py-2 pr-3">Weighted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.activeDeals.slice(0, 20).map(d => {
                  const stageProb = { new: 0.10, qualified: 0.30, proposal: 0.50, negotiation: 0.70 }
                  const prob = d.prob != null ? d.prob / 100 : (stageProb[d.stage] || 0.2)
                  const weighted = (d.value || 0) * prob
                  return (
                    <tr key={d.id}>
                      <td className="py-2 pr-3 font-medium">{d.name}</td>
                      <td className="py-2 pr-3 text-text-tertiary capitalize">{d.stage}</td>
                      <td className="py-2 pr-3">{fmtBAM(d.value)}</td>
                      <td className="py-2 pr-3">
                        <span className={prob >= 0.5 ? 'text-success' : prob >= 0.3 ? 'text-warning' : 'text-text-tertiary'}>
                          {Math.round(prob * 100)}%
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-medium text-accent">{fmtBAM(weighted)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="border-t border-border mt-2 pt-2 flex items-center justify-between text-[12px]">
              <span className="text-text-tertiary">Total weighted pipeline</span>
              <span className="font-medium text-accent">{fmtBAM(metrics.weightedPipeline)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card title="Budget Planning" subtitle="Simple year-to-date pacing — useful for setting an annual revenue target">
        <BudgetPlanner ytd={metrics.ytd} monthly={metrics.monthly} mrr={metrics.mrr} />
      </Card>
    </div>
  )
}

// AI forecast snapshot — persists to crm_forecast_snapshots via the
// mutation, invalidates overview + forecast + snapshots on success.
function AIForecastSnapshotCard() {
  const toast = useToast()
  const { user } = useUser()
  const snapshotsQuery = useForecastSnapshots()
  const generate = useGenerateAIForecast()
  const [horizon, setHorizon] = useState(6)
  const [notes, setNotes] = useState('')
  const [latest, setLatest] = useState(null)

  const run = async () => {
    try {
      const r = await generate.mutateAsync({ horizon, notes, generated_by: user?.name || '' })
      setLatest(r)
      toast.success('AI forecast snapshot saved', { description: `Persisted to crm_forecast_snapshots (${horizon}-mo horizon)` })
    } catch (e) { toast.error('AI forecast failed', { description: e.message }) }
  }

  const recent = snapshotsQuery.data?.snapshots || []
  const show = latest || recent[0]

  return (
    <div className="card-premium">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-accent" />
          <h3 className="font-display font-semibold text-[14px]">AI Forecast — persisted snapshot</h3>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-text-tertiary uppercase tracking-wider">Horizon</label>
          <select value={horizon} onChange={e => setHorizon(parseInt(e.target.value) || 6)}
            className="bg-elevated border border-border rounded px-2 py-1 text-[11px] focus-ring">
            {[3, 6, 9, 12].map(h => <option key={h} value={h}>{h} months</option>)}
          </select>
          <button onClick={run} disabled={generate.isPending}
            className="button-premium !py-1.5 !px-3 focus-ring disabled:opacity-50">
            {generate.isPending ? <><Loader2 size={11} className="animate-spin" /> Generating…</> : <><Sparkles size={11} /> Generate</>}
          </button>
        </div>
      </div>

      <input value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Optional operator notes (e.g. 'big deal in flight, expect closure month 2')"
        className="w-full bg-elevated border border-border rounded px-2.5 py-1.5 text-[12px] mb-3 focus:border-accent focus:outline-none focus-ring" />

      {!show ? (
        <p className="text-[12px] text-text-tertiary">
          No snapshot yet. Generate one — it persists permanently and survives redeploys.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-1">
              Summary{show.generated_at && <span className="ml-2 text-text-tertiary normal-case">{new Date(show.generated_at).toLocaleString()}</span>}
            </div>
            <p className="text-[12px] text-text-primary whitespace-pre-wrap leading-relaxed">{show.summary || '—'}</p>
          </div>
          {show.assumptions && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">Assumptions</div>
              <p className="text-[11px] text-text-secondary leading-relaxed">{show.assumptions}</p>
            </div>
          )}
          {Array.isArray(show.breakdown) && show.breakdown.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="text-[9px] text-text-tertiary uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-1.5 pr-3 text-left">Month</th>
                    <th className="py-1.5 pr-3 text-right">Recurring</th>
                    <th className="py-1.5 pr-3 text-right">One-off</th>
                    <th className="py-1.5 pr-3 text-right">Total</th>
                    <th className="py-1.5 pr-3 text-left">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {show.breakdown.map((b, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 font-medium">{b.month_label || b.month || `M${i + 1}`}</td>
                      <td className="py-1.5 pr-3 text-right">{fmtBAM(b.recurring)}</td>
                      <td className="py-1.5 pr-3 text-right">{fmtBAM(b.oneoff)}</td>
                      <td className="py-1.5 pr-3 text-right font-semibold text-accent">{fmtBAM(b.total)}</td>
                      <td className="py-1.5 pr-3 capitalize">
                        <span className={
                          b.confidence === 'high' ? 'text-success' :
                          b.confidence === 'low' ? 'text-warning' : 'text-text-secondary'
                        }>{b.confidence || '—'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {recent.length > 1 && (
        <details className="mt-4 text-[11px] text-text-tertiary">
          <summary className="cursor-pointer hover:text-accent focus-ring rounded">
            {recent.length} earlier snapshot{recent.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-2 space-y-1">
            {recent.slice(1, 10).map(s => (
              <li key={s.id} className="font-mono">
                {new Date(s.generated_at).toLocaleString()} · {s.horizon_months}mo · {s.generated_by || '—'}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function BudgetPlanner({ ytd, monthly, mrr }) {
  const monthsElapsed = Math.max(1, monthly.filter(m => m.revenue > 0).length)
  const projection = Math.round((ytd / monthsElapsed) * 12 + mrr * (12 - monthsElapsed) * 0.5)
  const [target, setTarget] = useState(Math.round(projection * 1.25))
  const pacePct = target > 0 ? Math.round((ytd / target) * 100) : 0
  const requiredPerMonth = target > 0 ? Math.round((target - ytd) / Math.max(1, 12 - monthsElapsed)) : 0

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">Annual revenue target</label>
          <input type="number" value={target} onChange={e => setTarget(parseInt(e.target.value) || 0)}
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:border-accent" />
        </div>
        <div className="bg-elevated rounded-md p-3">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Year-to-date</div>
          <div className="text-[16px] font-display font-bold">{fmtBAM(ytd)}</div>
          <div className="text-[10px] text-text-tertiary">{pacePct}% of target</div>
        </div>
        <div className="bg-elevated rounded-md p-3">
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Required per month (remaining)</div>
          <div className="text-[16px] font-display font-bold">{fmtBAM(requiredPerMonth)}</div>
          <div className="text-[10px] text-text-tertiary">{12 - monthsElapsed} month{12 - monthsElapsed === 1 ? '' : 's'} left</div>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[10px] text-text-tertiary mb-1">
          <span>Pacing toward target</span>
          <span>{pacePct}%</span>
        </div>
        <Bar value={pacePct} max={100} color={pacePct >= 75 ? 'bg-success' : pacePct >= 50 ? 'bg-warning' : 'bg-error'} />
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: KPI SCORECARDS
// ══════════════════════════════════════════════════════════════

function KPITab({ metrics }) {
  const kpis = [
    {
      title: 'Growth',
      items: [
        { label: 'MoM Revenue Growth',  value: metrics.momChange ? `${metrics.momChange > 0 ? '+' : ''}${metrics.momChange}%` : '—', goal: '≥ 10%', met: metrics.momChange >= 10 },
        { label: 'MRR',                 value: fmtBAM(metrics.mrr), goal: 'Grow monthly', met: metrics.mrr > 0 },
        { label: 'New Retainers',       value: metrics.retainerCount, goal: '≥ 5', met: metrics.retainerCount >= 5 },
        { label: 'Weighted Pipeline',   value: fmtBAM(metrics.weightedPipeline), goal: '≥ 3× MRR', met: metrics.weightedPipeline >= metrics.mrr * 3 },
      ],
    },
    {
      title: 'Collections',
      items: [
        { label: 'Collection Rate',     value: `${metrics.collectionRate}%`, goal: '≥ 95%', met: metrics.collectionRate >= 95 },
        { label: 'Overdue',             value: fmtBAM(metrics.overdueTotal), goal: '0', met: metrics.overdueTotal === 0 },
        { label: 'Outstanding',         value: fmtBAM(metrics.outstanding), goal: '< 2× MRR', met: metrics.outstanding < metrics.mrr * 2 || metrics.mrr === 0 },
        { label: 'Avg Invoice',         value: fmtBAM(metrics.avgInvoice), goal: '≥ 500 BAM', met: metrics.avgInvoice >= 500 },
      ],
    },
    {
      title: 'Retention',
      items: [
        { label: 'Active Retainers',    value: metrics.retainerCount, goal: 'Grow', met: metrics.retainerCount > 0 },
        { label: 'Churn Risk Rate',     value: `${metrics.churnRate}%`, goal: '≤ 15%', met: metrics.churnRate <= 15 },
        { label: 'At-Risk MRR',         value: fmtBAM(metrics.churnRiskMrr), goal: '0', met: metrics.churnRiskMrr === 0 },
        { label: 'Avg Client LTV',      value: metrics.profitabilityByClient.length
            ? fmtBAM(Math.round(metrics.profitabilityByClient.reduce((s, c) => s + c.projectedLtv, 0) / metrics.profitabilityByClient.length))
            : '—', goal: '≥ 2000 BAM', met: metrics.profitabilityByClient.length > 0 },
      ],
    },
  ]

  return (
    <div className="space-y-4">
      {kpis.map(group => (
        <Card key={group.title} title={group.title}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {group.items.map(k => (
              <div key={k.label} className={`p-3 rounded-md border ${k.met ? 'bg-success/5 border-success/20' : 'bg-warning/5 border-warning/20'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{k.label}</span>
                  {k.met ? <CheckCircle2 size={12} className="text-success" /> : <AlertTriangle size={12} className="text-warning" />}
                </div>
                <div className="text-[16px] font-display font-bold">{k.value}</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">Goal: {k.goal}</div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  TAB: AI INSIGHTS
// ══════════════════════════════════════════════════════════════

function AIInsightsTab({ metrics, clients, deals }) {
  const summary = useAI(ai.generate)
  const forecast = useAI(ai.generate)
  const upsell = useAI(ai.generate)
  const [active, setActive] = useState('summary')

  const ctxBlock = `
YTD revenue: ${metrics.ytd} BAM
MRR: ${metrics.mrr} BAM (ARR ${metrics.arr} BAM) from ${metrics.retainerCount} retainers
Outstanding: ${metrics.outstanding} BAM (overdue ${metrics.overdueTotal} BAM)
Active pipeline: ${metrics.totalPipeline} BAM unweighted, ${metrics.weightedPipeline} BAM weighted
Collection rate: ${metrics.collectionRate}%
Avg invoice: ${metrics.avgInvoice} BAM
Churn risk: ${metrics.atRiskClients.length} clients (${metrics.churnRiskMrr} BAM MRR at risk)
Trailing avg monthly revenue: ${metrics.trailingAvg} BAM
Top packages: ${metrics.revenueByPackage.slice(0, 3).map(p => `${p.name} (${p.total} BAM, ${p.clients} clients)`).join('; ') || 'none'}
Top clients by LTV: ${metrics.profitabilityByClient.slice(0, 5).map(c => `${c.name} (LTV ${c.projectedLtv} BAM)`).join('; ') || 'none'}
At-risk clients: ${metrics.atRiskClients.slice(0, 5).map(c => c.name).join(', ') || 'none'}`

  const runSummary = () => {
    setActive('summary')
    summary.run(`You are the CFO advisor for Cloz Digital. Generate a concise executive financial summary for today.

${ctxBlock}

Structure:
**HEADLINE**: One-line state of the business
**CASH POSITION**: Inflow expectations next 30 days + cash flow warnings
**GROWTH**: MRR momentum, pipeline health, conversion outlook
**RETENTION RISK**: Specific at-risk MRR with rationale
**ACTION ITEMS**: Three concrete things to do this week

Use BAM. Be direct, no fluff.`, 0.4)
  }

  const runForecast = () => {
    setActive('forecast')
    forecast.run(`As Cloz Digital's financial analyst, produce a 3-month revenue forecast.

${ctxBlock}

Provide:
1. Month-by-month forecast for the next 3 months with assumptions stated
2. Best case / base case / downside case
3. The single biggest risk to the forecast
4. Three growth levers to push above base case

BAM currency. Concrete numbers.`, 0.5)
  }

  const runUpsell = () => {
    setActive('upsell')
    upsell.run(`You are advising on revenue expansion for Cloz Digital.

${ctxBlock}

Identify:
1. Specific clients ripe for upsell (e.g. Launch Care → Presence Care) — name them
2. Cross-sell opportunities (e.g. SEO addon for existing Growth Care)
3. Pricing optimization suggestions
4. A specific outreach script (1-2 sentences) for the highest-priority upsell

Be specific, name actual clients from the data.`, 0.5)
  }

  const tools = [
    { key: 'summary',  label: 'Daily Executive Summary', desc: 'CFO-style state-of-business briefing',          icon: Sparkles, run: runSummary, ai: summary },
    { key: 'forecast', label: 'Revenue Forecast',         desc: '3-month forecast with best/base/downside cases', icon: Target,   run: runForecast, ai: forecast },
    { key: 'upsell',   label: 'Upsell Opportunities',     desc: 'Specific clients + outreach scripts',           icon: TrendingUp, run: runUpsell, ai: upsell },
  ]

  const activeAi = tools.find(t => t.key === active)?.ai

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        {tools.map(t => (
          <button key={t.key} onClick={t.run} disabled={t.ai.loading}
            className={`bg-surface border rounded-lg p-4 text-left transition-colors hover:border-accent/30 ${active === t.key ? 'border-accent' : 'border-border'} disabled:opacity-50`}>
            <t.icon size={18} className={t.ai.loading && active === t.key ? 'text-accent animate-pulse' : 'text-accent'} />
            <span className="text-[13px] font-medium block mt-2">{t.label}</span>
            <span className="text-[10px] text-text-tertiary mt-1 block">{t.desc}</span>
          </button>
        ))}
      </div>

      <Card title={tools.find(t => t.key === active)?.label || 'AI Output'}
        action={activeAi?.data?.text && (
          <button onClick={tools.find(t => t.key === active)?.run} disabled={activeAi.loading}
            className="text-[10px] text-text-tertiary hover:text-accent bg-elevated px-2 py-0.5 rounded flex items-center gap-1">
            <RefreshCw size={10} className={activeAi.loading ? 'animate-spin' : ''} />Regenerate
          </button>
        )}>
        {activeAi?.loading ? (
          <div className="flex items-center gap-2 py-8 justify-center">
            <Loader2 size={14} className="animate-spin text-accent" />
            <span className="text-[12px] text-text-tertiary">Analyzing live financial data…</span>
          </div>
        ) : activeAi?.error ? (
          <div className="text-error text-[12px] py-4">
            {activeAi.error}{' '}
            <button onClick={tools.find(t => t.key === active)?.run} className="underline">Retry</button>
          </div>
        ) : activeAi?.data?.text ? (
          <div className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-line">
            {activeAi.data.text.split('\n').map((line, i) => {
              if (line.includes('**')) {
                const parts = line.split(/\*\*(.*?)\*\*/g)
                return <p key={i} className="mb-2">{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-semibold">{p}</strong> : p)}</p>
              }
              return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
            })}
          </div>
        ) : (
          <p className="text-[12px] text-text-tertiary text-center py-8">Click a tool above to generate analysis.</p>
        )}
      </Card>
    </div>
  )
}
