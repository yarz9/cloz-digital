import { useState } from 'react'
import { CreditCard, CheckCircle2, AlertTriangle, Clock, Plus } from 'lucide-react'
import { useStore } from '@/stores/management'
import Modal, { Field, Input, Select, SubmitButton, SuccessBanner } from '@/components/Modal'

export default function Payments() {
  const invoices = useStore(s => s.invoices)
  const updateInvoice = useStore(s => s.updateInvoice)
  const clients = useStore(s => s.clients)
  const addInvoice = useStore(s => s.addInvoice)
  const [showRecord, setShowRecord] = useState(false)

  const totalPaid = invoices.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0)
  const totalOverdue = invoices.filter(p => p.status === 'overdue').reduce((a, p) => a + p.amount, 0)
  const totalPending = invoices.filter(p => p.status === 'pending' || p.status === 'sent').reduce((a, p) => a + p.amount, 0)

  const markPaid = (id) => updateInvoice(id, { status: 'paid', paid: new Date().toISOString().slice(0, 10) })

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Payments</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Payment tracking and collection management</p>
        </div>
        <button onClick={() => setShowRecord(true)} className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors">
          <Plus size={13} /> Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Collected</span>
          <div className="text-[22px] font-display font-bold text-success mt-1">{totalPaid.toLocaleString()} BAM</div>
          <span className="text-[10px] text-text-tertiary">{invoices.filter(p => p.status === 'paid').length} payments</span>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Overdue</span>
          <div className="text-[22px] font-display font-bold text-error mt-1">{totalOverdue.toLocaleString()} BAM</div>
          <span className="text-[10px] text-text-tertiary">{invoices.filter(p => p.status === 'overdue').length} invoices</span>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <span className="text-[11px] text-text-tertiary">Pending</span>
          <div className="text-[22px] font-display font-bold text-warning mt-1">{totalPending.toLocaleString()} BAM</div>
          <span className="text-[10px] text-text-tertiary">{invoices.filter(p => p.status === 'pending' || p.status === 'sent').length} invoices</span>
        </div>
      </div>

      {/* Payment table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Client</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Invoice</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Amount</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Issued</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Due</th>
              <th className="text-left text-[11px] font-medium text-text-tertiary px-4 py-3">Status</th>
              <th className="text-right text-[11px] font-medium text-text-tertiary px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-elevated/50 transition-colors">
                <td className="px-4 py-3 text-[12px] font-medium">{p.client}</td>
                <td className="px-4 py-3 text-[12px] font-mono text-text-secondary">{p.id}</td>
                <td className="px-4 py-3 text-[12px] font-mono font-medium">{p.amount} BAM</td>
                <td className="px-4 py-3 text-[11px] text-text-tertiary">{p.issued}</td>
                <td className="px-4 py-3 text-[11px] text-text-tertiary">{p.due || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    p.status === 'paid' ? 'bg-success/10 text-success' :
                    p.status === 'overdue' ? 'bg-error/10 text-error' :
                    'bg-warning/10 text-warning'
                  }`}>
                    {p.status === 'paid' && <CheckCircle2 size={9} />}
                    {p.status === 'overdue' && <AlertTriangle size={9} />}
                    {(p.status === 'pending' || p.status === 'sent') && <Clock size={9} />}
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {(p.status === 'pending' || p.status === 'sent' || p.status === 'overdue') && (
                    <button onClick={() => markPaid(p.id)} className="text-[10px] text-success hover:text-success/80 font-medium">Mark Paid</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecordPaymentModal open={showRecord} onClose={() => setShowRecord(false)} clients={clients} onSubmit={addInvoice} />
    </div>
  )
}

function RecordPaymentModal({ open, onClose, clients, onSubmit }) {
  const [form, setForm] = useState({ client: '', amount: '', description: '', due: '' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.client || !form.amount) return
    const id = onSubmit({ ...form, amount: parseInt(form.amount) })
    setSuccess(`Invoice ${id} recorded for ${form.client}!`)
    setTimeout(() => { setSuccess(''); setForm({ client: '', amount: '', description: '', due: '' }); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Client" required>
          <Select value={form.client} onChange={e => {
            set('client', e.target.value)
            const c = clients.find(cl => cl.name === e.target.value)
            if (c?.mrr > 0) set('amount', String(c.mrr))
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
          <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Growth Care — May 2026" />
        </Field>
        <SubmitButton disabled={!form.client || !form.amount}>Record Payment</SubmitButton>
      </form>
    </Modal>
  )
}
