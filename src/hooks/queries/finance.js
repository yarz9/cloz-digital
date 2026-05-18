// Finance query hooks — Revenue / Billing / Payments.
// Backs /api/finance (commit e53d2a0). All mutations invalidate the
// aggregate queries (overview / aging / forecast) so KPI tiles stay
// in sync without manual refetch.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { qk } from './keys'

function buildQs(filters) {
  const p = new URLSearchParams()
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== false) p.set(k, v)
  })
  const s = p.toString()
  return s ? `?${s}` : ''
}

// Helper: after any mutation that changes invoices or payments,
// invalidate every aggregate so Revenue tiles update without a
// manual refetch.
function invalidateAggregates(qc) {
  qc.invalidateQueries({ queryKey: qk.finance.overview() })
  qc.invalidateQueries({ queryKey: qk.finance.aging() })
  qc.invalidateQueries({ queryKey: ['finance', 'forecast'] })
}

// ── Aggregates ────────────────────────────────────────────────
export function useRevenueOverview() {
  return useQuery({
    queryKey: qk.finance.overview(),
    queryFn: () => api.get('/api/finance/overview'),
    refetchInterval: 60_000,
  })
}

export function useAging() {
  return useQuery({
    queryKey: qk.finance.aging(),
    queryFn: () => api.get('/api/finance/aging'),
  })
}

export function useForecast(horizon = 6) {
  return useQuery({
    queryKey: qk.finance.forecast(horizon),
    queryFn: () => api.get(`/api/finance/forecast?horizon=${horizon}`),
  })
}

export function useForecastSnapshots() {
  return useQuery({
    queryKey: qk.finance.snapshots(),
    queryFn: () => api.get('/api/finance/forecast/snapshots'),
  })
}

// ── Invoices ──────────────────────────────────────────────────
export function useInvoices(filters = {}) {
  return useQuery({
    queryKey: qk.finance.invoices(filters),
    queryFn: () => api.get(`/api/finance/invoices${buildQs(filters)}`),
  })
}

export function useInvoice(id) {
  return useQuery({
    queryKey: qk.finance.invoice(id),
    queryFn: () => api.get(`/api/finance/invoices/${id}`),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/finance/invoices', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      invalidateAggregates(qc)
    },
  })
}

// Optimistic: status flips render immediately across every cached
// invoices-query slot AND the singular invoice cache. Rolls back on
// error, reconciles with server on settle.
export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/finance/invoices/${id}`, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['finance', 'invoices'] })
      const snapshots = []
      const lists = qc.getQueriesData({ queryKey: ['finance', 'invoices'] })
      for (const [key, data] of lists) {
        snapshots.push([key, data])
        if (data?.invoices) {
          qc.setQueryData(key, {
            ...data,
            invoices: data.invoices.map(i => i.id === id ? { ...i, ...patch, _optimistic: true } : i),
          })
        }
      }
      const oneKey = qk.finance.invoice(id)
      const onePrev = qc.getQueryData(oneKey)
      if (onePrev) {
        snapshots.push([oneKey, onePrev])
        qc.setQueryData(oneKey, { ...onePrev, invoice: { ...onePrev.invoice, ...patch, _optimistic: true } })
      }
      return { snapshots }
    },
    onError: (_e, _v, ctx) => {
      for (const [key, data] of (ctx?.snapshots || [])) qc.setQueryData(key, data)
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      qc.invalidateQueries({ queryKey: qk.finance.invoice(id) })
      invalidateAggregates(qc)
    },
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/api/finance/invoices/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      qc.invalidateQueries({ queryKey: ['finance', 'payments'] })
      invalidateAggregates(qc)
    },
  })
}

// ── Payments ──────────────────────────────────────────────────
export function usePayments(filters = {}) {
  return useQuery({
    queryKey: qk.finance.payments(filters),
    queryFn: () => api.get(`/api/finance/payments${buildQs(filters)}`),
  })
}

// Recording a payment can auto-flip the linked invoice to paid on
// the server. After settle we invalidate invoices + aggregates so
// the table + KPI tiles reflect that.
export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/finance/payments', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'payments'] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      invalidateAggregates(qc)
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/api/finance/payments/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'payments'] })
      qc.invalidateQueries({ queryKey: ['finance', 'invoices'] })
      invalidateAggregates(qc)
    },
  })
}

// ── Retainers ─────────────────────────────────────────────────
export function useRetainers(filters = {}) {
  return useQuery({
    queryKey: qk.finance.retainers(filters),
    queryFn: () => api.get(`/api/finance/retainers${buildQs(filters)}`),
  })
}

export function useCreateRetainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/finance/retainers', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'retainers'] })
      invalidateAggregates(qc)
    },
  })
}

export function useUpdateRetainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/finance/retainers/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'retainers'] })
      invalidateAggregates(qc)
    },
  })
}

export function useDeleteRetainer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/api/finance/retainers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'retainers'] })
      invalidateAggregates(qc)
    },
  })
}

// ── AI Forecast ───────────────────────────────────────────────
// Generating an AI forecast persists a snapshot on the server. After
// success we invalidate the snapshot list AND the overview/forecast
// queries so any UI surface that reads "latest forecast" updates.
export function useGenerateAIForecast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ horizon, notes, generated_by }) =>
      api.post('/api/finance/forecast/ai', { horizon, notes, generated_by }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.finance.snapshots() })
      qc.invalidateQueries({ queryKey: ['finance', 'forecast'] })
      qc.invalidateQueries({ queryKey: qk.finance.overview() })
    },
  })
}

// ── One-time lift from localStorage ───────────────────────────
export function useImportLocalFinance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => api.post('/api/finance/import-local', payload),
    onSuccess: () => {
      // The import touches every domain — bust the entire finance namespace
      qc.invalidateQueries({ queryKey: qk.finance.all })
    },
  })
}
