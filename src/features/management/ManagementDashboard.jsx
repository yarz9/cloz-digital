import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Users, Receipt, TrendingUp, Globe, AlertTriangle, Clock, Target,
  ArrowUpRight, Sparkles, ChevronRight, RefreshCw, Loader2,
  HeartPulse, CheckSquare, GitBranch, Shield,
  FileText, Send, Palette, FileBarChart, Briefcase,
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  MANAGEMENT DASHBOARD — Live overview, no hardcoded data.
// ══════════════════════════════════════════════════════════════

function daysBetween(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return Math.round((d - new Date()) / 86400000)
}

export default function ManagementDashboard() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const leads = useStore(s => s.leads)
  const deals = useStore(s => s.deals)
  const tasks = useStore(s => s.tasks)
  const activity = useStore(s => s.activity)

  const metrics = useMemo(() => {
    const activeClients = clients.filter(c => c.status !== 'archived').length
    const openInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const outstanding = openInvoices.reduce((s, i) => s + (i.amount || 0), 0)
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const mrr = clients.reduce((s, c) => s + (c.mrr || 0), 0)
    const monitoredSites = clients.filter(c => c.website).length

    const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost')
    const pipelineValue = activeDeals.reduce((s, d) => s + (d.value || 0), 0)

    const healthScores = clients.map(c => c.healthScore || 0).filter(Boolean)
    const avgHealth = healthScores.length
      ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
      : 0

    const expiringDomains = clients
      .filter(c => c.domainExpiry)
      .map(c => ({ ...c, daysLeft: daysBetween(c.domainExpiry) }))
      .filter(c => c.daysLeft !== null && c.daysLeft >= 0 && c.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    const topLeads = [...leads]
      .filter(l => l.stage !== 'won' && l.stage !== 'lost' && l.stage !== 'archived')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3)

    const openTasks = tasks.filter(t => t.status !== 'done')

    return {
      activeClients, openInvoices, outstanding, overdueInvoices, mrr,
      monitoredSites, activeDeals, pipelineValue, avgHealth,
      expiringDomains, topLeads, openTasks,
    }
  }, [clients, invoices, leads, deals, tasks])

  const hasData = clients.length > 0 || invoices.length > 0 || leads.length > 0 || deals.length > 0

  const stats = [
    { label: 'Active Clients', value: metrics.activeClients,                       change: `${clients.length} total`,                          icon: Users,      color: 'text-accent',  to: '/management/clients' },
    { label: 'Open Invoices',  value: metrics.openInvoices.length,                 change: `${metrics.outstanding.toLocaleString()} BAM`,      icon: Receipt,    color: 'text-warning', to: '/management/billing' },
    { label: 'Monthly MRR',    value: metrics.mrr.toLocaleString(), prefix: 'BAM', change: `${clients.filter(c => c.mrr > 0).length} retainers`, icon: TrendingUp, color: 'text-success', to: '/management/revenue' },
    { label: 'Pipeline',       value: metrics.pipelineValue.toLocaleString(), prefix: 'BAM', change: `${metrics.activeDeals.length} active deals`, icon: GitBranch, color: 'text-info', to: '/management/pipeline' },
    { label: 'Monitored',      value: metrics.monitoredSites,                      change: clients.length ? 'All operational' : 'No clients yet', icon: Globe, color: 'text-success', to: '/management/status' },
    { label: 'Health Score',   value: `${metrics.avgHealth}%`,                     change: 'Avg across clients',                                icon: HeartPulse,  color: 'text-accent',  to: '/management/health' },
  ]

  // ── Urgent items derived from live data ──
  const urgentItems = useMemo(() => {
    const items = []
    metrics.overdueInvoices.slice(0, 3).forEach(inv => {
      const daysLate = daysBetween(inv.due) ? Math.abs(daysBetween(inv.due)) : 0
      items.push({
        type: 'overdue',
        label: `${inv.client} — ${inv.id}`,
        detail: `${inv.amount} BAM · ${daysLate} days late`,
        icon: AlertTriangle, color: 'text-error', to: '/management/billing',
      })
    })
    metrics.expiringDomains.slice(0, 2).forEach(d => {
      items.push({
        type: 'domain',
        label: `${d.website} expiring`,
        detail: `${d.daysLeft} days · ${d.name}`,
        icon: Clock, color: d.daysLeft <= 14 ? 'text-error' : 'text-warning', to: '/management/hosting',
      })
    })
    metrics.openTasks.filter(t => t.priority === 'high').slice(0, 2).forEach(t => {
      items.push({
        type: 'task',
        label: t.title,
        detail: t.due ? `Due ${t.due}` : 'No due date',
        icon: CheckSquare, color: 'text-info', to: '/management/tasks',
      })
    })
    return items
  }, [metrics])

  // ── AI Daily Brief ──
  const briefing = useAI(ai.dashboardBriefing)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const runBriefing = () => {
    if (!hasData) return
    briefing.run({
      date: today,
      activeClients: String(metrics.activeClients),
      overdueInvoices: metrics.overdueInvoices.map(i => `${i.client}: ${i.id} (${i.amount} BAM)`).join('; ') || 'None',
      expiringDomains: metrics.expiringDomains.map(d => `${d.website} (${d.daysLeft}d)`).join(', ') || 'None',
      newLeads: metrics.topLeads.map(l => `${l.name} (score ${l.score})`).join(', ') || 'None',
      pendingTasks: `${metrics.openTasks.length} open task${metrics.openTasks.length === 1 ? '' : 's'}`,
      recentActivity: activity.slice(0, 5).map(a => a.text).join('; ') || 'None',
    })
  }

  useEffect(() => {
    if (hasData) runBriefing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData])

  const aiSummary = briefing.data?.text || ''

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[24px]">Management Overview</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">{today}</p>
        </div>
        <NavLink to="/management/command" className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-md text-[12px] font-medium transition-colors">
          <Sparkles size={13} /> Command Center
        </NavLink>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map(s => (
          <NavLink key={s.label} to={s.to} className="bg-surface border border-border rounded-lg p-4 hover:border-accent/30 transition-colors group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-text-tertiary">{s.label}</span>
              <s.icon size={14} className={s.color} strokeWidth={1.5} />
            </div>
            <div className="text-[22px] font-display font-bold">
              {s.prefix && <span className="text-[12px] text-text-secondary mr-1">{s.prefix}</span>}
              {s.value}
            </div>
            <span className="text-[10px] text-text-tertiary">{s.change}</span>
          </NavLink>
        ))}
      </div>

      {/* New install — welcome */}
      {!hasData && (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Briefcase}
            title="Set up your business operating system"
            description="This dashboard becomes a live command center as soon as you add data. Start by registering a client, importing leads from Scout, or creating your first invoice."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
            secondaryActionLabel="Find Prospects"
            onSecondaryAction={() => window.location.href = '/management/scout'}
          />
        </div>
      )}

      {/* Main grid */}
      {hasData && (
        <>
          <div className="grid lg:grid-cols-5 gap-4">
            {/* AI Brief */}
            <div className="lg:col-span-3 bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={15} className="text-accent" />
                <h2 className="font-display font-semibold text-[14px]">AI Daily Brief</h2>
                <button onClick={runBriefing} disabled={briefing.loading}
                  className="ml-auto text-[10px] text-text-tertiary hover:text-accent bg-elevated px-2 py-0.5 rounded flex items-center gap-1 transition-colors">
                  {briefing.loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  {briefing.loading ? 'Generating...' : 'Refresh'}
                </button>
              </div>
              <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
                {briefing.loading && !aiSummary ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 size={14} className="animate-spin text-accent" />
                    <span className="text-text-tertiary">Generating briefing from your live data…</span>
                  </div>
                ) : briefing.error ? (
                  <div className="text-error text-[12px] py-2">
                    {briefing.error}{' '}
                    <button onClick={runBriefing} className="underline">Retry</button>
                  </div>
                ) : aiSummary ? (
                  aiSummary.split('\n').map((line, i) => {
                    if (line.includes('**')) {
                      const parts = line.split(/\*\*(.*?)\*\*/g)
                      return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                    }
                    return line ? <p key={i} className="mb-2">{line}</p> : <br key={i} />
                  })
                ) : (
                  <span className="text-text-tertiary">Click Refresh to generate a briefing.</span>
                )}
              </div>
            </div>

            {/* Urgent items */}
            <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-[14px] flex items-center gap-2">
                  <AlertTriangle size={14} className="text-error" />
                  Requires Attention
                </h2>
                {urgentItems.length > 0 && (
                  <span className="text-[10px] font-medium text-error bg-error/10 px-1.5 py-0.5 rounded">{urgentItems.length}</span>
                )}
              </div>
              {urgentItems.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-text-tertiary">
                  Nothing urgent. <span className="text-success">All clear.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {urgentItems.map((item, i) => (
                    <NavLink key={i} to={item.to} className="flex items-center gap-3 p-2.5 bg-elevated hover:bg-raised rounded-md transition-colors group">
                      <item.icon size={13} className={item.color} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] font-medium block truncate">{item.label}</span>
                        <span className="text-[10px] text-text-tertiary">{item.detail}</span>
                      </div>
                      <ChevronRight size={12} className="text-text-tertiary group-hover:text-accent transition-colors" />
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: Top Leads + Activity + Quick Actions */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-[14px] flex items-center gap-2">
                  <Target size={14} className="text-accent" /> Top Leads
                </h2>
                <NavLink to="/management/scout" className="text-[11px] text-accent hover:text-accent-hover">View all</NavLink>
              </div>
              {metrics.topLeads.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-text-tertiary">
                  No leads yet. <NavLink to="/management/scout" className="text-accent">Open Scout →</NavLink>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {metrics.topLeads.map(l => (
                    <div key={l.id} className="p-3 bg-elevated rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium truncate">{l.name}</span>
                        <span className={`text-[11px] font-mono font-bold shrink-0 ml-2 ${(l.score || 0) >= 80 ? 'text-success' : (l.score || 0) >= 60 ? 'text-warning' : 'text-text-tertiary'}`}>{l.score || '—'}</span>
                      </div>
                      <p className="text-[10px] text-text-tertiary line-clamp-2">{l.reason || l.niche || l.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-lg p-5">
              <h2 className="font-display font-semibold text-[14px] mb-4">Recent Activity</h2>
              {activity.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-text-tertiary">
                  Activity log will fill in as you work.
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 6).map(a => (
                    <div key={a.id} className="flex gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        a.type === 'success' ? 'bg-success' : a.type === 'accent' ? 'bg-accent' : 'bg-text-tertiary'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-[11px] text-text-secondary leading-relaxed">{a.text}</p>
                        <span className="text-[10px] text-text-tertiary">{a.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-lg p-5">
              <h2 className="font-display font-semibold text-[14px] mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'Create Invoice',    to: '/management/billing',   icon: Receipt },
                  { label: 'Draft Proposal',   to: '/management/proposals', icon: FileText },
                  { label: 'New Outreach',     to: '/management/outreach',  icon: Send },
                  { label: 'Generate Content', to: '/management/content',   icon: Palette },
                  { label: 'Run Health Check', to: '/management/ai/health', icon: Shield },
                  { label: 'View Reports',     to: '/management/reports',   icon: FileBarChart },
                ].map(action => (
                  <NavLink key={action.label} to={action.to} className="flex items-center gap-3 p-2.5 bg-elevated hover:bg-raised rounded-md transition-colors group">
                    <action.icon size={14} className="text-accent" strokeWidth={1.5} />
                    <span className="text-[12px] font-medium text-text-secondary group-hover:text-text-primary">{action.label}</span>
                    <ArrowUpRight size={11} className="ml-auto text-text-tertiary group-hover:text-accent" />
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
