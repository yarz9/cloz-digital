import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Workflow, FileText, Zap, Sparkles, ScrollText, Layout,
  Loader2, AlertCircle, Plus, X, Check, ArrowRight, ChevronRight, RefreshCw,
  Play, CheckCircle2, Clock, Trash2,
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  OPERATIONS — SOP engine: library, workflows, automations, audit
// ══════════════════════════════════════════════════════════════

async function api(path, options = {}) {
  const res = await fetch(`/api/operations${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const json = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`)
  return json
}

const TABS = [
  { key: 'dashboard',   label: 'Dashboard',   icon: Layout },
  { key: 'sops',        label: 'SOP Library', icon: FileText },
  { key: 'workflows',   label: 'Workflows',   icon: Workflow },
  { key: 'automations', label: 'Automations', icon: Zap },
  { key: 'ai',          label: 'AI Insights', icon: Sparkles },
  { key: 'audit',       label: 'Audit Logs',  icon: ScrollText },
]

export default function Operations() {
  const [tab, setTab] = useState('dashboard')
  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[200px] shrink-0 bg-surface border-r border-border overflow-y-auto p-3">
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.15em] mb-3 px-2">Operations</div>
        <nav className="space-y-0.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] font-medium transition-colors ${
                tab === t.key ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`}>
              <t.icon size={13} className={tab === t.key ? 'text-accent' : 'text-text-tertiary'} />{t.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'sops' && <SOPLibrary />}
        {tab === 'workflows' && <Workflows />}
        {tab === 'automations' && <Automations />}
        {tab === 'ai' && <AIInsights />}
        {tab === 'audit' && <Audit />}
      </div>
    </div>
  )
}

// ── Dashboard ──
function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/dashboard').then(setData).catch(() => null).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">Operations Overview</h1>
        <p className="text-[12px] text-text-secondary mt-1">Workflows, SOPs, automations, and audit at a glance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="SOPs" value={data?.counts?.sops || 0} icon={FileText} />
        <KPI label="Active Workflows" value={data?.counts?.active_instances || 0} icon={Workflow} color="text-accent" />
        <KPI label="Completed (all-time)" value={data?.counts?.completed_instances || 0} icon={CheckCircle2} color="text-success" />
        <KPI label="Active Automations" value={data?.counts?.automations || 0} icon={Zap} color="text-warning" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3">Recent Workflows</h2>
          {data?.recent_instances?.length === 0 ? (
            <p className="text-[12px] text-text-tertiary py-4 text-center">No workflows running yet.</p>
          ) : (
            <div className="space-y-2">
              {data?.recent_instances?.slice(0, 8).map(i => (
                <div key={i.id} className="flex items-center gap-3 bg-elevated rounded-md p-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{i.sop_title}</div>
                    <div className="text-[10px] text-text-tertiary">{i.assignee || 'unassigned'} · {new Date(i.started_at).toLocaleDateString()}</div>
                  </div>
                  <div className="w-16 h-1.5 bg-bg rounded-full overflow-hidden shrink-0">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${i.progress_pct || 0}%` }} />
                  </div>
                  <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
                    i.status === 'completed' ? 'bg-success/10 text-success' :
                    i.status === 'in_progress' ? 'bg-accent-muted text-accent' :
                    'bg-elevated text-text-tertiary'
                  }`}>{i.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display font-semibold text-[14px] mb-3">Recent Activity</h2>
          {data?.recent_audit?.length === 0 ? (
            <p className="text-[12px] text-text-tertiary py-4 text-center">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {data?.recent_audit?.slice(0, 10).map(a => (
                <div key={a.id} className="flex items-start gap-2 text-[11px]">
                  <span className="text-text-tertiary shrink-0 w-1 h-1 rounded-full bg-accent mt-1.5" />
                  <div className="flex-1">
                    <span className="text-text-secondary">{a.summary}</span>
                    <div className="text-[10px] text-text-tertiary">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, icon: Icon, color = 'text-text-primary' }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</span>
        <Icon size={14} className={color} />
      </div>
      <div className={`text-[22px] font-display font-bold ${color}`}>{value}</div>
    </div>
  )
}

// ── SOP Library ──
function SOPLibrary() {
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [showAI, setShowAI] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api('/sops').then(d => setSops(d.sops || [])).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const grouped = useMemo(() => {
    const g = {}
    for (const s of sops) {
      const cat = s.category || 'general'
      g[cat] = g[cat] || []
      g[cat].push(s)
    }
    return g
  }, [sops])

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">SOP Library</h1>
          <p className="text-[12px] text-text-secondary mt-1">{sops.length} standardized procedures · click any SOP to view or run it</p>
        </div>
        <button onClick={() => setShowAI(true)}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-md text-[12px] font-semibold">
          <Sparkles size={13} />Generate SOP with AI
        </button>
      </div>

      {error && <Err msg={error} onDismiss={() => setError('')} />}
      {showAI && <AIGenerator onClose={() => setShowAI(false)} onCreated={() => { setShowAI(false); load() }} />}
      {selected && <SOPDetail slug={selected} onClose={() => setSelected(null)} onRefresh={load} />}

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       sops.length === 0 ? <EmptyState icon={FileText} title="No SOPs yet" description="The default library should load on first boot. Use AI to generate a new SOP for any process." actionLabel="Generate first SOP" onAction={() => setShowAI(true)} /> :
       Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <h2 className="text-[10px] text-text-tertiary uppercase tracking-[0.15em] font-semibold mb-2">{cat.replace(/-/g, ' ')}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(s => (
              <button key={s.id} onClick={() => setSelected(s.slug)}
                className="bg-surface hover:bg-elevated border border-border rounded-lg p-4 text-left transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display font-semibold text-[13px]">{s.title}</h3>
                  {s.default_owner && (
                    <span className="text-[9px] uppercase tracking-wider bg-accent-muted text-accent px-1.5 py-0.5 rounded shrink-0">
                      {s.default_owner}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-tertiary leading-relaxed line-clamp-2 mb-2">{s.description}</p>
                {s.estimated_duration && (
                  <div className="text-[10px] text-text-tertiary flex items-center gap-1">
                    <Clock size={9} />{s.estimated_duration}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SOPDetail({ slug, onClose, onRefresh }) {
  const [sop, setSop] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    api(`/sops/${slug}`).then(setSop).finally(() => setLoading(false))
  }, [slug])

  const runWorkflow = async () => {
    setRunning(true)
    try {
      await api('/instances', { method: 'POST', body: JSON.stringify({ sop_slug: slug, reference_label: `Manual run · ${new Date().toLocaleDateString()}` }) })
      onRefresh?.()
      onClose()
    } catch (e) { alert(e.message) }
    setRunning(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg border border-border rounded-xl max-w-[760px] w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-bold text-[18px]">{sop?.title || '...'}</h2>
          <button onClick={onClose}><X size={16} className="text-text-tertiary" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <Loader2 size={20} className="animate-spin text-accent mx-auto" /> : (
            <>
              <p className="text-[13px] text-text-secondary leading-relaxed mb-4">{sop.description}</p>
              <div className="flex items-center gap-3 text-[11px] text-text-tertiary mb-5 flex-wrap">
                <span>Category: <strong className="text-text-secondary">{sop.category}</strong></span>
                {sop.default_owner && <span>· Owner: <strong className="text-text-secondary">{sop.default_owner}</strong></span>}
                {sop.estimated_duration && <span>· Duration: <strong className="text-text-secondary">{sop.estimated_duration}</strong></span>}
              </div>
              <h3 className="text-[12px] font-semibold mb-3 uppercase tracking-wider text-text-tertiary">Steps ({sop.steps?.length || 0})</h3>
              <div className="space-y-3">
                {sop.steps?.map(step => (
                  <div key={step.id} className="bg-surface border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="w-6 h-6 rounded-full bg-accent-muted text-accent text-[11px] font-bold flex items-center justify-center shrink-0">{step.position}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium">{step.title}</span>
                          {step.owner && <span className="text-[9px] uppercase tracking-wider bg-elevated text-text-secondary px-1.5 py-0.5 rounded">{step.owner}</span>}
                          {step.due_offset_days > 0 && <span className="text-[10px] text-text-tertiary">Day {step.due_offset_days}</span>}
                        </div>
                        {step.description && <p className="text-[11px] text-text-tertiary mt-1 leading-relaxed">{step.description}</p>}
                      </div>
                    </div>
                    {step.checklist?.length > 0 && (
                      <ul className="ml-9 space-y-0.5">
                        {step.checklist.map((c, i) => <li key={i} className="text-[11px] text-text-secondary flex items-start gap-1.5"><span className="text-accent">○</span>{c}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-2">Close</button>
          <button onClick={runWorkflow} disabled={running}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[12px] font-semibold">
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}Run this SOP
          </button>
        </div>
      </div>
    </div>
  )
}

function AIGenerator({ onClose, onCreated }) {
  const [topic, setTopic] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const generate = async () => {
    if (!topic.trim()) return setError('Enter a topic')
    setLoading(true); setError(''); setGenerated(null)
    try {
      const r = await api('/sops/ai-generate', { method: 'POST', body: JSON.stringify({ topic, context }) })
      setGenerated(r.data || r)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const save = async () => {
    if (!generated) return
    setSaving(true)
    try {
      await api('/sops', { method: 'POST', body: JSON.stringify(generated) })
      onCreated()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg border border-border rounded-xl max-w-[640px] w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-bold text-[16px] flex items-center gap-2"><Sparkles size={15} className="text-accent" />Generate SOP with AI</h2>
          <button onClick={onClose}><X size={16} className="text-text-tertiary" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic — e.g. 'Email campaign launch'" autoFocus
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
          <textarea value={context} onChange={e => setContext(e.target.value)} rows={3}
            placeholder="Additional context (optional) — tools used, frequency, special considerations"
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none resize-none" />
          {error && <Err msg={error} onDismiss={() => setError('')} />}
          {generated && (
            <div className="bg-surface border border-accent/30 rounded-lg p-4">
              <h3 className="font-display font-semibold text-[14px] mb-1">{generated.title}</h3>
              <p className="text-[11px] text-text-tertiary mb-3">{generated.description}</p>
              <div className="space-y-1.5">
                {generated.steps?.map((step, i) => (
                  <div key={i} className="text-[12px] flex items-start gap-2">
                    <span className="text-accent shrink-0">{i + 1}.</span>
                    <span><strong>{step.title}</strong>{step.owner ? ` (${step.owner})` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-2">Cancel</button>
          {!generated ? (
            <button onClick={generate} disabled={loading || !topic.trim()}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[12px] font-semibold">
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}Generate
            </button>
          ) : (
            <>
              <button onClick={generate} disabled={loading}
                className="text-[12px] text-text-secondary px-3 py-2">Regenerate</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[12px] font-semibold">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}Save SOP
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Workflows (instances) ──
function Workflows() {
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('in_progress')
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api(`/instances${filter ? '?status=' + filter : ''}`).then(d => setInstances(d.instances || [])).finally(() => setLoading(false))
  }, [filter])
  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">Workflows</h1>
        <p className="text-[12px] text-text-secondary mt-1">Running and historical SOP instances</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {[['in_progress', 'In Progress'], ['completed', 'Completed'], ['', 'All']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`text-[11px] font-medium px-2.5 py-1 rounded ${filter === v ? 'bg-accent-muted text-accent' : 'bg-elevated text-text-tertiary'}`}>
            {l}
          </button>
        ))}
      </div>

      {selected && <WorkflowDetail id={selected} onClose={() => setSelected(null)} onRefresh={load} />}

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       instances.length === 0 ? <EmptyState icon={Workflow} title="No workflows" description="Run an SOP from the library to start a workflow." /> : (
        <div className="space-y-2">
          {instances.map(i => (
            <button key={i.id} onClick={() => setSelected(i.id)}
              className="w-full bg-surface hover:bg-elevated border border-border rounded-lg p-4 text-left transition-colors flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium">{i.sop_title}</span>
                  {i.assignee && <span className="text-[9px] uppercase tracking-wider bg-accent-muted text-accent px-1.5 py-0.5 rounded">{i.assignee}</span>}
                </div>
                {i.reference_label && <div className="text-[10px] text-text-tertiary mt-0.5">{i.reference_label}</div>}
                <div className="text-[10px] text-text-tertiary mt-1">Started {new Date(i.started_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-20 h-1.5 bg-elevated rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${i.progress_pct || 0}%` }} />
                </div>
                <span className="text-[10px] text-text-tertiary w-9 text-right">{i.progress_pct || 0}%</span>
                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                  i.status === 'completed' ? 'bg-success/10 text-success' :
                  i.status === 'in_progress' ? 'bg-accent-muted text-accent' :
                  'bg-elevated text-text-tertiary'
                }`}>{i.status.replace('_', ' ')}</span>
                <ChevronRight size={13} className="text-text-tertiary" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkflowDetail({ id, onClose, onRefresh }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api(`/instances/${id}`).then(setData).finally(() => setLoading(false))
  }, [id])
  useEffect(() => { load() }, [load])

  const update = async (stepId, patch) => {
    try {
      await fetch(`/api/operations/instance-steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      load()
      onRefresh?.()
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg border border-border rounded-xl max-w-[760px] w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-[17px]">{data?.instance?.sop_title || '...'}</h2>
            {data?.instance && <p className="text-[11px] text-text-tertiary">{data.instance.progress_pct}% complete · {data.instance.status.replace('_', ' ')}</p>}
          </div>
          <button onClick={onClose}><X size={16} className="text-text-tertiary" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <Loader2 size={20} className="animate-spin text-accent mx-auto" /> : (
            <div className="space-y-2">
              {data?.steps?.map(step => (
                <WorkflowStepRow key={step.id} step={step} onUpdate={update} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WorkflowStepRow({ step, onUpdate }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-lg p-3 ${step.status === 'done' ? 'bg-success/5 border-success/20' : 'bg-surface border-border'}`}>
      <div className="flex items-center gap-3">
        <button onClick={() => onUpdate(step.id, { status: step.status === 'done' ? 'pending' : 'done' })}
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
            step.status === 'done' ? 'bg-success border-success' : 'border-border hover:border-accent'
          }`}>
          {step.status === 'done' && <Check size={11} className="text-white" />}
        </button>
        <button onClick={() => setOpen(!open)} className="flex-1 text-left flex items-center gap-2">
          <span className="text-[10px] text-text-tertiary font-mono">{step.position}.</span>
          <span className={`text-[13px] ${step.status === 'done' ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>{step.title}</span>
          {step.owner && <span className="text-[9px] uppercase tracking-wider bg-elevated text-text-secondary px-1.5 py-0.5 rounded">{step.owner}</span>}
        </button>
      </div>
      {open && step.checklist?.length > 0 && (
        <ul className="ml-8 mt-2 space-y-0.5">
          {step.checklist.map((c, i) => (
            <li key={i} className="text-[11px] text-text-tertiary flex items-start gap-1.5"><span className="text-accent">○</span>{c}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Automations ──
function Automations() {
  const [data, setData] = useState({ automations: [], trigger_events: [] })
  const [sops, setSops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([api('/automations'), api('/sops')])
      .then(([a, s]) => { setData(a); setSops(s.sops || []) })
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">Automations</h1>
          <p className="text-[12px] text-text-secondary mt-1">Trigger SOP workflows automatically when events fire</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-md text-[12px] font-semibold">
            <Plus size={13} />New Automation
          </button>
        )}
      </div>

      <div className="bg-info/5 border border-info/20 rounded-md p-3 text-[11px] text-info">
        Triggers are recognized event names. To fire one manually for testing, POST to /api/operations/automations/fire. Phase 2 wires automatic triggers from inquiries, invoices, domain monitors, and ticket events.
      </div>

      {showForm && <AutomationForm sops={sops} events={data.trigger_events} onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); load() }} />}

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       data.automations.length === 0 ? <EmptyState icon={Zap} title="No automations yet" description="Create an automation to fire a SOP when an event happens." actionLabel="Create automation" onAction={() => setShowForm(true)} /> : (
        <div className="space-y-2">
          {data.automations.map(a => {
            const sop = sops.find(s => s.id === a.sop_id)
            return (
              <div key={a.id} className="bg-surface border border-border rounded-lg p-4 flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.enabled ? 'bg-success' : 'bg-text-tertiary'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium">{a.name}</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5">
                    When <strong className="text-text-secondary font-mono">{a.trigger_event}</strong> → run <strong className="text-text-secondary">{sop?.title || 'unknown SOP'}</strong>
                  </div>
                  {a.times_triggered > 0 && (
                    <div className="text-[10px] text-text-tertiary mt-0.5">
                      Fired {a.times_triggered} time{a.times_triggered === 1 ? '' : 's'}{a.last_triggered_at ? ` · last ${new Date(a.last_triggered_at).toLocaleString()}` : ''}
                    </div>
                  )}
                </div>
                <button onClick={() => fetch(`/api/operations/automations/${a.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ enabled: !a.enabled }),
                }).then(load)} className={`text-[11px] px-2.5 py-1 rounded ${a.enabled ? 'bg-success/10 text-success' : 'bg-elevated text-text-tertiary'}`}>
                  {a.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button onClick={() => fetch(`/api/operations/automations/${a.id}`, { method: 'DELETE' }).then(load)}
                  className="text-text-tertiary hover:text-error p-1.5">
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function AutomationForm({ sops, events, onCancel, onCreated }) {
  const [form, setForm] = useState({ name: '', trigger_event: events[0] || '', sop_id: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api('/automations', { method: 'POST', body: JSON.stringify(form) })
      onCreated()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="bg-surface border border-accent/30 rounded-xl p-5 space-y-3">
      <h3 className="font-display font-semibold text-[14px]">New Automation</h3>
      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Automation name" required
        className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
      <div className="grid md:grid-cols-2 gap-3">
        <select value={form.trigger_event} onChange={e => setForm({ ...form, trigger_event: e.target.value })}
          className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none">
          {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
        </select>
        <select value={form.sop_id} onChange={e => setForm({ ...form, sop_id: e.target.value })} required
          className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none">
          <option value="">Select SOP to trigger...</option>
          {sops.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </div>
      {error && <Err msg={error} onDismiss={() => setError('')} />}
      <div className="flex items-center gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-2">Cancel</button>
        <button type="submit" disabled={saving}
          className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-[12px] font-semibold">
          {saving ? 'Saving...' : 'Create Automation'}
        </button>
      </div>
    </form>
  )
}

// ── AI Insights ──
function AIInsights() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    setLoading(true); setError(''); setText('')
    try {
      const r = await api('/insights', { method: 'POST' })
      setText(r.text || '')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-[22px]">AI Operations Insights</h1>
          <p className="text-[12px] text-text-secondary mt-1">Bottlenecks, priorities, automation opportunities</p>
        </div>
        <button onClick={run} disabled={loading}
          className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-3 py-2 rounded-md text-[12px] font-semibold">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}Generate
        </button>
      </div>
      {error && <Err msg={error} onDismiss={() => setError('')} />}
      <div className="bg-surface border border-border rounded-lg p-6 min-h-[300px]">
        {loading && !text ? (
          <div className="flex items-center gap-2 py-12 justify-center">
            <Loader2 size={16} className="animate-spin text-accent" /><span className="text-[13px] text-text-tertiary">Analyzing operations…</span>
          </div>
        ) : text ? (
          <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
            {text.split('\n').map((line, i) => {
              if (/^\d+\.\s/.test(line)) return <p key={i} className="font-semibold text-text-primary mt-3 mb-1">{line}</p>
              return line ? <p key={i} className="mb-1.5">{line}</p> : <br key={i} />
            })}
          </div>
        ) : (
          <p className="text-[13px] text-text-tertiary text-center py-12">Click Generate to analyze your operations.</p>
        )}
      </div>
    </div>
  )
}

// ── Audit log ──
function Audit() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/audit').then(d => setEvents(d.events || [])).finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">Audit Logs</h1>
        <p className="text-[12px] text-text-secondary mt-1">Operational audit trail across SOPs, workflows, and automations</p>
      </div>
      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       events.length === 0 ? <EmptyState icon={ScrollText} title="No audit events yet" description="Audit entries appear as SOPs are created, workflows run, and automations fire." /> : (
        <div className="bg-surface border border-border rounded-lg divide-y divide-border">
          {events.map(e => (
            <div key={e.id} className="p-3 flex items-start gap-3 hover:bg-elevated/50 transition-colors">
              <span className="text-[9px] uppercase tracking-wider bg-elevated text-text-tertiary px-1.5 py-0.5 rounded shrink-0 mt-0.5 font-mono">{e.kind}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-text-secondary">{e.summary}</div>
                <div className="text-[10px] text-text-tertiary mt-0.5">{new Date(e.created_at).toLocaleString()}{e.actor ? ` · ${e.actor}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Err({ msg, onDismiss }) {
  return (
    <div className="bg-error/5 border border-error/20 rounded-md px-3 py-2 text-[12px] text-error flex items-center gap-2">
      <AlertCircle size={13} /><span className="flex-1">{msg}</span>
      {onDismiss && <button onClick={onDismiss}><X size={13} /></button>}
    </div>
  )
}
