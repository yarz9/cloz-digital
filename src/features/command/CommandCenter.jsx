import { useState, useEffect } from 'react'
import { Command, Sparkles, AlertTriangle, TrendingUp, Clock, CheckCircle, Users, Receipt, Globe, Loader2 } from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'

export default function CommandCenter() {
  const dailyBrief = useAI(ai.generate)
  const [brief, setBrief] = useState('')

  useEffect(() => {
    dailyBrief.run(
      `You are the AI operations assistant for Cloz Digital, a web design agency. Generate a concise morning operator brief.

Current state:
- 6 active clients (Brava Interiors, Peak Athletics, Zenith Consulting, Mira Wellness, Harmony Yoga, Stari Grad Restaurant)
- 2 overdue invoices from Peak Athletics totaling 800 BAM
- 3 active leads in pipeline (Sarajevo Dental score 92, Alpine Outdoor score 87, Mostar Photography score 81)
- Domain expiring: bravainteriors.ba in 14 days
- 2 proposals awaiting response
- Monthly revenue on track at 3,200 BAM

Format as:
TOP PRIORITIES (3 max):
...
RISKS:
...
OPPORTUNITIES:
...
QUICK WINS:
...

Be direct. No fluff. Real operational guidance.`,
      0.4
    ).then(res => {
      if (res?.text) setBrief(res.text)
    })
  }, [])

  const alerts = [
    { icon: AlertTriangle, color: 'text-error', text: 'Peak Athletics: 2 overdue invoices (800 BAM total)', action: 'Follow up' },
    { icon: Clock, color: 'text-warning', text: 'bravainteriors.ba domain expires in 14 days', action: 'Send reminder' },
    { icon: Receipt, color: 'text-info', text: '2 proposals awaiting response (Alpine Outdoor, Mostar Photo)', action: 'Check status' },
    { icon: TrendingUp, color: 'text-success', text: 'Revenue tracking +12% vs last month', action: null },
  ]

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

      {/* Alerts */}
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
            <a.icon size={15} className={a.color} />
            <span className="text-[13px] text-text-secondary flex-1">{a.text}</span>
            {a.action && (
              <button className="text-[11px] text-accent hover:text-accent-hover font-medium px-2 py-1 rounded hover:bg-elevated transition-colors">{a.action}</button>
            )}
          </div>
        ))}
      </div>

      {/* AI Brief */}
      <div className="bg-surface border border-accent/20 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-accent" />
          <h2 className="font-display font-semibold text-[16px]">Operator Daily Brief</h2>
          <span className="ml-auto text-[10px] text-text-tertiary bg-elevated px-2 py-0.5 rounded">AI Generated</span>
        </div>
        <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
          {dailyBrief.loading ? (
            <div className="flex items-center gap-2 py-4"><Loader2 size={14} className="animate-spin text-accent" /> Generating operational brief...</div>
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

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Active Clients', value: '6', icon: Users, color: 'text-accent' },
          { label: 'Pipeline Value', value: '5,900 BAM', icon: TrendingUp, color: 'text-success' },
          { label: 'Open Tasks', value: '7', icon: CheckCircle, color: 'text-warning' },
          { label: 'Sites Monitored', value: '6', icon: Globe, color: 'text-info' },
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
    </div>
  )
}
