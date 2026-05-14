import { useState, useEffect } from 'react'
import {
  Users, Receipt, TrendingUp, Globe, AlertTriangle, Clock,
  ArrowUpRight, Sparkles, ChevronRight, Calendar, ExternalLink, RefreshCw, Loader2
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

const stats = [
  { label: 'Active Clients', value: '12', change: '+2 this month', icon: Users, color: 'text-accent' },
  { label: 'Open Invoices', value: '4', change: '2,340 BAM outstanding', icon: Receipt, color: 'text-warning' },
  { label: 'Monthly Revenue', value: '3,200', prefix: 'BAM', change: '+12% vs last month', icon: TrendingUp, color: 'text-success' },
  { label: 'Monitored Sites', value: '18', change: 'All operational', icon: Globe, color: 'text-info' },
]

const opportunities = [
  { name: 'Sarajevo Dental Clinic', reason: 'No website detected, active on Google Maps with 4.8 rating', score: 92, urgency: 'high' },
  { name: 'Alpine Outdoor Shop', reason: 'Outdated design (2018), no mobile responsiveness, broken contact form', score: 87, urgency: 'high' },
  { name: 'Harmony Yoga Studio', reason: 'Using Wix free plan, poor performance, no SSL', score: 78, urgency: 'medium' },
]

const overdue = [
  { client: 'Peak Athletics', invoice: 'INV-1042', amount: '450 BAM', days: 12 },
  { client: 'Zen Café', invoice: 'INV-1038', amount: '200 BAM', days: 7 },
]

const expiring = [
  { domain: 'bravainteriors.ba', client: 'Brava Interiors', days: 14, registrar: 'BH Telecom' },
  { domain: 'peakathletics.com', client: 'Peak Athletics', days: 28, registrar: 'Namecheap' },
]

const activity = [
  { time: '2h ago', text: 'Invoice INV-1048 paid by Zenith Consulting', type: 'success' },
  { time: '4h ago', text: 'Maintenance completed for Mira Wellness — plugin updates', type: 'info' },
  { time: '6h ago', text: 'New lead saved: Mostar Photography Studio (score: 81)', type: 'accent' },
  { time: 'Yesterday', text: 'SSL certificate renewed for harmonyyoga.ba', type: 'info' },
  { time: 'Yesterday', text: 'Proposal sent to Alpine Outdoor Shop — Growth Care', type: 'accent' },
]

export default function Dashboard() {
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
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[24px]">Dashboard</h1>
          <p className="text-[13px] text-text-secondary mt-0.5">Tuesday, 13 May 2026</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 bg-elevated hover:bg-raised border border-border px-3 py-2 rounded-md text-[12px] font-medium text-text-secondary hover:text-text-primary transition-colors">
            <Calendar size={13} />
            This Week
          </button>
        </div>
      </div>

      {/* Stats */}
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
            <span className="text-[11px] text-text-tertiary mt-1">{s.change}</span>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* AI Daily Brief */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-lg p-6">
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

        {/* Best Opportunities */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[14px]">Best Opportunities</h2>
            <a href="/admin/scout" className="text-[11px] text-accent hover:text-accent-hover">View all</a>
          </div>
          <div className="space-y-3">
            {opportunities.map(o => (
              <div key={o.name} className="p-3 bg-elevated rounded-md">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-medium">{o.name}</span>
                  <span className={`text-[11px] font-mono font-bold ${o.score >= 85 ? 'text-success' : 'text-warning'}`}>{o.score}</span>
                </div>
                <p className="text-[11px] text-text-tertiary leading-relaxed">{o.reason}</p>
                <div className="mt-2">
                  <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    o.urgency === 'high' ? 'bg-error/10 text-error' : 'bg-warning/10 text-warning'
                  }`}>{o.urgency} priority</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Overdue Invoices */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-warning" />
            <h2 className="font-display font-semibold text-[14px]">Overdue</h2>
          </div>
          <div className="space-y-3">
            {overdue.map(o => (
              <div key={o.invoice} className="flex items-center justify-between p-3 bg-elevated rounded-md">
                <div>
                  <span className="text-[13px] font-medium">{o.client}</span>
                  <div className="text-[11px] text-text-tertiary mt-0.5">{o.invoice} &middot; {o.amount}</div>
                </div>
                <span className="text-[11px] font-medium text-error">{o.days}d late</span>
              </div>
            ))}
          </div>
          <button className="mt-3 w-full text-[12px] text-accent hover:text-accent-hover font-medium py-2">
            Draft reminders
          </button>
        </div>

        {/* Expiring Domains */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-info" />
            <h2 className="font-display font-semibold text-[14px]">Expiring Soon</h2>
          </div>
          <div className="space-y-3">
            {expiring.map(d => (
              <div key={d.domain} className="p-3 bg-elevated rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-mono text-text-primary">{d.domain}</span>
                  <span className={`text-[11px] font-medium ${d.days <= 14 ? 'text-error' : 'text-warning'}`}>{d.days}d</span>
                </div>
                <div className="text-[11px] text-text-tertiary mt-1">{d.client} &middot; {d.registrar}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-[14px]">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  a.type === 'success' ? 'bg-success' : a.type === 'accent' ? 'bg-accent' : 'bg-text-tertiary'
                }`} />
                <div>
                  <p className="text-[12px] text-text-secondary leading-relaxed">{a.text}</p>
                  <span className="text-[10px] text-text-tertiary">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
