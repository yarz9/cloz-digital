import { useState } from 'react'
import { Wrench, Plus, Search, CheckCircle, Clock, AlertTriangle, Sparkles, Filter } from 'lucide-react'

const logs = [
  { id: 1, client: 'Brava Interiors', site: 'bravainteriors.ba', type: 'update', title: 'WordPress core + plugin updates', date: '2026-05-08', duration: '25min', status: 'completed', assignee: 'You', notes: 'Updated WP 6.7.1 → 6.7.2, Elementor 3.22 → 3.23, WooCommerce 9.1 → 9.2. All working post-update.' },
  { id: 2, client: 'Harmony Yoga', site: 'harmonyyoga.ba', type: 'content', title: 'Updated class schedule page', date: '2026-05-12', duration: '15min', status: 'completed', assignee: 'You', notes: 'Replaced summer schedule image. Updated pricing for Prenatal Yoga class. Added new instructor bio.' },
  { id: 3, client: 'Stari Grad Restaurant', site: 'starigradrestaurant.ba', type: 'content', title: 'Seasonal menu update', date: '2026-05-05', duration: '20min', status: 'completed', assignee: 'Partner', notes: 'Replaced spring menu with summer menu. Updated food photography. Added 3 new dessert items.' },
  { id: 4, client: 'Zenith Consulting', site: 'zenithconsulting.ba', type: 'security', title: 'Security audit + SSL renewal', date: '2026-05-10', duration: '40min', status: 'completed', assignee: 'You', notes: 'Ran full security scan — no issues found. Renewed Let\'s Encrypt cert. Updated security headers.' },
  { id: 5, client: 'Peak Athletics', site: 'peakathletics.com', type: 'fix', title: 'Contact form submission error', date: '2026-04-22', duration: '35min', status: 'completed', assignee: 'You', notes: 'Form was returning 500 error due to SMTP config change. Updated SMTP credentials and tested all forms.' },
  { id: 6, client: 'Brava Interiors', site: 'bravainteriors.ba', type: 'backup', title: 'Monthly backup + restore test', date: '2026-05-01', duration: '30min', status: 'completed', assignee: 'You', notes: 'Full site backup created. Restore test successful on staging. Database integrity verified.' },
  { id: 7, client: 'Mira Wellness', site: 'mirawellness.ba', type: 'update', title: 'Framework updates + performance check', date: '2026-05-01', duration: '20min', status: 'completed', assignee: 'Partner', notes: 'Updated Next.js 14.2 → 14.3. Ran Lighthouse — 96 performance score maintained.' },
  { id: 8, client: 'Peak Athletics', site: 'peakathletics.com', type: 'content', title: 'New training program pages (3)', date: '2026-05-15', duration: '—', status: 'in-progress', assignee: 'You', notes: 'Client requested 3 new program pages. Draft content received. Building pages.' },
]

const typeColors = {
  update: 'bg-info/10 text-info',
  content: 'bg-accent-muted text-accent',
  security: 'bg-success/10 text-success',
  fix: 'bg-error/10 text-error',
  backup: 'bg-elevated text-text-secondary',
}

export default function Maintenance() {
  const [typeFilter, setTypeFilter] = useState('all')
  const types = ['all', 'update', 'content', 'security', 'fix', 'backup']

  const filtered = logs.filter(l => typeFilter === 'all' || l.type === typeFilter)

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Maintenance</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">{logs.length} logs this month &middot; 1 in progress</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 bg-elevated hover:bg-raised border border-border px-3 py-1.5 rounded-md text-[12px] font-medium text-text-secondary transition-colors">
            <Sparkles size={12} />
            Generate Report
          </button>
          <button className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
            <Plus size={13} />
            Log Work
          </button>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-1">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${
              typeFilter === t ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* Log list */}
      <div className="space-y-3">
        {filtered.map(log => (
          <div key={log.id} className="bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${typeColors[log.type]}`}>{log.type}</span>
                <h3 className="text-[13px] font-medium">{log.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {log.status === 'completed' ? (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-success/10 text-success flex items-center gap-1"><CheckCircle size={10} /> Done</span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-warning/10 text-warning flex items-center gap-1"><Clock size={10} /> In Progress</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-text-tertiary mb-2">
              <span>{log.client}</span>
              <span>&middot;</span>
              <span className="font-mono">{log.site}</span>
              <span>&middot;</span>
              <span>{log.date}</span>
              {log.duration !== '—' && <><span>&middot;</span><span>{log.duration}</span></>}
              <span>&middot;</span>
              <span>{log.assignee}</span>
            </div>
            <p className="text-[12px] text-text-secondary leading-relaxed">{log.notes}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
