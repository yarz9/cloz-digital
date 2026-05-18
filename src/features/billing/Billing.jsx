// Billing — PostgreSQL-backed via /api/finance.
// Phase 2 of the Revenue migration. Shares the new finance backend
// with Revenue.jsx and Payments.jsx so all three views show
// numerically identical figures.

import { useMemo, useState } from 'react'
import {
  Receipt, Plus, Search, TrendingUp, AlertTriangle, Clock,
  Sparkles, Loader2, CheckCircle2, Trash2,
} from 'lucide-react'
import { ai } from '@/lib/api'
import Modal, { Field, Input, Select, Textarea, SubmitButton, SuccessBanner } from '@/components/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import {
  useInvoices, useRevenueOverview, useCreateInvoice,
  useUpdateInvoice, useDeleteInvoice,
} from '@/hooks/queries/finance'
import { usePortalClients } from '@/hooks/queries/portalClients'

const statusColors = {
  paid: 'bg-success/10 text-success',
  sent: 'bg-info/10 text-info',
  pending: 'bg-warning/10 text-warning',
  overdue: 'bg-error/10 text-error',
  draft: 'bg-elevated text-text-secondary',
  cancelled: 'bg-elevated text-text-tertiary',
}

const STATUSES = ['all', 'draft', 'pending', 'sent', 'paid', 'overdue']

export default function Billing() {
  const toast = useToast()
  const invoicesQuery = useInvoices()
  const overviewQuery = useRevenueOverview()
  const clientsQuery  = usePortalClients()

  const updateInvoice = useUpdateInvoice()
  const deleteInvoice = useDeleteInvoice()

  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const invoices = invoicesQuery.data?.invoices || []
  const portalClients = clientsQuery.data?.clients || []
  const overview = overviewQuery.data

  const filtered = useMemo(() => invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (search) {
      const t = search.toLowerCase()
      const hay = `${inv.client_name || ''} ${inv.invoice_number || ''} ${inv.id || ''}`.toLowerCase()
      if (!hay.includes(t)) return false
    }
    return true
  }), [invoices, statusFilter, search])

  const stats = [
    { label: 'Outstanding', value: `${(overview?.outstanding_total || 0).toLocaleString()} BAM`, color: 'text-warning', icon: Clock },
    { label: 'Overdue',     value: `${(overview?.overdue_total || 0).toLocaleString()} BAM`,     color: 'text-error',   icon: AlertTriangle },
    { label: 'Collected',   value: `${(overview?.paid_total || 0).toLocaleString()} BAM`,        color: 'text-success', icon: TrendingUp },
    { label: 'MRR',         value: `${(overview?.mrr || 0).toLocaleString()} BAM`,               color: 'text-accent',  icon: Receipt },
  ]

  const markPaid = async (inv) => {
    try {
      await updateInvoice.mutateAsync({ id: inv.id, patch: { status: 'paid', paid_date: new Date().toISOString().slice(0, 10) } })
    } catch (e) { toast.error('Could not mark paid', { description: e.message }) }
  }

  const remove = async (inv) => {
    if (!confirm(`Delete invoice ${inv.invoice_number || inv.id.slice(0, 8)} and any linked payments?`)) return
    try {
      await deleteInvoice.mutateAsync(inv.id)
      toast.success('Invoice deleted')
    } catch (e) { toast.error('Delete failed', { description: e.message }) }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-[20px]">Billing</h1>
        <button onClick={() => setShowAdd(true)}
          className="button-premium !py-1.5 !px-3 focus-ring">
          <Plus size={13} /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {overviewQuery.isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-premium space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))
          : stats.map(s => (
              <div key={s.label} className="card-premium hover-lift">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-text-tertiary uppercase tracking-wider">{s.label}</span>
                  <s.icon size={14} className={s.color} strokeWidth={1.5} />
                </div>
                <span className="text-[22px] font-display font-bold">{s.value}</span>
              </div>
            ))}
      </div>

      <AIInsight overview={overview} count={invoices.length}
        paid={invoices.filter(i => i.status === 'paid').length}
        overdue={invoices.filter(i => i.status === 'overdue').length} />

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search invoice number or client…"
            className="w-full bg-surface border border-border rounded-md pl-9 pr-4 py-2 text-[13px] placeholder:text-text-tertiary focus:border-accent focus:outline-none focus-ring"
          />
        </div>
        <div className="flex gap-1">
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-[11px] font-medium px-2.5 py-1.5 rounded transition-colors capitalize focus-ring ${
                statusFilter === s ? 'bg-accent-muted text-accent' : 'text-text-tertiary hover:text-text-secondary hover:bg-elevated'
              }`}
            >
              {s}
              <span className="ml-1 opacity-60">
                {s === 'all' ? invoices.length : invoices.filter(i => i.status === s).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Invoice table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-elevated/40">
              <Th>Invoice</Th><Th>Client</Th><Th>Description</Th><Th>Amount</Th>
              <Th>Status</Th><Th>Issued</Th><Th>Due</Th>
              <Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {invoicesQuery.isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3"><Skeleton className="h-3 w-3/4" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-[13px] text-text-tertiary">No invoices found</td></tr>
            ) : (
              filtered.map(inv => (
                <tr key={inv.id} className={`border-b border-border last:border-0 hover:bg-elevated/50 transition-colors ${inv._optimistic ? 'opacity-70' : ''}`}>
                  <td className="px-4 py-3 text-[12px] font-mono font-medium">{inv.invoice_number || inv.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-[13px]">{inv.client_name || '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary truncate max-w-[220px]">{inv.description || '—'}</td>
                  <td className="px-4 py-3 text-[13px] font-medium">{(inv.amount || 0).toLocaleString()} {inv.currency || 'BAM'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded capitalize ${statusColors[inv.status] || statusColors.draft}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{inv.issued_date || '—'}</td>
                  <td className="px-4 py-3 text-[12px] text-text-secondary">{inv.due_date || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-3 justify-end items-center">
                      {(inv.status === 'pending' || inv.status === 'sent' || inv.status === 'overdue') && (
                        <button onClick={() => markPaid(inv)} className="text-[10px] text-success hover:text-success/80 font-medium focus-ring rounded px-1">
                          Mark Paid
                        </button>
                      )}
                      <button onClick={() => remove(inv)} className="text-text-tertiary hover:text-error focus-ring rounded p-0.5" title="Delete">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddInvoiceModal open={showAdd} onClose={() => setShowAdd(false)} portalClients={portalClients} />
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

function AIInsight({ overview, count, paid, overdue }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const run = async () => {
    if (!overview) return
    setLoading(true); setError(''); setText('')
    try {
      const r = await ai.generate(
        `You are a billing assistant for Cloz Digital, a web design agency in Bosnia. Analyze this billing snapshot and give a brief 2-sentence insight with actionable advice:
- Outstanding: ${overview.outstanding_total} BAM
- Overdue: ${overview.overdue_total} BAM
- Collected: ${overview.paid_total} BAM
- MRR: ${overview.mrr} BAM
- Total invoices: ${count}, ${paid} paid, ${overdue} overdue
Be direct and specific. No markdown.`,
        0.3
      )
      setText(r?.text || '')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="card-premium flex items-start gap-3">
      <Sparkles size={15} className="text-accent mt-0.5 shrink-0" />
      <div className="flex-1 text-[12px] text-text-secondary">
        {loading ? (
          <span className="flex items-center gap-2 text-text-tertiary"><Loader2 size={12} className="animate-spin" /> Analyzing billing data…</span>
        ) : text ? text
          : error ? <span className="text-error">Could not generate insight: {error}</span>
          : <span className="text-text-tertiary">Tap "AI insight" for a 2-sentence read on the current billing snapshot.</span>}
      </div>
      <button onClick={run} disabled={loading || !overview}
        className="text-[11px] text-accent hover:bg-accent-muted px-2.5 py-1.5 rounded focus-ring disabled:opacity-50">
        AI insight
      </button>
    </div>
  )
}

function AddInvoiceModal({ open, onClose, portalClients }) {
  const toast = useToast()
  const createInvoice = useCreateInvoice()
  const [form, setForm] = useState({ client_name: '', client_id: '', amount: '', due_date: '', issued_date: '', description: '', invoice_number: '', status: 'pending' })
  const [success, setSuccess] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.client_name || !form.amount) return
    try {
      const r = await createInvoice.mutateAsync({
        ...form,
        amount: parseFloat(form.amount) || 0,
        issued_date: form.issued_date || new Date().toISOString().slice(0, 10),
      })
      setSuccess(`Invoice ${r.id.slice(0, 8)} created for ${form.client_name}.`)
      toast.success('Invoice created')
      setTimeout(() => {
        setSuccess('')
        setForm({ client_name: '', client_id: '', amount: '', due_date: '', issued_date: '', description: '', invoice_number: '', status: 'pending' })
        onClose()
      }, 900)
    } catch (e) { toast.error('Create failed', { description: e.message }) }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Invoice">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SuccessBanner message={success} />
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
          <Field label="Status">
            <Select value={form.status} onChange={e => set('status', e.target.value)}>
              {['draft','pending','sent','overdue','paid','cancelled'].map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Issued">
            <Input type="date" value={form.issued_date} onChange={e => set('issued_date', e.target.value)} />
          </Field>
          <Field label="Due">
            <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
          </Field>
        </div>
        <Field label="Invoice number">
          <Input value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} placeholder="e.g. INV-2026-014" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="e.g. Presence Care — May 2026" />
        </Field>
        <SubmitButton disabled={!form.client_name || !form.amount || createInvoice.isPending}>
          {createInvoice.isPending ? 'Creating…' : 'Create Invoice'}
        </SubmitButton>
      </form>
    </Modal>
  )
}
