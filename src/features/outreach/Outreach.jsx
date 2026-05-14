import { useState } from 'react'
import { Send, Plus, Mail, Clock, CheckCircle } from 'lucide-react'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

const statusColors = {
  active: 'bg-success/10 text-success',
  paused: 'bg-elevated text-text-tertiary',
  completed: 'bg-info/10 text-info',
}

export default function Outreach() {
  const sequences = useStore(s => s.sequences)
  const addSequence = useStore(s => s.addSequence)
  const leads = useStore(s => s.leads)
  const [showAdd, setShowAdd] = useState(false)

  const totalLeads = sequences.reduce((s, sq) => s + sq.leads, 0)
  const totalSent = sequences.reduce((s, sq) => s + sq.sent, 0)
  const totalReplied = sequences.reduce((s, sq) => s + sq.replied, 0)
  const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Outreach</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Manage outreach sequences and track responses</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> New Sequence
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Total Leads</span>
          <div className="text-[20px] font-display font-bold mt-1">{totalLeads}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Messages Sent</span>
          <div className="text-[20px] font-display font-bold mt-1">{totalSent}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Replies</span>
          <div className="text-[20px] font-display font-bold mt-1 text-success">{totalReplied}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Reply Rate</span>
          <div className="text-[20px] font-display font-bold mt-1">{replyRate}%</div>
        </div>
      </div>

      {/* Sequences */}
      <div className="bg-surface border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-[14px] font-semibold">Sequences</h2>
        </div>
        <div className="divide-y divide-border">
          {sequences.map(s => (
            <div key={s.id} className="px-4 py-3 flex items-center justify-between hover:bg-elevated/50 transition-colors">
              <div>
                <span className="text-[13px] font-medium">{s.name}</span>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-text-tertiary">
                  <span>{s.channel}</span><span>&middot;</span>
                  <span>{s.leads} leads</span><span>&middot;</span>
                  <span>{s.sent} sent</span><span>&middot;</span>
                  <span className="text-success">{s.replied} replied</span>
                  {s.lastSent && <><span>&middot;</span><span>Last: {s.lastSent}</span></>}
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusColors[s.status]}`}>{s.status}</span>
            </div>
          ))}
          {sequences.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-[13px] text-text-tertiary mb-3">No sequences yet</p>
              <button onClick={() => setShowAdd(true)} className="text-[12px] text-accent hover:text-accent-hover font-medium">Create your first sequence</button>
            </div>
          )}
        </div>
      </div>

      <AddSequenceModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addSequence} leads={leads} />
    </div>
  )
}

function AddSequenceModal({ open, onClose, onSubmit, leads }) {
  const [form, setForm] = useState({ name: '', niche: '', channel: 'Email', message: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const niches = [...new Set(leads.map(l => l.niche).filter(Boolean))]

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.channel) return
    onSubmit(form)
    setSuccess(`Sequence "${form.name}" created!`)
    setTimeout(() => { setSuccess(''); setForm({ name: '', niche: '', channel: 'Email', message: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Outreach Sequence">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Sequence Name" required>
          <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dental Clinics — No Website" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Target Niche">
            <Select value={form.niche} onChange={e => set('niche', e.target.value)}>
              <option value="">All niches</option>
              {niches.map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label="Channel" required>
            <Select value={form.channel} onChange={e => set('channel', e.target.value)}>
              <option value="Email">Email</option>
              <option value="DM">DM (Instagram/Facebook)</option>
              <option value="Phone">Phone Call</option>
              <option value="WhatsApp">WhatsApp</option>
            </Select>
          </Field>
        </div>
        <Field label="Opening Message Template" hint="Use {name} for lead name">
          <Textarea value={form.message} onChange={e => set('message', e.target.value)} rows={4} placeholder="Hi {name}, I came across your business and noticed..." />
        </Field>
        <SubmitButton disabled={!form.name}>Create Sequence</SubmitButton>
      </form>
    </Modal>
  )
}
