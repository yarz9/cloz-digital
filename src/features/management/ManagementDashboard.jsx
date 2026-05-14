import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Users, Receipt, TrendingUp, Globe, AlertTriangle, Clock, Target,
  ArrowUpRight, Sparkles, ChevronRight, Calendar, RefreshCw, Loader2,
  HeartPulse, DollarSign, CheckSquare, Search, GitBranch, Shield,
  FileText, Send, Palette, FileBarChart
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const stats = [
  { label: 'Active Clients', value: '12', change: '+2 this month', icon: Users, color: 'text-accent', to: '/management/clients' },
  { label: 'Open Invoices', value: '4', change: '2,340 BAM outstanding', icon: Receipt, color: 'text-warning', to: '/management/billing' },
  { label: 'Monthly Revenue', value: '3,200', prefix: 'BAM', change: '+12% vs last month', icon: TrendingUp, color: 'text-success', to: '/management/revenue' },
  { label: 'Pipeline Value', value: '5,900', prefix: 'BAM', change: '8 active deals', icon: GitBranch, color: 'text-info', to: '/management/pipeline' },
  { label: 'Monitored Sites', value: '18', change: 'All operational', icon: Globe, color: 'text-success', to: '/management/status' },
  { label: 'Health Score', value: '94%', change: 'Avg across clients', icon: HeartPulse, color: 'text-accent', to: '/management/health' },
]

const urgentItems = [
  { type: 'overdue', label: 'Peak Athletics — INV-1042', detail: '450 BAM · 12 days late', icon: AlertTriangle, color: 'text-error', to: '/management/billing' },
  { type: 'overdue', label: 'Zen Café — INV-1038', detail: '200 BAM · 7 days late', icon: AlertTriangle, color: 'text-error', to: '/management/billing' },
  { type: 'domain', label: 'bravainteriors.ba expiring', detail: '14 days · BH Telecom', icon: Clock, color: 'text-warning', to: '/management/hosting' },
  { type: 'domain', label: 'peakathletics.com expiring', detail: '28 days · Namecheap', icon: Clock, color: 'text-warning', to: '/management/hosting' },
  { type: 'task', label: '2 Presence Care renewals', detail: 'Due next week', icon: CheckSquare, color: 'text-info', to: '/management/tasks' },
]

const topLeads = [
  { name: 'Sarajevo Dental Clinic', score: 92, reason: 'No website, 4.8 Google rating', urgency: 'high' },
  { name: 'Alpine Outdoor Shop', score: 87, reason: 'Outdated design, no mobile', urgency: 'high' },
  { name: 'Mostar Photography Studio', score: 81, reason: 'Poor SEO, slow load times', urgency: 'medium' },
]

const activity = [
  { time: '2h ago', text: 'Invoice INV-1048 paid by Zenith Consulting', type: 'success' },
  { time: '4h ago', text: 'Maintenance completed for Mira Wellness', type: 'info' },
  { time: '6h ago', text: 'New lead saved: Mostar Photography Studio', type: 'accent' },
  { time: 'Yesterday', text: 'SSL renewed for harmonyyoga.ba', type: 'info' },
  { time: 'Yesterday', text: 'Proposal sent to Alpine Outdoor Shop', type: 'accent' },
]

export default function ManagementDashboard() {
  const briefing = useAI(ai.dashboardBriefing)

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    briefing.run({
      date: today,
      activeClients: '12',
      overdueInvoices: 'Peak Athletics: INV-1042 (450 BAM, 12 days late), Zen Café: INV-1038 (200 BAM, 7 days late)',
      expiringDomains: 'bravainteriors.ba (14 days), peakathletics.com (28 days)',
      newLeads: 'Sarajevo Dental Clinic (score 92, no website, 4.8 rating), Mostar Photography Studio (score 81)',
      pendingTasks: '2 Presence Care renewals due next week',
      recentActivity: 'INV-1048 paid by Zenith Consulting, Maintenance completed for Mira Wellness, SSL renewed for harmonyyoga.ba',
    })
  }, [])

  const aiSummary = briefing.data?.text || ''

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[24px]">Management Overview</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <NavLink to="/management/command" className="flex items-center gap-2 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-md text-[12px] font-medium transition-colors">
            <Sparkles size={13} />
            Command Center
          </NavLink>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Main grid: AI Brief + Urgent */}
      <div className="grid lg:grid-cols-5 gap-4">
        {/* AI Daily Brief */}
        <div className="lg:col-span-3 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={15} className="text-accent" />
            <h2 className="font-display font-semibold text-[14px]">AI Daily Brief</h2>
            <button
              onClick={() => {
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                briefing.run({
                  date: today,
                  activeClients: '12',
                  overdueInvoices: 'Peak Athletics: INV-1042 (450 BAM, 12 days late), Zen Café: INV-1038 (200 BAM, 7 days late)',
                  expiringDomains: 'bravainteriors.ba (14 days), peakathletics.com (28 days)',
                  newLeads: 'Sarajevo Dental Clinic (score 92, no website, 4.8 rating), Mostar Photography Studio (score 81)',
                  pendingTasks: '2 Presence Care renewals due next week',
                  recentActivity: 'INV-1048 paid by Zenith Consulting, Maintenance completed for Mira Wellness, SSL renewed for harmonyyoga.ba',
                })
              }}
              disabled={briefing.loading}
              className="ml-auto text-[10px] text-text-tertiary hover:text-accent bg-elevated px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
            >
              {briefing.loading ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
              {briefing.loading ? 'Generating...' : 'Refresh'}
            </button>
          </div>
          <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
            {briefing.loading && !aiSummary ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 size={14} className="animate-spin text-accent" />
                <span className="text-text-tertiary">Generating daily briefing...</span>
              </div>
            ) : briefing.error ? (
              <div className="text-error text-[12px] py-2">Failed to generate briefing: {briefing.error}</div>
            ) : aiSummary ? (
              aiSummary.split('\n').map((line, i) => {
                if (line.includes('**')) {
                  const parts = line.split(/\*\*(.*?)\*\*/g)
                  return <p key={i} className="mb-2">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-text-primary font-medium">{part}</strong> : part)}</p>
                }
                return line ? <p key={i} className="mb-2">{line}</p> : <br key={i} />
              })
            ) : (
              <span className="text-text-tertiary">No briefing available.</span>
            )}
          </div>
        </div>

        {/* Urgent Items */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[14px] flex items-center gap-2">
              <AlertTriangle size={14} className="text-error" />
              Requires Attention
            </h2>
            <span className="text-[10px] font-medium text-error bg-error/10 px-1.5 py-0.5 rounded">{urgentItems.length}</span>
          </div>
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
        </div>
      </div>

      {/* Bottom row: Top Leads + Activity + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Top Leads */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[14px] flex items-center gap-2">
              <Target size={14} className="text-accent" />
              Top Leads
            </h2>
            <NavLink to="/management/scout" className="text-[11px] text-accent hover:text-accent-hover">View all</NavLink>
          </div>
          <div className="space-y-2.5">
            {topLeads.map(l => (
              <div key={l.name} className="p-3 bg-elevated rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium">{l.name}</span>
                  <span className={`text-[11px] font-mono font-bold ${l.score >= 85 ? 'text-success' : 'text-warning'}`}>{l.score}</span>
                </div>
                <p className="text-[10px] text-text-tertiary">{l.reason}</p>
                <span className={`inline-flex text-[9px] font-medium px-1.5 py-0.5 rounded mt-1.5 ${
                  l.urgency === 'high' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
                }`}>{l.urgency} priority</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  a.type === 'success' ? 'bg-success' : a.type === 'accent' ? 'bg-accent' : 'bg-text-tertiary'
                }`} />
                <div>
                  <p className="text-[11px] text-text-secondary leading-relaxed">{a.text}</p>
                  <span className="text-[10px] text-text-tertiary">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: 'Create Invoice', to: '/management/billing', icon: Receipt },
              { label: 'Draft Proposal', to: '/management/proposals', icon: FileText },
              { label: 'New Outreach', to: '/management/outreach', icon: Send },
              { label: 'Generate Content', to: '/management/content', icon: Palette },
              { label: 'Run Health Check', to: '/management/ai/health', icon: Shield },
              { label: 'View Reports', to: '/management/reports', icon: FileBarChart },
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
    </div>
  )
}
