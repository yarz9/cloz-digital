import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Command, Sparkles, AlertTriangle, TrendingUp, Clock, CheckCircle, Users, Receipt, Globe, Loader2 } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  COMMAND CENTER — Live AI operator brief built from real data
// ══════════════════════════════════════════════════════════════

function daysBetween(dateStr) {
  if (!dateStr) return null
  return Math.round((new Date(dateStr) - new Date()) / 86400000)
}

export default function CommandCenter() {
  const clients = useStore(s => s.clients)
  const invoices = useStore(s => s.invoices)
  const leads = useStore(s => s.leads)
  const deals = useStore(s => s.deals)
  const tasks = useStore(s => s.tasks)
  const proposals = useStore(s => s.proposals)

  const dailyBrief = useAI(ai.generate)
  const [brief, setBrief] = useState('')

  const ctx = useMemo(() => {
    const activeClients = clients.filter(c => c.status !== 'archived')
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')
    const overdueTotal = overdueInvoices.reduce((s, i) => s + (i.amount || 0), 0)
    const topLeads = [...leads].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 3)
    const expiringDomains = clients
      .filter(c => c.domainExpiry)
      .map(c => ({ ...c, daysLeft: daysBetween(c.domainExpiry) }))
      .filter(c => c.daysLeft != null && c.daysLeft <= 30 && c.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft)
    const pendingProposals = proposals.filter(p => p.status === 'sent' || p.status === 'viewed')
    const pipelineValue = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost').reduce((s, d) => s + (d.value || 0), 0)
    const openTasks = tasks.filter(t => t.status !== 'done').length
    const mrr = clients.reduce((s, c) => s + (c.mrr || 0), 0)
    const sites = clients.filter(c => c.website).length

    return { activeClients, overdueInvoices, overdueTotal, topLeads, expiringDomains, pendingProposals, pipelineValue, openTasks, mrr, sites }
  }, [clients, invoices, leads, deals, tasks, proposals])

  const hasData = clients.length > 0 || invoices.length > 0 || leads.length > 0 || deals.length > 0

  useEffect(() => {
    if (!hasData) return
    const prompt = `You are the AI operations assistant for Cloz Digital, a premium web design agency in Bosnia. Generate a concise morning operator brief based on this live business state.

Active clients: ${ctx.activeClients.length}${ctx.activeClients.length ? ` (${ctx.activeClients.slice(0, 6).map(c => c.name).join(', ')}${ctx.activeClients.length > 6 ? `, +${ctx.activeClients.length - 6} more` : ''})` : ''}
Overdue invoices: ${ctx.overdueInvoices.length} totaling ${ctx.overdueTotal} BAM${ctx.overdueInvoices.length ? ` (${ctx.overdueInvoices.slice(0, 3).map(i => `${i.client} ${i.id}`).join(', ')})` : ''}
Hot leads: ${ctx.topLeads.length ? ctx.topLeads.map(l => `${l.name} (score ${l.score})`).join(', ') : 'None'}
Domains expiring within 30 days: ${ctx.expiringDomains.length ? ctx.expiringDomains.slice(0, 3).map(d => `${d.website} in ${d.daysLeft}d`).join(', ') : 'None'}
Proposals awaiting response: ${ctx.pendingProposals.length}
Pipeline value: ${ctx.pipelineValue} BAM
Open tasks: ${ctx.openTasks}
MRR: ${ctx.mrr} BAM

Format as:
TOP PRIORITIES (3 max):
...
RISKS:
...
OPPORTUNITIES:
...
QUICK WINS:
...

Be direct. No fluff. Real operational guidance.`

    dailyBrief.run(prompt, 0.4).then(res => {
      if (res?.text) setBrief(res.text)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasData])

  // Build alerts dynamically
  const alerts = []
  if (ctx.overdueInvoices.length > 0) {
    alerts.push({
      icon: AlertTriangle, color: 'text-error',
      text: `${ctx.overdueInvoices.length} overdue invoice${ctx.overdueInvoices.length === 1 ? '' : 's'} (${ctx.overdueTotal.toLocaleString()} BAM total)`,
      action: 'Follow up', to: '/management/billing',
    })
  }
  ctx.expiringDomains.slice(0, 2).forEach(d => {
    alerts.push({
      icon: Clock, color: d.daysLeft <= 14 ? 'text-error' : 'text-warning',
      text: `${d.website} expires in ${d.daysLeft} days`,
      action: 'Send reminder', to: '/management/hosting',
    })
  })
  if (ctx.pendingProposals.length > 0) {
    alerts.push({
      icon: Receipt, color: 'text-info',
      text: `${ctx.pendingProposals.length} proposal${ctx.pendingProposals.length === 1 ? '' : 's'} awaiting response`,
      action: 'Check status', to: '/management/proposals',
    })
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-[24px] flex items-center gap-2">
          <Command size={22} className="text-accent" /> Command Center
        </h1>
        <p className="text-[13px] text-text-secondary mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {!hasData ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Command}
            title="Command Center is ready"
            description="The operator brief and alerts populate from your real business data. Add clients, invoices, leads, or deals to activate the daily intelligence brief."
            actionLabel="Add a Client"
            onAction={() => window.location.href = '/management/clients'}
            secondaryActionLabel="Find Prospects"
            onSecondaryAction={() => window.location.href = '/management/scout'}
          />
        </div>
      ) : (
        <>
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
                  <a.icon size={15} className={a.color} />
                  <span className="text-[13px] text-text-secondary flex-1">{a.text}</span>
                  {a.action && a.to && (
                    <Link to={a.to} className="text-[11px] text-accent hover:text-accent-hover font-medium px-2 py-1 rounded hover:bg-elevated transition-colors">
                      {a.action}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-surface border border-accent/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-accent" />
              <h2 className="font-display font-semibold text-[16px]">Operator Daily Brief</h2>
              <span className="ml-auto text-[10px] text-text-tertiary bg-elevated px-2 py-0.5 rounded">AI Generated</span>
            </div>
            <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
              {dailyBrief.loading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 size={14} className="animate-spin text-accent" /> Generating operational brief from your live data…
                </div>
              ) : brief ? (
                brief.split('\n').map((line, i) => {
                  if (line.match(/^[A-Z ]+:/)) return <p key={i} className="font-semibold text-text-primary mt-3 mb-1 text-[12px] uppercase tracking-wider">{line}</p>
                  return line ? <p key={i} className="mb-1">{line}</p> : <br key={i} />
                })
              ) : dailyBrief.error ? (
                <span className="text-error text-[12px]">{dailyBrief.error}</span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Active Clients',  value: ctx.activeClients.length,         icon: Users,      color: 'text-accent' },
              { label: 'Pipeline Value',  value: `${ctx.pipelineValue.toLocaleString()} BAM`, icon: TrendingUp, color: 'text-success' },
              { label: 'Open Tasks',      value: ctx.openTasks,                    icon: CheckCircle, color: 'text-warning' },
              { label: 'Sites Tracked',   value: ctx.sites,                        icon: Globe,      color: 'text-info' },
            ].map(s => (
              <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-text-tertiary">{s.label}</span>
                  <s.icon size={14} className={s.color} strokeWidth={1.5} />
                </div>
                <span className="text-[20px] font-display font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
