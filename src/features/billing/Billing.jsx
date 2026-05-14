import { useState, useEffect } from 'react'
import {
  Receipt, Plus, Search, TrendingUp, AlertTriangle, Clock,
  Sparkles, Loader2
} from 'lucide-react'
import { ai } from '@/lib/api'
import { useAI } from '@/hooks/useAI'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'

const statusColors = {
  paid: 'bg-success/10 text-success',
  sent: 'bg-info/10 text-info',
  pending: 'bg-warning/10 text-warning',
  overdue: 'bg-error/10 text-error',
  draft: 'bg-elevated text-text-secondary',
  cancelled: 'bg-elevated text-text-tertiary',
}

export default function Billing() {
  const invoices = useStore(s => s.invoices)
  const addInvoice = useStore(s => s.addInvoice)
  const updateInvoice = useStore(s => s.updateInvoice)
  const clients = useStore(s => s.clients)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const filtered = invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (search && !inv.client.toLowerCase().includes(search.toLowerCase()) && !inv.id.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'pending' || i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0)
  const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const mrr = clients.filter(c => c.mrr > 0).reduce((s, c) => s + c.mrr, 0)

  const stats = [
    { label: 'Outstanding', value: `${outstanding} BAM`, color: 'text-warning', icon: Clock },
    { label: 'Overdue', value: `${overdue} BAM`, color: 'text-error', icon: AlertTriangle },
    { label: 'Collected', value: `${collected} BAM`, color: 'text-success', icon: TrendingUp },
    { label: 'MRR', value: `${mrr} BAM`, color: 'text-accent', icon: Receipt },
  ]

  const billingAI = useAI(ai.generate)
  const [billingInsight, setBillingInsight] = useState('')

  useEffect(() => {
    billingAI.run(
      `You are a billing assistant for Cloz Digital, a web design agency in Bosnia. Analyze this billing snapshot and give a brief 2-sentence insight with actionable advice:
- Outstanding: ${outstanding} BAM
- Overdue: ${overdue} BAM
- Collected: ${collected} BAM
- MRR: ${mrr} BAM
- Total invoices: ${invoices.length}, ${invoices.filter(i => i.status === 'paid').length} paid, ${invoices.filter(i => i.status === 'overdue').length} overdue
Be direct and specific. No markdown.`,
      0.3
    ).then(res => {
      if (res?.text) setBillingInsight(res.text)
    })
  }, [])

  const markPaid = (id) => updateInvoice(id, { status: 'paid', paid: new Date().toISOString().slice(0, 10) })

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-[20px]">Billing</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-text-tertiary">{s.label}</span>
              <s.icon size={14} className={s.color} strokeWidth={1.5} />
            </div>
            <span className="text-[20px] font-display font-bold">{s.value}</span>
          </div>
        ))}
      </div>

      {/* AI Billing Insight */}
      <div className="bg-surface border border-border rounded-lg p-4 flex items-start gap-3">
        <Sparkles size={15} className="text-accent mt-0.5 shrink-0" />
        <div className="text-[12px] text-text-secondary">
          {billingAI.loading ? (
            <span className="flex items-center gap-2 text-text-tertiary"><Loader2 size={12} className="animate-spin" /> Analyzing billing data...</span>
          ) : billingInsight ? (
            billingInsight
          ) : billingAI.error ? (
            <span className="text-error">Could not generate insight: {billingAI.error}</span>
          ) : (
            <span className="text-text-tertiary">No billing insight available.</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoices..."
            className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'draft', 'pending', 'sent', 'paid', 'overdue'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[11px] font-medium px-2.5 py-1.5 rounded transition-colors capitalize ${
                statusFilter === s ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
              }`}
            >
              {s}
              <span className="ml-1 opacity-60">{s === 'all' ? invoices.length : invoices.filter(i => i.status === s).length}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Invoice table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Invoice</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Client</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Description</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Amount</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Status</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Issued</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Due</th>
              <th className="text-right text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => (
              <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-3 text-[13px] font-mono font-medium">{inv.id}</td>
                <td className="px-4 py-3 text-[13px]">{inv.client}</td>
                <td className="px-4 py-3 text-[12px] text-text-secondary truncate max-w-[200px]">{inv.description}</td>
                <td className="px-4 py-3 text-[13px] font-medium">{inv.amount} BAM</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusColors[inv.status]}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-[12px] text-text-secondary">{inv.issued}</td>
                <td className="px-4 py-3 text-[12px] text-text-secondary">{inv.due}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    {(inv.status === 'pending' || inv.status === 'sent' || inv.status === 'overdue') && (
                      <button onClick={() => markPaid(inv.id)} className="text-[10px] text-success hover:text-success/80 font-medium">Mark Paid</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[13px] text-text-tertiary">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AddInvoiceModal open={showAdd} onClose={() => setShowAdd(false)} onSubmit={addInvoice} clients={clients} />
    </div>
  )
}

function AddInvoiceModal({ open, onClose, onSubmit, clients }) {
  const [form, setForm] = useState({ client: '', amount: '', due: '', description: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.client || !form.amount) return
    const id = onSubmit({ ...form, amount: parseInt(form.amount) })
    setSuccess(`Invoice ${id} created for ${form.client}!`)
    setTimeout(() => { setSuccess(''); setForm({ client: '', amount: '', due: '', description: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="New Invoice">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Client" required>
          <Select value={form.client} onChange={e => {
            set('client', e.target.value)
            const c = clients.find(cl => cl.name === e.target.value)
            if (c && c.mrr > 0) set('amount', String(c.mrr))
          }}>
            <option value="">Select client...</option>
            {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (BAM)" required>
            <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="250" />
          </Field>
          <Field label="Due Date">
            <Input type="date" value={form.due} onChange={e => set('due', e.target.value)} />
          </Field>
        </div>
        <Field label="Description">
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="e.g. Presence Care — May 2026" />
        </Field>
        <SubmitButton disabled={!form.client || !form.amount}>Create Invoice</SubmitButton>
      </form>
    </Modal>
  )
}
