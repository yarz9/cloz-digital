import { useState } from 'react'
import { FileText, Plus, Search, Clock, CheckCircle, XCircle, Send, Eye, Sparkles } from 'lucide-react'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

const statusColors = { draft: 'bg-elevated text-text-secondary', sent: 'bg-info/10 text-info', viewed: 'bg-accent-muted text-accent', won: 'bg-success/10 text-success', lost: 'bg-error/10 text-error' }
const statusIcons = { draft: Clock, sent: Send, viewed: Eye, won: CheckCircle, lost: XCircle }

export default function Proposals() {
  const proposals = useStore(s => s.proposals)
  const clients = useStore(s => s.clients)
  const leads = useStore(s => s.leads)
  const addProposal = useStore(s => s.addProposal)
  const updateProposal = useStore(s => s.updateProposal)
  const [filter, setFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = proposals.filter(p => filter === 'all' || p.status === filter)
  const totalValue = proposals.filter(p => p.status !== 'lost').reduce((s, p) => s + p.value, 0)
  const wonValue = proposals.filter(p => p.status === 'won').reduce((s, p) => s + p.value, 0)

  const markSent = (id) => updateProposal(id, { status: 'sent', sentDate: new Date().toISOString().slice(0, 10) })
  const markWon = (id) => updateProposal(id, { status: 'won', wonDate: new Date().toISOString().slice(0, 10), winProb: 100 })

  const allContacts = [...clients.map(c => c.name), ...leads.map(l => l.name)]
  const uniqueContacts = [...new Set(allContacts)]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Proposals</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">{proposals.length} proposals · Pipeline: {totalValue} BAM · Won: {wonValue} BAM</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> New Proposal
        </button>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4 flex items-start gap-3">
        <Sparkles size={15} className="text-accent mt-0.5 shrink-0" />
        <div className="text-[12px] text-text-secondary">
          {proposals.filter(p => p.status === 'draft').length > 0 && <><strong className="text-text-primary font-medium">{proposals.filter(p => p.status === 'draft').length} draft(s)</strong> waiting to be sent. </>}
          {proposals.filter(p => p.status === 'viewed').length > 0 && <><strong className="text-text-primary font-medium">{proposals.filter(p => p.status === 'viewed')[0]?.client}</strong> viewed their proposal — consider a follow-up.</>}
        </div>
      </div>

      <div className="flex gap-1">
        {['all', 'draft', 'sent', 'viewed', 'won', 'lost'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`text-[11px] font-medium px-2.5 py-1.5 rounded capitalize transition-colors ${filter === s ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'}`}>
            {s} <span className="ml-1 opacity-60">{s === 'all' ? proposals.length : proposals.filter(p => p.status === s).length}</span>
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-border">
            <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Proposal</th>
            <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Client</th>
            <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Package</th>
            <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Value</th>
            <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Status</th>
            <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(p => {
              const Icon = statusIcons[p.status]
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-elevated/50 transition-colors">
                  <td className="px-4 py-3 text-[13px] font-mono font-medium">{p.id}</td>
                  <td className="px-4 py-3 text-[13px]">{p.client}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{p.package}</td>
                  <td className="px-4 py-3 text-[13px] font-medium">{p.value} BAM</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusColors[p.status]}`}><Icon size={10} />{p.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {p.status === 'draft' && <button onClick={() => markSent(p.id)} className="text-[10px] text-accent hover:text-accent-hover font-medium">Send</button>}
                      {(p.status === 'sent' || p.status === 'viewed') && <button onClick={() => markWon(p.id)} className="text-[10px] text-success hover:text-success/80 font-medium">Mark Won</button>}
                      {(p.status === 'sent' || p.status === 'viewed') && <button onClick={() => updateProposal(p.id, { status: 'lost', winProb: 0 })} className="text-[10px] text-error hover:text-error/80 font-medium">Mark Lost</button>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <AddProposalModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addProposal} contacts={uniqueContacts} />
    </div>
  )
}

function AddProposalModal({ open, onClose, onSubmit, contacts }) {
  const [form, setForm] = useState({ client: '', package: 'Launch Care', value: '', description: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const packageValues = { 'Launch Care': 800, 'Growth Care': 1500, 'Presence Care': 650 }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.client || !form.value) return
    const id = onSubmit({ ...form, value: parseInt(form.value) })
    setSuccess(`Proposal ${id} created for ${form.client}!`)
    setTimeout(() => { setSuccess(''); setForm({ client: '', package: 'Launch Care', value: '', description: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Proposal">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Client" required>
          <Select value={form.client} onChange={e => set('client', e.target.value)}>
            <option value="">Select client or lead...</option>
            {contacts.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Package">
            <Select value={form.package} onChange={e => { set('package', e.target.value); set('value', String(packageValues[e.target.value] || '')) }}>
              <option value="Launch Care">Launch Care</option>
              <option value="Growth Care">Growth Care</option>
              <option value="Presence Care">Presence Care</option>
              <option value="Custom">Custom</option>
            </Select>
          </Field>
          <Field label="Value (BAM)" required>
            <Input type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="800" />
          </Field>
        </div>
        <Field label="Description">
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Scope summary, special terms..." />
        </Field>
        <SubmitButton disabled={!form.client || !form.value}>Create Proposal</SubmitButton>
      </form>
    </Modal>
  )
}
