import { useState, useEffect, useCallback } from 'react'
import {
  Scale, FileText, Sparkles, Cookie, UserCheck, History, Loader2,
  AlertCircle, X, Plus, Copy, Check, Download, ExternalLink,
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'

// ══════════════════════════════════════════════════════════════
//  LEGAL & COMPLIANCE — admin view
// ══════════════════════════════════════════════════════════════

async function api(path, options = {}) {
  const res = await fetch(`/api/legal${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const json = await res.json().catch(() => ({ error: 'Network error' }))
  if (!res.ok) throw new Error(json.error || `Server returned ${res.status}`)
  return json
}

const TABS = [
  { key: 'pages',     label: 'Legal Pages',       icon: FileText },
  { key: 'templates', label: 'Business Templates',icon: Scale },
  { key: 'generator', label: 'Client Generator',  icon: Sparkles },
  { key: 'consent',   label: 'Cookie Consent',    icon: Cookie },
  { key: 'requests',  label: 'Privacy Requests',  icon: UserCheck },
  { key: 'documents', label: 'Generated Docs',    icon: History },
]

export default function Legal() {
  const [tab, setTab] = useState('pages')

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-[220px] shrink-0 bg-surface border-r border-border overflow-y-auto p-3">
        <div className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.15em] mb-3 px-2">Legal & Compliance</div>
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
        {tab === 'pages'     && <Templates category="public" title="Public Legal Pages" subtitle="Privacy Policy, Terms, Cookie Policy, Disclaimer" />}
        {tab === 'templates' && <Templates category="business" title="Business Templates" subtitle="MSA, NDA, Maintenance Agreement, Support SLA" />}
        {tab === 'generator' && <Generator />}
        {tab === 'consent'   && <Consents />}
        {tab === 'requests'  && <PrivacyRequests />}
        {tab === 'documents' && <GeneratedDocs />}
      </div>
    </div>
  )
}

// ── Templates editor ──
function Templates({ category, title, subtitle }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api(`/templates?category=${category}`).then(d => setTemplates(d.templates || [])).finally(() => setLoading(false))
  }, [category])
  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">{title}</h1>
        <p className="text-[12px] text-text-secondary mt-1">{subtitle}</p>
      </div>

      {selected && <TemplateEditor slug={selected} onClose={() => setSelected(null)} onSaved={load} />}

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       templates.length === 0 ? <EmptyState icon={FileText} title="No templates yet" description="Seed should run on boot. Restart the server if missing." /> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {templates.map(t => (
            <button key={t.id} onClick={() => setSelected(t.slug)}
              className="bg-surface hover:bg-elevated border border-border rounded-lg p-5 text-left transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-semibold text-[15px]">{t.title}</h3>
                <span className="text-[10px] font-mono bg-elevated text-text-tertiary px-1.5 py-0.5 rounded">v{t.version}</span>
              </div>
              <p className="text-[11px] text-text-tertiary">
                {t.effective_date ? `Effective ${t.effective_date}` : 'No effective date set'}
              </p>
              {category === 'public' && (
                <a href={`/${t.slug}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="text-[11px] text-accent hover:text-accent-hover mt-2 inline-flex items-center gap-1">
                  View live page <ExternalLink size={10} />
                </a>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateEditor({ slug, onClose, onSaved }) {
  const [tpl, setTpl] = useState(null)
  const [body, setBody] = useState('')
  const [changeNote, setChangeNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api(`/templates/${slug}`).then(t => { setTpl(t); setBody(t.body) }).catch(e => setError(e.message))
  }, [slug])

  const save = async () => {
    if (!body.trim()) return setError('Body cannot be empty')
    setSaving(true)
    setError('')
    try {
      await api(`/templates/${slug}`, { method: 'PATCH', body: JSON.stringify({ body, change_note: changeNote }) })
      onSaved()
      onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg border border-border rounded-xl max-w-[900px] w-full max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-display font-bold text-[17px]">{tpl?.title || '...'}</h2>
            {tpl && <p className="text-[11px] text-text-tertiary mt-0.5">v{tpl.version} · effective {tpl.effective_date}</p>}
          </div>
          <button onClick={onClose}><X size={16} className="text-text-tertiary" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {error && <div className="bg-error/5 border border-error/20 rounded-md p-2 text-[12px] text-error">{error}</div>}
          <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Markdown body — supports {`{{effective_date}}`} placeholder</div>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={22}
            className="w-full bg-elevated border border-border rounded-md p-3 text-[12px] font-mono focus:border-accent focus:outline-none resize-none" />
          <input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="Change note (saved with previous version)"
            className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[12px] focus:border-accent focus:outline-none" />
        </div>
        <div className="p-5 border-t border-border flex items-center justify-between">
          <button onClick={() => { navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="text-[11px] text-text-tertiary hover:text-text-primary flex items-center gap-1">
            {copied ? <Check size={11} /> : <Copy size={11} />}Copy markdown
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-[12px] text-text-tertiary hover:text-text-primary px-3 py-2">Cancel</button>
            <button onClick={save} disabled={saving}
              className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-md text-[12px] font-semibold">
              {saving ? 'Saving...' : 'Save new version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Client Legal Generator ──
function Generator() {
  const [form, setForm] = useState({
    document_type: 'privacy_policy', business_name: '', business_url: '',
    country: 'Bosnia and Herzegovina', industry: '', contact_email: '',
    has_ecommerce: false, has_newsletter: false, has_booking: false,
    uses_analytics: false, uses_marketing_pixels: false,
  })
  const [generated, setGenerated] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!form.business_name.trim()) return setError('Business name required')
    setLoading(true); setError(''); setGenerated('')
    try {
      const r = await api('/client-generate', { method: 'POST', body: JSON.stringify(form) })
      setGenerated(r.text || '')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">Client Legal Generator</h1>
        <p className="text-[12px] text-text-secondary mt-1">AI-generated legal documents customized to a client's business and practices</p>
      </div>

      <div className="bg-info/5 border border-info/20 rounded-md p-3 text-[11px] text-info">
        Generated documents are templates. They reduce risk and improve compliance but are not a substitute for qualified legal advice.
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
          <h3 className="font-display font-semibold text-[14px]">Inputs</h3>
          <Field label="Document Type">
            <select value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}
              className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none">
              <option value="privacy_policy">Privacy Policy</option>
              <option value="cookie_policy">Cookie Policy</option>
              <option value="terms_of_service">Terms of Service</option>
              <option value="refund_policy">Refund Policy</option>
              <option value="disclaimer">Disclaimer</option>
            </select>
          </Field>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Business Name" required>
              <input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} required
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
            </Field>
            <Field label="Website">
              <input value={form.business_url} onChange={e => setForm({ ...form, business_url: e.target.value })} placeholder="https://"
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
            </Field>
            <Field label="Industry">
              <input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. Dental clinic, Restaurant"
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
            </Field>
            <Field label="Country">
              <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
            </Field>
            <Field label="Contact Email">
              <input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="info@business.com"
                className="w-full bg-elevated border border-border rounded-md px-3 py-2 text-[13px] focus:border-accent focus:outline-none" />
            </Field>
          </div>
          <div className="pt-2 border-t border-border space-y-2">
            <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Data practices</div>
            {[
              ['has_ecommerce', 'E-commerce (collects payment info)'],
              ['has_newsletter', 'Newsletter / email marketing'],
              ['has_booking', 'Booking / appointment system'],
              ['uses_analytics', 'Uses analytics (Google Analytics, etc.)'],
              ['uses_marketing_pixels', 'Uses marketing pixels (Meta, Google Ads)'],
            ].map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-[12px] text-text-secondary">
                <input type="checkbox" checked={form[k]} onChange={e => setForm({ ...form, [k]: e.target.checked })}
                  className="accent-accent" />
                {l}
              </label>
            ))}
          </div>
          {error && <div className="bg-error/5 border border-error/20 rounded-md p-2 text-[12px] text-error">{error}</div>}
          <button onClick={generate} disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white py-2.5 rounded-md text-[13px] font-semibold">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {loading ? 'Generating…' : 'Generate Document'}
          </button>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-[14px]">Output</h3>
            {generated && (
              <button onClick={() => { navigator.clipboard.writeText(generated); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="text-[11px] text-accent hover:text-accent-hover flex items-center gap-1">
                {copied ? <Check size={11} /> : <Copy size={11} />}Copy
              </button>
            )}
          </div>
          {loading ? (
            <div className="py-16 flex items-center gap-2 justify-center text-text-tertiary text-[12px]">
              <Loader2 size={14} className="animate-spin text-accent" />Generating…
            </div>
          ) : generated ? (
            <pre className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap font-mono max-h-[480px] overflow-y-auto bg-elevated rounded-md p-3">{generated}</pre>
          ) : (
            <p className="text-[12px] text-text-tertiary text-center py-12">Fill in the inputs and click Generate.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Consent log ──
function Consents() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/consents/summary').then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div>

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">Cookie Consent Log</h1>
        <p className="text-[12px] text-text-secondary mt-1">Anonymous record of preferences captured via the public banner</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <KPI label="Total Recorded" value={data?.total || 0} />
        <KPI label="Analytics Opt-in" value={data?.analytics || 0} pct={data?.total ? Math.round((data.analytics / data.total) * 100) : 0} />
        <KPI label="Marketing Opt-in" value={data?.marketing || 0} pct={data?.total ? Math.round((data.marketing / data.total) * 100) : 0} />
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-border">
              {['Visitor', 'Analytics', 'Marketing', 'Version', 'When'].map(h => <th key={h} className="text-left text-[10px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {data?.recent?.map(c => (
              <tr key={c.id} className="border-b border-border/50 hover:bg-elevated/50">
                <td className="px-4 py-3 text-[11px] font-mono text-text-secondary">{c.visitor_id.slice(0, 16)}…</td>
                <td className="px-4 py-3"><Pill on={c.analytics === 1} /></td>
                <td className="px-4 py-3"><Pill on={c.marketing === 1} /></td>
                <td className="px-4 py-3 text-[11px] text-text-tertiary">{c.policy_version}</td>
                <td className="px-4 py-3 text-[11px] text-text-tertiary">{new Date(c.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {!data?.recent?.length && <tr><td colSpan="5" className="py-8 text-center text-[12px] text-text-tertiary">No consents recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Pill({ on }) {
  return (
    <span className={`text-[10px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded ${on ? 'bg-success/10 text-success' : 'bg-elevated text-text-tertiary'}`}>
      {on ? 'opt-in' : 'opt-out'}
    </span>
  )
}

function KPI({ label, value, pct }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</div>
      <div className="text-[22px] font-display font-bold">{value}</div>
      {pct != null && <div className="text-[10px] text-text-tertiary">{pct}% of all consents</div>}
    </div>
  )
}

// ── Privacy requests ──
function PrivacyRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api('/privacy-requests').then(d => setRequests(d.requests || [])).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const setStatus = async (id, status) => {
    try {
      await api(`/privacy-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      load()
    } catch {}
  }

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">Privacy Requests</h1>
        <p className="text-[12px] text-text-secondary mt-1">Data subject requests (access, export, deletion). Respond within 30 days.</p>
      </div>

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       requests.length === 0 ? <EmptyState icon={UserCheck} title="No privacy requests" description="When someone submits a privacy request, it appears here." /> : (
        <div className="space-y-2">
          {requests.map(r => (
            <div key={r.id} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{r.name || r.email}</span>
                    <span className="text-[9px] uppercase tracking-wider bg-accent-muted text-accent px-1.5 py-0.5 rounded">{r.kind}</span>
                  </div>
                  <div className="text-[11px] text-text-tertiary">{r.email} · {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <select value={r.status} onChange={e => setStatus(r.id, e.target.value)}
                  className="bg-elevated border border-border rounded-md px-2 py-1 text-[11px] focus:border-accent focus:outline-none">
                  <option value="new">New</option><option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option><option value="rejected">Rejected</option>
                </select>
              </div>
              {r.message && <p className="text-[12px] text-text-secondary leading-relaxed mt-2 bg-elevated rounded-md p-2 whitespace-pre-wrap">{r.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Generated client documents ──
function GeneratedDocs() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    api('/documents').then(d => setDocs(d.documents || [])).finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-[22px]">Generated Client Documents</h1>
        <p className="text-[12px] text-text-secondary mt-1">Documents created via the Client Generator</p>
      </div>

      {selected && <DocViewer id={selected} onClose={() => setSelected(null)} onDeleted={() => { setSelected(null); load() }} />}

      {loading ? <div className="py-12 flex justify-center"><Loader2 size={20} className="animate-spin text-accent" /></div> :
       docs.length === 0 ? <EmptyState icon={History} title="No generated documents yet" description="Use the Client Generator to create your first AI-customized legal document." /> : (
        <div className="space-y-2">
          {docs.map(d => (
            <button key={d.id} onClick={() => setSelected(d.id)}
              className="w-full bg-surface hover:bg-elevated border border-border rounded-lg p-4 text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[13px] font-medium">{d.title}</div>
                  <div className="text-[10px] text-text-tertiary mt-0.5 capitalize">{d.template_slug?.replace(/_/g, ' ')} · {new Date(d.created_at).toLocaleString()}</div>
                </div>
                <ExternalLink size={12} className="text-text-tertiary" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function DocViewer({ id, onClose, onDeleted }) {
  const [doc, setDoc] = useState(null)
  useEffect(() => { api(`/documents/${id}`).then(setDoc) }, [id])
  const remove = async () => {
    if (!confirm('Delete this generated document?')) return
    await api(`/documents/${id}`, { method: 'DELETE' })
    onDeleted()
  }
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-bg border border-border rounded-xl max-w-[820px] w-full max-h-[88vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-display font-bold text-[16px]">{doc?.title || '...'}</h2>
          <button onClick={onClose}><X size={16} className="text-text-tertiary" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {!doc ? <Loader2 size={20} className="animate-spin text-accent mx-auto" /> :
            <pre className="text-[12px] text-text-secondary leading-relaxed whitespace-pre-wrap font-mono">{doc.body}</pre>
          }
        </div>
        <div className="p-5 border-t border-border flex items-center justify-between">
          <button onClick={remove} className="text-[11px] text-error hover:text-error/80">Delete</button>
          <button onClick={() => doc && navigator.clipboard.writeText(doc.body)} className="text-[12px] text-accent hover:text-accent-hover">Copy markdown</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-[10px] text-text-tertiary uppercase tracking-wider block mb-1">
        {label}{required && <span className="text-accent ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
