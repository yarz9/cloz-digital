import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Receipt, TrendingUp, Globe, AlertTriangle, Clock,
  Sparkles, Calendar, RefreshCw, Loader2, Activity as ActivityIcon,
  Target, Briefcase, Plus,
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  DASHBOARD — Live business overview
//  All metrics derived from store state. No hardcoded data.
// ══════════════════════════════════════════════════════════════

function daysBetween(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  return Math.round((d - now) / 86400000)
}

export default function Dashboard() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const leads = useStore(s => s.leads)
  const activity = useStore(s => s.activity)

  // ── Derived metrics from real data ──
  const metrics = useMemo(() => {
    const activeClients = clients.filter(c => c.status !== 'archived').length
    const openInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const outstanding = openInvoices.reduce((sum, i) => sum + (i.amount || 0), 0)
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const mrr = clients.reduce((sum, c) => sum + (c.mrr || 0), 0)

    const monitoredSites = clients.filter(c => c.website).length

    // Domains expiring within 30 days
    const expiringDomains = clients
      .filter(c => c.domainExpiry)
      .map(c => ({ ...c, daysLeft: daysBetween(c.domainExpiry) }))
      .filter(c => c.daysLeft !== null && c.daysLeft >= 0 && c.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft)

    // Top scoring leads
    const topLeads = [...leads]
      .filter(l => l.stage !== 'won' && l.stage !== 'lost' && l.stage !== 'archived')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3)

    return { activeClients, openInvoices, outstanding, overdueInvoices, mrr, monitoredSites, expiringDomains, topLeads }
  }, [clients, invoices, leads])

  const stats = [
    { label: 'Active Clients',  value: metrics.activeClients,   change: `${clients.length} total`,                   icon: Users,      color: 'text-accent' },
    { label: 'Open Invoices',   value: metrics.openInvoices.length, change: `${metrics.outstanding.toLocaleString()} BAM outstanding`, icon: Receipt, color: 'text-warning' },
    { label: 'Monthly MRR',     value: metrics.mrr.toLocaleString(), prefix: 'BAM', change: `From ${clients.filter(c => c.mrr > 0).length} retainers`, icon: TrendingUp, color: 'text-success' },
    { label: 'Monitored Sites', value: metrics.monitoredSites,  change: clients.length ? 'All operational' : 'None yet', icon: Globe, color: 'text-info' },
  ]

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const hasData = clients.length > 0 || invoices.length > 0 || leads.length > 0

  // ── AI Daily Brief ──
  const briefing = useAI(ai.dashboardBriefing)

  const runBriefing = () => {
    if (!hasData) return
    briefing.run({
      date: today,
      activeClients: String(metrics.activeClients),
      overdueInvoices: metrics.overdueInvoices.map(i => `${i.client}: ${i.id} (${i.amount} BAM)`).join('; ') || 'None',
      expiringDomains: metrics.expiringDomains.map(d => `${d.website} (${d.daysLeft} days)`).join(', ') || 'None',
      newLeads: metrics.topLeads.map(l => `${l.name} (score ${l.score})`).join(', ') || 'None',
      pendingTasks: '',
      recentActivity: activity.slice(0, 5).map(a => a.text).join('; ') || 'None',
    })
  }

  useEffect(() => {
    if (hasData) runBriefing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData])

  const aiSummary = briefing.data?.text || ''

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[24px]">Dashboard</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <Calendar size={12} />
          <span>Live data from your business</span>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-text-secondary">{s.label}</span>
              <s.icon size={15} className={s.color} strokeWidth={1.5} />
            </div>
            <div className="text-[24px] font-display font-bold">
              {s.prefix && <span className="text-[14px] text-text-secondary mr-1">{s.prefix}</span>}
              {s.value}
            </div>
            <span className="text-[11px] text-text-tertiary mt-1 block">{s.change}</span>
          </div>
        ))}
      </div>

      {/* ── Empty state for new installs ── */}
      {!hasData && (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Briefcase}
            title="Welcome to Cloz Digital"
            description="Your dashboard will populate as you add clients, invoices, and leads. Get started by adding your first client or running a Scout search for real prospects."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/admin/clients'}
            secondaryActionLabel="Find Prospects"
            onSecondaryAction={() => window.location.href = '/admin/scout'}
          />
        </div>
      )}

      {/* ── Main grid ── */}
      {hasData && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            {/* AI Daily Brief */}
            <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-6">
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
                    <span className="text-text-tertiary">Generating daily briefing from your live data…</span>
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

            {/* Top Leads */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-[14px] flex items-center gap-2"><Target size={13} className="text-accent" />Top Leads</h2>
                <Link to="/admin/scout" className="text-[11px] text-accent hover:text-accent-hover">View all</Link>
              </div>
              {metrics.topLeads.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No leads yet"
                  description="Find verified businesses via the Scout module."
                  actionLabel="Open Scout"
                  onAction={() => window.location.href = '/admin/scout'}
                  className="py-8"
                />
              ) : (
                <div className="space-y-3">
                  {metrics.topLeads.map(l => (
                    <div key={l.id} className="p-3 bg-elevated rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-medium truncate">{l.name}</span>
                        <span className={`text-[11px] font-mono font-bold shrink-0 ml-2 ${(l.score || 0) >= 80 ? 'text-success' : (l.score || 0) >= 60 ? 'text-warning' : 'text-text-tertiary'}`}>{l.score || '—'}</span>
                      </div>
                      <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2">{l.reason || l.auditSummary || l.niche || l.location}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Second row ── */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Overdue Invoices */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={14} className="text-warning" />
                <h2 className="font-display font-semibold text-[14px]">Overdue Invoices</h2>
              </div>
              {metrics.overdueInvoices.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-text-tertiary">
                  No overdue invoices. <span className="text-success">All clear.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.overdueInvoices.map(inv => {
                    const daysLate = daysBetween(inv.due) ? Math.abs(daysBetween(inv.due)) : 0
                    return (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-elevated rounded-md">
                        <div>
                          <span className="text-[13px] font-medium">{inv.client}</span>
                          <div className="text-[11px] text-text-tertiary mt-0.5">{inv.id} &middot; {inv.amount} BAM</div>
                        </div>
                        <span className="text-[11px] font-medium text-error">{daysLate}d late</span>
                      </div>
                    )
                  })}
                </div>
              )}
              {metrics.overdueInvoices.length > 0 && (
                <Link to="/admin/billing" className="mt-3 block text-center text-[12px] text-accent hover:text-accent-hover font-medium py-2">
                  Go to Billing →
                </Link>
              )}
            </div>

            {/* Expiring Domains */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={14} className="text-info" />
                <h2 className="font-display font-semibold text-[14px]">Expiring Soon</h2>
              </div>
              {metrics.expiringDomains.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-text-tertiary">
                  Nothing expiring in the next 30 days.
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.expiringDomains.slice(0, 4).map(d => (
                    <div key={d.id} className="p-3 bg-elevated rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-mono text-text-primary truncate">{d.website}</span>
                        <span className={`text-[11px] font-medium shrink-0 ml-2 ${d.daysLeft <= 14 ? 'text-error' : 'text-warning'}`}>{d.daysLeft}d</span>
                      </div>
                      <div className="text-[11px] text-text-tertiary mt-1">{d.name}{d.domain ? ` · ${d.domain}` : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-semibold text-[14px] flex items-center gap-2">
                  <ActivityIcon size={13} /> Recent Activity
                </h2>
              </div>
              {activity.length === 0 ? (
                <div className="text-center py-6 text-[12px] text-text-tertiary">
                  Activity will appear here as you work.
                </div>
              ) : (
                <div className="space-y-3">
                  {activity.slice(0, 6).map(a => (
                    <div key={a.id} className="flex gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                        a.type === 'success' ? 'bg-success' : a.type === 'accent' ? 'bg-accent' : 'bg-text-tertiary'
                      }`} />
                      <div className="min-w-0">
                        <p className="text-[12px] text-text-secondary leading-relaxed">{a.text}</p>
                        <span className="text-[10px] text-text-tertiary">{a.time}</span>
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
