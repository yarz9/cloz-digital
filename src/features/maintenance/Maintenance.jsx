import { useState, useMemo } from 'react'
import { Wrench, Plus, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { useStore } from '@/stores/management'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  MAINTENANCE — Activity log from real client maintenance records
// ══════════════════════════════════════════════════════════════

const typeColors = {
  update: 'bg-info/10 text-info',
  content: 'bg-accent-muted text-accent',
  security: 'bg-success/10 text-success',
  fix: 'bg-error/10 text-error',
  backup: 'bg-elevated text-text-secondary',
  other: 'bg-elevated text-text-tertiary',
}

const types = ['all', 'update', 'content', 'security', 'fix', 'backup', 'other']

export default function Maintenance() {
  const tasks = useStore(s => s.tasks)
  const clients = useStore(s => s.clients)
  const addTask = useStore(s => s.addTask)
  const updateTask = useStore(s => s.updateTask)
  const [typeFilter, setTypeFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', client: '', type: 'update', notes: '', duration: '' })

  // Maintenance logs are tasks tagged with module='maintenance'
  const logs = useMemo(() => tasks.filter(t => t.module === 'maintenance'), [tasks])

  const filtered = logs.filter(l => typeFilter === 'all' || l.type === typeFilter)
  const inProgress = logs.filter(l => l.status === 'in-progress').length

  const handleLog = (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    addTask({
      title: form.title,
      client: form.client,
      type: form.type,
      notes: form.notes,
      duration: form.duration,
      status: 'in-progress',
      module: 'maintenance',
      priority: 'medium',
      due: new Date().toISOString().slice(0, 10),
    })
    setForm({ title: '', client: '', type: 'update', notes: '', duration: '' })
    setShowForm(false)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[20px]">Maintenance</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">
            {logs.length === 0 ? 'No logs yet' : `${logs.length} log${logs.length === 1 ? '' : 's'}${inProgress ? ` · ${inProgress} in progress` : ''}`}
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} />
          Log Work
        </button>
      </div>

      {/* Quick-log form */}
      {showForm && (
        <form onSubmit={handleLog} className="bg-surface border border-border rounded-lg p-4 space-y-3">
          <div className="grid md:grid-cols-2 gap-2">
            <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="What was done?" className="bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent" />
            <select value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}
              className="bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent">
              <option value="">Select client...</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent">
              {types.filter(t => t !== 'all').map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
            <input value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })}
              placeholder="Duration (e.g. 20min)" className="bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent" />
          </div>
          <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Notes..." className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:outline-none focus:border-accent resize-none" />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-1.5">Cancel</button>
            <button type="submit" className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium">Save Log</button>
          </div>
        </form>
      )}

      {logs.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg">
          <EmptyState
            icon={Wrench}
            title="No maintenance logs yet"
            description="Every time you update, fix, or maintain a client site, log it here. The activity feed builds a clean record for monthly reports."
            actionLabel="Log Your First Activity"
            onAction={() => setShowForm(true)}
          />
        </div>
      ) : (
        <>
          {/* Type filters */}
          <div className="flex gap-1 flex-wrap">
            {types.map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${
                  typeFilter === t ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
                }`}>
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map(log => (
              <div key={log.id} className="bg-surface border border-border rounded-lg p-4 hover:border-border-strong transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${typeColors[log.type] || typeColors.other}`}>{log.type || 'other'}</span>
                    <h3 className="text-[13px] font-medium">{log.title}</h3>
                  </div>
                  <button onClick={() => updateTask(log.id, { status: log.status === 'done' ? 'in-progress' : 'done' })}
                    className={`text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                      log.status === 'done' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                    {log.status === 'done' ? <><CheckCircle size={10} /> Done</> : <><Clock size={10} /> In Progress</>}
                  </button>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-text-tertiary mb-2 flex-wrap">
                  {log.client && <><span>{log.client}</span><span>&middot;</span></>}
                  <span>{log.due || log.created}</span>
                  {log.duration && <><span>&middot;</span><span>{log.duration}</span></>}
                </div>
                {log.notes && <p className="text-[12px] text-text-secondary leading-relaxed">{log.notes}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
