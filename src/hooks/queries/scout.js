// Client Scout query hooks — the actual CRM in this codebase.
// Wraps /api/client-scout. Stage moves are optimistic so pipeline
// transitions feel instant.

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

// ── Queries ───────────────────────────────────────────────────
export function useScoutMeta() {
  return useQuery({
    queryKey: qk.scout.meta(),
    queryFn: () => api.get('/api/client-scout/meta'),
    staleTime: 60 * 60 * 1000, // 1h — meta is essentially static
  })
}

export function useScoutLeads(filters = {}, options = {}) {
  return useQuery({
    queryKey: qk.scout.leads(filters),
    queryFn: () => api.get(`/api/client-scout/leads${buildQs({ ...filters, limit: filters.limit ?? 200 })}`),
    ...options,
  })
}

export function useScoutLead(id) {
  return useQuery({
    queryKey: qk.scout.lead(id),
    queryFn: () => api.get(`/api/client-scout/leads/${id}`),
    enabled: !!id,
  })
}

export function useScoutStats() {
  return useQuery({
    queryKey: qk.scout.stats(),
    queryFn: () => api.get('/api/client-scout/stats'),
  })
}

export function useScanStatus(options = {}) {
  return useQuery({
    queryKey: qk.scout.scanStatus(),
    queryFn: () => api.get('/api/client-scout/scan/status'),
    refetchInterval: (q) => (q.state.data?.running || q.state.data?.paused) ? 3000 : false,
    ...options,
  })
}

// ── Mutations ─────────────────────────────────────────────────

// Optimistic stage move — the lead jumps columns immediately, then
// reconciles with the server. Rolls back on error.
export function useChangeLeadStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, stage }) => api.post(`/api/client-scout/leads/${id}/change-stage`, { stage }),
    onMutate: async ({ id, stage }) => {
      // Optimistically patch the lead in every cached leads query
      const snapshots = []
      const matches = qc.getQueriesData({ queryKey: ['scout', 'leads'] })
      for (const [key, data] of matches) {
        snapshots.push([key, data])
        if (data?.leads) {
          qc.setQueryData(key, {
            ...data,
            leads: data.leads.map(l => l.id === id ? { ...l, status: stage, _optimistic: true } : l),
          })
        }
      }
      // Also patch the singular lead cache if present
      const oneKey = qk.scout.lead(id)
      const onePrev = qc.getQueryData(oneKey)
      if (onePrev) {
        snapshots.push([oneKey, onePrev])
        qc.setQueryData(oneKey, { ...onePrev, status: stage, _optimistic: true })
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of (ctx?.snapshots || [])) qc.setQueryData(key, data)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['scout', 'leads'] })
      qc.invalidateQueries({ queryKey: qk.scout.stats() })
    },
  })
}

// Optimistic status update (status === stage but uses /status PATCH)
export function useUpdateLeadStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/api/client-scout/leads/${id}/status`, { status }),
    onMutate: async ({ id, status }) => {
      const snapshots = []
      const matches = qc.getQueriesData({ queryKey: ['scout', 'leads'] })
      for (const [key, data] of matches) {
        snapshots.push([key, data])
        if (data?.leads) {
          qc.setQueryData(key, {
            ...data,
            leads: data.leads.map(l => l.id === id ? { ...l, status, _optimistic: true } : l),
          })
        }
      }
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      for (const [key, data] of (ctx?.snapshots || [])) qc.setQueryData(key, data)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['scout', 'leads'] })
      qc.invalidateQueries({ queryKey: qk.scout.stats() })
    },
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/api/client-scout/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scout.all })
    },
  })
}

export function useAnalyzeLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/api/client-scout/leads/${id}/analyze`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scout', 'leads'] })
      qc.invalidateQueries({ queryKey: qk.scout.stats() })
    },
  })
}

export function useGenerateOutreach() {
  return useMutation({
    mutationFn: ({ id, style }) =>
      api.post(`/api/client-scout/leads/${id}/generate-outreach`, { style }),
  })
}

export function useWebsiteReview() {
  return useMutation({
    mutationFn: (id) => api.post(`/api/client-scout/leads/${id}/website-review`),
  })
}

export function useRebuildPrompt() {
  return useMutation({
    mutationFn: ({ id, variant }) =>
      api.post(`/api/client-scout/leads/${id}/rebuild-prompt`, { variant }),
  })
}

// ── Discovery (Overpass) ──────────────────────────────────────
export function useDiscoverLeads() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/client-scout/discover', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scout', 'leads'] })
      qc.invalidateQueries({ queryKey: qk.scout.stats() })
    },
  })
}

export function useStartScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/client-scout/scan/start', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scout.scanStatus() }),
  })
}

export function useStopScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/client-scout/scan/stop'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scout.scanStatus() })
      qc.invalidateQueries({ queryKey: ['scout', 'leads'] })
      qc.invalidateQueries({ queryKey: qk.scout.stats() })
    },
  })
}

export function usePauseScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/client-scout/pause'),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scout.scanStatus() }),
  })
}

export function usePurgeSyntheticLeads() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/client-scout/leads/purge-synthetic'),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.scout.all }),
  })
}
