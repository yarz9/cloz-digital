// One-time lift of legacy localStorage finance data into PostgreSQL.
//
// Behavior:
//  - Reads the persisted Zustand store from localStorage.
//  - If it finds invoices/payments/retainers AND the backend overview
//    reports zero invoices (i.e. we haven't imported yet), shows a
//    polished banner. Operator can import or dismiss.
//  - On success, marks itself complete via localStorage flag and
//    refuses to prompt again.
//  - Dismissing without importing ALSO marks complete so we don't nag.

import { useEffect, useMemo, useState } from 'react'
import { Sparkles, ArrowRight, X, Loader2, CheckCircle2 } from 'lucide-react'
import { useImportLocalFinance } from '@/hooks/queries/finance'
import { useToast } from '@/components/ui/Toast'
import { useUser } from '@/contexts/UserContext'

const STORE_KEY        = 'management-store'      // Zustand persist key
const IMPORT_DONE_KEY  = 'cloz_finance_imported_v1'

function readLegacyStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state || parsed || null
  } catch { return null }
}

// Normalise legacy Zustand fields onto the backend's expected shape.
// The backend's /import-local already tolerates both old and new field
// names, but we explicitly map here for clarity.
function buildPayload(state) {
  if (!state) return { invoices: [], payments: [], retainers: [] }
  const invoices = Array.isArray(state.invoices) ? state.invoices.map(i => ({
    id: i.id,
    invoice_number: i.id || i.invoice_number || '',
    client_name: i.client || i.client_name || '',
    amount: i.amount,
    currency: i.currency || 'BAM',
    status: i.status,
    description: i.description || '',
    issued_date: i.issued || i.issued_date || '',
    due_date: i.due || i.due_date || '',
    paid_date: i.paid || i.paid_date || '',
    notes: i.notes || '',
  })) : []

  // Legacy store has no separate payments table; payments live as
  // status=='paid' invoices. Nothing to lift.
  const payments = []

  // Legacy retainers = clients with mrr > 0.
  const retainers = Array.isArray(state.clients) ? state.clients
    .filter(c => c.mrr && c.mrr > 0)
    .map(c => ({
      id: `retainer_${c.id}`,
      client_id: c.id || '',
      client_name: c.name || '',
      package: c.package || '',
      monthly_amount: c.mrr,
      currency: c.currency || 'BAM',
      status: 'active',
      start_date: c.start_date || '',
      notes: '',
    })) : []

  return { invoices, payments, retainers }
}

export default function FinanceImportPrompt({ backendOverview }) {
  const toast = useToast()
  const importMutation = useImportLocalFinance()
  const { user } = useUser()
  const [dismissed, setDismissed] = useState(false)
  const [imported, setImported] = useState(false)

  const payload = useMemo(() => buildPayload(readLegacyStore()), [])
  const legacyTotal = payload.invoices.length + payload.payments.length + payload.retainers.length

  // Heuristics:
  //  - already marked imported → never show.
  //  - no legacy data → never show.
  //  - backend has invoices but the operator hasn't marked imported →
  //    keep silent; they're already past the lift.
  const alreadyDone = typeof localStorage !== 'undefined' && localStorage.getItem(IMPORT_DONE_KEY) === '1'
  const backendEmpty = backendOverview?.counts?.invoices === 0 && backendOverview?.counts?.retainers_active === 0

  // Mark done if backend already has data (operator likely imported on
  // another device or seeded directly).
  useEffect(() => {
    if (!alreadyDone && backendOverview && !backendEmpty) {
      try { localStorage.setItem(IMPORT_DONE_KEY, '1') } catch {}
    }
  }, [alreadyDone, backendEmpty, backendOverview])

  if (alreadyDone || dismissed || imported)        return null
  if (legacyTotal === 0)                            return null
  if (!backendOverview || !backendEmpty)            return null

  const runImport = async () => {
    try {
      const r = await importMutation.mutateAsync({ ...payload, importer: user?.name || '' })
      try { localStorage.setItem(IMPORT_DONE_KEY, '1') } catch {}
      setImported(true)
      const counts = (label, x) => `${label}: ${x.inserted}/${x.inserted + x.skipped}`
      toast.success('Legacy finance data imported', {
        description: `${counts('invoices', r.invoices)} · ${counts('payments', r.payments)} · ${counts('retainers', r.retainers)}`,
      })
    } catch (e) {
      toast.error('Import failed', { description: e.message })
    }
  }

  const dismiss = () => {
    try { localStorage.setItem(IMPORT_DONE_KEY, '1') } catch {}
    setDismissed(true)
  }

  return (
    <div className="card-premium with-sheen !p-5 border-accent/30 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-md bg-accent-muted flex items-center justify-center shrink-0">
          <Sparkles size={16} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-[14px] text-text-primary">Lift legacy finance data into the database</h3>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-accent-muted text-accent px-1.5 py-0.5 rounded">one-time</span>
          </div>
          <p className="text-[12px] text-text-secondary leading-relaxed">
            Found <strong>{payload.invoices.length}</strong> invoice{payload.invoices.length === 1 ? '' : 's'}
            {payload.retainers.length > 0 && <> and <strong>{payload.retainers.length}</strong> retainer{payload.retainers.length === 1 ? '' : 's'}</>}
            {' '}in your browser's local storage. Importing copies them into the persistent finance backend so Revenue, Billing, and Payments all show the same numbers across devices and survive Railway redeploys.
          </p>
          <p className="text-[11px] text-text-tertiary mt-1">
            Idempotent — running it twice is safe. Existing records are never overwritten.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={runImport} disabled={importMutation.isPending}
              className="button-premium !py-1.5 !px-3 focus-ring disabled:opacity-50">
              {importMutation.isPending
                ? <><Loader2 size={11} className="animate-spin" /> Importing…</>
                : <><ArrowRight size={11} /> Import now</>}
            </button>
            <button onClick={dismiss}
              className="text-[11px] text-text-tertiary hover:text-text-primary px-2.5 py-1.5 rounded focus-ring">
              Skip (won't ask again)
            </button>
          </div>
        </div>
        <button onClick={dismiss} className="text-text-tertiary hover:text-text-primary focus-ring rounded p-0.5">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
