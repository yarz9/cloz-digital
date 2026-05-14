import { useState, useEffect } from 'react'
import {
  Users, Plus, Search, Globe, Shield, AlertTriangle, TrendingUp,
  ChevronRight, ExternalLink, Calendar, Receipt, Wrench, FileText,
  X, Star, Server, Clock, Sparkles, Loader2, CheckCircle
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

export default function Clients() {
  const clients = useStore(s => s.clients)
  const addClient = useStore(s => s.addClient)
  const [selectedClient, setSelectedClient] = useState(null)
  const [search, setSearch] = useState('')
  const [packageFilter, setPackageFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (packageFilter !== 'all' && c.package !== packageFilter) return false
    return true
  })

  const totalMrr = clients.reduce((s, c) => s + c.mrr, 0)

  if (selectedClient) {
    return <ClientProfile client={selectedClient} onBack={() => setSelectedClient(null)} />
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Clients</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">{clients.length} clients · MRR: {totalMrr} BAM</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> Add Client
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients..." className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none" />
        </div>
        <select value={packageFilter} onChange={e => setPackageFilter(e.target.value)} className="bg-surface border border-border rounded-md px-3 py-2 text-[13px] text-text-secondary focus:border-accent focus:outline-none">
          <option value="all">All Packages</option>
          <option value="Launch Care">Launch Care</option>
          <option value="Growth Care">Growth Care</option>
          <option value="Presence Care">Presence Care</option>
        </select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <button key={c.id} onClick={() => setSelectedClient(c)} className="text-left bg-surface border border-border rounded-lg p-5 hover:border-border-strong transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div><h3 className="text-[14px] font-semibold">{c.name}</h3><p className="text-[11px] text-text-tertiary mt-0.5">{c.contact}</p></div>
              <HealthBadge score={c.healthScore} />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${c.package === 'Growth Care' ? 'bg-accent-muted text-accent' : c.package === 'Presence Care' ? 'bg-success/10 text-success' : 'bg-elevated text-text-secondary'}`}>{c.package}</span>
              {c.status === 'at-risk' && <span className="text-[10px] font-medium px-1.5 py-0.5 bg-error/10 text-error rounded">AT RISK</span>}
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border text-center">
              <div><span className="text-[10px] text-text-tertiary block">MRR</span><span className="text-[13px] font-medium">{c.mrr > 0 ? `${c.mrr}` : '—'}</span></div>
              <div><span className="text-[10px] text-text-tertiary block">Edits</span><span className="text-[13px] font-medium">{c.editsTotal > 0 ? `${c.editsUsed}/${c.editsTotal}` : '—'}</span></div>
              <div><span className="text-[10px] text-text-tertiary block">Revenue</span><span className="text-[13px] font-medium">{c.totalRevenue}</span></div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-[13px] text-text-tertiary mb-3">No clients found</p>
          <button onClick={() => setShowAdd(true)} className="text-[12px] text-accent hover:text-accent-hover font-medium">Add your first client</button>
        </div>
      )}

      <AddClientModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addClient} />
    </div>
  )
}

function AddClientModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', package: 'Launch Care', mrr: 0, website: '', hosting: '', domain: '', notes: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const packageMrr = { 'Launch Care': 0, 'Growth Care': 325, 'Presence Care': 217 }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.contact || !form.email) return
    onSubmit({ ...form, mrr: parseInt(form.mrr) || packageMrr[form.package] || 0 })
    setSuccess(`Client "${form.name}" added successfully!`)
    setTimeout(() => { setSuccess(''); setForm({ name: '', contact: '', email: '', phone: '', package: 'Launch Care', mrr: 0, website: '', hosting: '', domain: '', notes: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Client" wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Business Name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Brava Interiors" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Person" required><Input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="Full name" /></Field>
          <Field label="Email" required><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@domain.com" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone"><Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+387..." /></Field>
          <Field label="Package">
            <Select value={form.package} onChange={e => { set('package', e.target.value); set('mrr', String(packageMrr[e.target.value] || 0)) }}>
              <option value="Launch Care">Launch Care (one-time)</option>
              <option value="Growth Care">Growth Care (325 BAM/mo)</option>
              <option value="Presence Care">Presence Care (217 BAM/mo)</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Website"><Input value={form.website} onChange={e => set('website', e.target.value)} placeholder="domain.ba" /></Field>
          <Field label="Hosting"><Input value={form.hosting} onChange={e => set('hosting', e.target.value)} placeholder="e.g. Hetzner" /></Field>
          <Field label="Domain Registrar"><Input value={form.domain} onChange={e => set('domain', e.target.value)} placeholder="e.g. Namecheap" /></Field>
        </div>
        <Field label="Notes"><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any initial notes..." /></Field>
        <SubmitButton disabled={!form.name || !form.contact || !form.email}>Add Client</SubmitButton>
      </form>
    </Modal>
  )
}

function ClientProfile({ client: c, onBack }) {
  const updateClient = useStore(s => s.updateClient)
  const [tab, setTab] = useState('overview')
  const tabs = ['overview', 'hosting', 'notes']
  const summaryAI = useAI(ai.clientSummary)
  const [summaryText, setSummaryText] = useState('')
  const [noteText, setNoteText] = useState(c.notes || '')
  const [noteSaved, setNoteSaved] = useState(false)

  useEffect(() => {
    summaryAI.run({ clientName: c.name, package: c.package, mrr: String(c.mrr), since: c.since, healthScore: String(c.healthScore), editsUsed: String(c.editsUsed), editsTotal: String(c.editsTotal), openInvoices: String(c.invoicesTotal - c.invoicesPaid), notes: c.notes }).then(res => { if (res?.text) setSummaryText(res.text) })
  }, [c.id])

  const saveNote = () => {
    updateClient(c.id, { notes: noteText })
    setNoteSaved(true)
    setTimeout(() => setNoteSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-[12px] text-text-tertiary hover:text-text-secondary transition-colors">&larr; Back to clients</button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-[24px]">{c.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-[12px] text-text-secondary">
            <span>{c.contact}</span><span>·</span><span>{c.email}</span><span>·</span>
            <span className={`font-medium ${c.package === 'Growth Care' ? 'text-accent' : c.package === 'Presence Care' ? 'text-success' : 'text-text-secondary'}`}>{c.package}</span>
          </div>
        </div>
        <HealthBadge score={c.healthScore} large />
      </div>
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="MRR" value={c.mrr > 0 ? `${c.mrr} BAM` : 'One-time'} />
        <StatCard label="Total Revenue" value={`${c.totalRevenue} BAM`} />
        <StatCard label="Invoices" value={`${c.invoicesPaid}/${c.invoicesTotal} paid`} />
        <StatCard label="Edits Used" value={c.editsTotal > 0 ? `${c.editsUsed}/${c.editsTotal}` : 'N/A'} />
        <StatCard label="Client Since" value={c.since ? new Date(c.since).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'New'} />
      </div>
      <div className="border-b border-border flex gap-5">
        {tabs.map(t => (<button key={t} onClick={() => setTab(t)} className={`pb-2.5 text-[13px] font-medium capitalize border-b-2 transition-colors ${tab === t ? 'text-accent border-accent' : 'text-text-tertiary border-transparent hover:text-text-secondary'}`}>{t}</button>))}
      </div>
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-[13px] font-semibold flex items-center gap-2"><Globe size={14} className="text-accent" /> Website</h3>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-text-tertiary">URL</span><span className="text-accent">{c.website || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">Hosting</span><span>{c.hosting || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">Domain Registrar</span><span>{c.domain || '—'}</span></div>
            </div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
            <h3 className="text-[13px] font-semibold flex items-center gap-2"><Shield size={14} className="text-accent" /> Renewals</h3>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-text-tertiary">Domain Expiry</span><span>{c.domainExpiry || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">SSL Expiry</span><span>{c.sslExpiry || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">Last Maintenance</span><span>{c.lastMaintenance || '—'}</span></div>
            </div>
          </div>
          <div className="md:col-span-2 bg-surface border border-accent/20 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3"><Sparkles size={14} className="text-accent" /><h3 className="text-[13px] font-semibold">AI Summary</h3></div>
            <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-line">
              {summaryAI.loading ? <span className="flex items-center gap-2 text-text-tertiary"><Loader2 size={12} className="animate-spin" /> Analyzing...</span> : summaryText || <span className="text-text-tertiary">No summary available.</span>}
            </div>
          </div>
        </div>
      )}
      {tab === 'hosting' && (
        <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
          <h3 className="text-[13px] font-semibold">Hosting & Domain Details</h3>
          <div className="grid grid-cols-2 gap-4 text-[13px]">
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-text-tertiary">Hosting Provider</span><span>{c.hosting || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">Domain Registrar</span><span>{c.domain || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">Domain</span><span className="font-mono">{c.website || '—'}</span></div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-text-tertiary">Domain Expires</span><span>{c.domainExpiry || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">SSL Expires</span><span>{c.sslExpiry || '—'}</span></div>
              <div className="flex justify-between"><span className="text-text-tertiary">Status</span><span className="text-success font-medium">Active</span></div>
            </div>
          </div>
        </div>
      )}
      {tab === 'notes' && (
        <div className="space-y-3">
          {noteSaved && <SuccessBanner message="Notes saved!" />}
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add notes..." className="w-full bg-surface border border-border rounded-lg p-4 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none resize-none h-32" />
          <button onClick={saveNote} className="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-md text-[12px] font-medium transition-colors flex items-center gap-1.5"><CheckCircle size={13} /> Save Notes</button>
        </div>
      )}
    </div>
  )
}

function HealthBadge({ score, large }) {
  const color = score >= 90 ? 'text-success' : score >= 75 ? 'text-warning' : 'text-error'
  return (<div className={`flex flex-col items-center ${large ? 'gap-1' : 'gap-0.5'}`}><span className={`font-mono font-bold ${color} ${large ? 'text-[24px]' : 'text-[14px]'}`}>{score}</span><span className={`text-text-tertiary ${large ? 'text-[11px]' : 'text-[9px]'}`}>health</span></div>)
}

function StatCard({ label, value }) {
  return (<div className="bg-surface border border-border rounded-md p-3"><span className="text-[10px] text-text-tertiary uppercase tracking-wider">{label}</span><div className="mt-1 text-[14px] font-medium">{value}</div></div>)
}
