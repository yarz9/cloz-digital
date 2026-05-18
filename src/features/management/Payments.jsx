// Payments — PostgreSQL-backed via /api/finance/payments.
// Phase 2 of the Revenue migration. The old view conflated invoices
// and payments; this view is now a proper payments ledger that
// records receipts (with method/reference) and can auto-flip the
// linked invoice to paid when fully covered.

import { useMemo, useState } from 'react'
import { CreditCard, CheckCircle2, AlertTriangle, Clock, Plus, Trash2, Loader2 } from 'lucide-react'
import Modal, { Field, Input, Select, SubmitButton, SuccessBanner } from '@/components/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useRevenueOverview, usePayments, useInvoices,
  useRecordPayment, useDeletePayment,
} from '@/hooks/queries/finance'
import { usePortalClients } from '@/hooks/queries/portalClients'

const METHODS = ['bank_transfer','card','cash','viber','crypto','other']

export default function Payments() {
  const toast = useToast()
  const overviewQuery = useRevenueOverview()
  const paymentsQuery = usePayments()
  const invoicesQuery = useInvoices()
  const clientsQuery  = usePortalClients()
  const recordPayment = useRecordPayment()
  const deletePayment = useDeletePayment()

  const [showRecord, setShowRecord] = useState(false)

  const overview = overviewQuery.data
  const payments = paymentsQuery.data?.payments || []
  const invoices = invoicesQuery.data?.invoices || []
  const portalClients = clientsQuery.data?.clients || []

  const tiles = [
    { label: 'Collected',  value: overview?.paid_total,         color: 'text-success', sub: `${overview?.counts?.payments || 0} payments` },
    { label: 'Overdue',    value: overview?.overdue_total,      color: 'text-error',   sub: `${overview?.by_status?.overdue || 0} invoices` },
    { label: 'Outstanding',value: overview?.outstanding_total,  color: 'text-warning', sub: `${(overview?.by_status?.pending || 0) + (overview?.by_status?.sent || 0)} open` },
  ]

  const removePayment = async (p) => {
    if (!confirm('Delete this payment? If it covered an invoice, the invoice will flip back to pending.')) return
    try {
      await deletePayment.mutateAsync(p.id)
      toast.success('Payment deleted')
    } catch (e) { toast.error('Delete failed', { description: e.message }) }
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-[20px]">Payments</h1>
          <p className="text-[12px] text-text-secondary mt-0.5">Payment tracking and collection management</p>
        </div>
        <button onClick={() => setShowRecord(true)}
          className="button-premium !py-1.5 !px-3 focus-ring">
          <Plus size={13} /> Record Payment
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {overviewQuery.isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-premium space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-2 w-20" />
              </div>
            ))
          : tiles.map(t => (
              <div key={t.label} className="card-premium hover-lift">
                <span className="text-[11px] text-text-tertiary uppercase tracking-wider">{t.label}</span>
                <div className={`text-[22px] font-display font-bold mt-1 ${t.color}`}>
                  {(t.value || 0).toLocaleString()} BAM
                </div>
                <span className="text-[10px] text-text-tertiary">{t.sub}</span>
              </div>
            ))}
      </div>

      {/* Payments table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-elevated/40">
              <Th>Client</Th><Th>Linked invoice</Th><Th>Amount</Th>
              <Th>Method</Th><Th>Received</Th><Th>Reference</Th><Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {paymentsQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-3/4" /></td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center">
                <CreditCard size={24} className="mx-auto text-text-tertiary mb-2 opacity-50" />
                <p className="text-[13px] text-text-tertiary">No payments recorded yet</p>
                <p className="text-[11px] text-text-tertiary mt-0.5">Click "Record Payment" to log your first receipt.</p>
              </td></tr>
            ) : (
              payments.map(p => {
                const inv = invoices.find(i => i.id === p.invoice_id)
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-elevated/50 transition-colors">
                    <td className="px-4 py-3 text-[12px] font-medium">{p.client_name || '—'}</td>
                    <td className="px-4 py-3 text-[12px] font-mono text-text-secondary">
                      {inv ? (inv.invoice_number || inv.id.slice(0, 8)) : (p.invoice_id ? p.invoice_id.slice(0, 8) : '—')}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-mono font-medium">
                      {(p.amount || 0).toLocaleString()} {p.currency || 'BAM'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-text-secondary capitalize">{(p.method || '').replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-[11px] text-text-tertiary">{p.received_date || '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-text-tertiary truncate max-w-[180px]">{p.reference || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => removePayment(p)} className="text-text-tertiary hover:text-error focus-ring rounded p-0.5" title="Delete payment">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <RecordPaymentModal
        open={showRecord}
        onClose={() => setShowRecord(false)}
        portalClients={portalClients}
        invoices={invoices}
      />
    </div>
  )
}

function Th({ children, right }) {
  return (
    <th className={`text-[11px] font-medium text-text-tertiary uppercase tracking-wider px-4 py-3 ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function RecordPaymentModal({ open, onClose, portalClients, invoices }) {
  const toast = useToast()
  const recordPayment = useRecordPayment()
  const [form, setForm] = useState({
    invoice_id: '', client_id: '', client_name: '',
    amount: '', currency: 'BAM', method: 'bank_transfer',
    reference: '', received_date: '', notes: '',
  })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Open invoices = anything not paid/cancelled
  const openInvoices = useMemo(() =>
    invoices.filter(i => !['paid','cancelled'].includes(i.status)), [invoices])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_name && !form.invoice_id) return
    if (!form.amount) return
    try {
      const r = await recordPayment.mutateAsync({
        ...form,
        amount: parseFloat(form.amount) || 0,
        received_date: form.received_date || new Date().toISOString().slice(0, 10),
      })
      setSuccess(`Payment recorded${r.invoice_status === 'paid' ? ' — invoice marked paid' : ''}.`)
      toast.success('Payment recorded', r.invoice_status === 'paid'
        ? { description: 'Linked invoice flipped to paid.' }
        : undefined)
      setTimeout(() => {
        setSuccess('')
        setForm({ invoice_id: '', client_id: '', client_name: '', amount: '', currency: 'BAM', method: 'bank_transfer', reference: '', received_date: '', notes: '' })
        onClose()
      }, 900)
    } catch (e) { toast.error('Record failed', { description: e.message }) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
        <Field label="Linked invoice (optional)">
          <Select value={form.invoice_id} onChange={e => {
            const iid = e.target.value
            const inv = openInvoices.find(i => i.id === iid)
            set('invoice_id', iid)
            if (inv) {
              set('client_id', inv.client_id || '')
              set('client_name', inv.client_name || '')
              set('amount', String(inv.amount || ''))
              set('currency', inv.currency || 'BAM')
            }
          }}>
            <option value="">None — record a standalone payment</option>
            {openInvoices.map(i => (
              <option key={i.id} value={i.id}>
                {(i.invoice_number || i.id.slice(0, 8))} — {i.client_name || '—'} — {i.amount || 0} {i.currency || 'BAM'}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Client" required>
          <Select value={form.client_id} onChange={e => {
            const cid = e.target.value
            const c = portalClients.find(pc => pc.id === cid)
            set('client_id', cid)
            set('client_name', c?.business_name || '')
            if (c?.mrr) set('amount', String(c.mrr))
          }}>
            <option value="">Type a client below, or pick a portal client…</option>
            {portalClients.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
        </Field>
        <Field label="Client name">
          <Input value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Acme d.o.o." />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (BAM)" required>
            <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="250" />
          </Field>
          <Field label="Received">
            <Input type="date" value={form.received_date} onChange={e => set('received_date', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Method">
            <Select value={form.method} onChange={e => set('method', e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          <Field label="Reference">
            <Input value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="e.g. transfer ID, last 4" />
          </Field>
        </div>

        <SubmitButton disabled={(!form.client_name && !form.invoice_id) || !form.amount || recordPayment.isPending}>
          {recordPayment.isPending ? <><Loader2 size={12} className="animate-spin" /> Recording…</> : 'Record Payment'}
        </SubmitButton>
      </form>
    </Modal>
  )
}
