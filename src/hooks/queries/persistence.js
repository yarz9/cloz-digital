// TanStack Query hooks for the Persistence Center.
// One small file per backend; keeps invalidation explicit and discoverable.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { qk } from './keys'

// ── Queries ──────────────────────────────────────────────────
export function usePersistenceStatus(options = {}) {
  return useQuery({
    queryKey: qk.persistence.status(),
    queryFn: () => api.get('/api/persistence/status'),
    refetchInterval: 30_000, // status is cheap; keep it warm
    ...options,
  })
}

export function usePersistenceTables() {
  return useQuery({
    queryKey: qk.persistence.tables(),
    queryFn: () => api.get('/api/persistence/tables'),
  })
}

export function usePersistenceAudit(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
  const qs = params.toString()
  return useQuery({
    queryKey: qk.persistence.audit(filters),
    queryFn: () => api.get(`/api/persistence/audit${qs ? `?${qs}` : ''}`),
    refetchInterval: 60_000,
  })
}

export function usePersistenceAuditStats() {
  return useQuery({
    queryKey: qk.persistence.auditStats(),
    queryFn: () => api.get('/api/persistence/audit/stats'),
  })
}

export function usePersistenceMarkers() {
  return useQuery({
    queryKey: qk.persistence.markers(),
    queryFn: () => api.get('/api/persistence/markers'),
  })
}

export function usePersistenceSnapshots() {
  return useQuery({
    queryKey: qk.persistence.snapshots(),
    queryFn: () => api.get('/api/persistence/snapshots'),
  })
}

export function usePostgresPing() {
  return useQuery({
    queryKey: qk.persistence.pg(),
    queryFn: () => api.get('/api/persistence/pg'),
  })
}

// ── Mutations ─────────────────────────────────────────────────
export function useCreateMarker() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/persistence/markers', body),
    // Optimistic insert: the marker appears immediately, then is
    // replaced by the server-truth on the next refetch.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: qk.persistence.markers() })
      const previous = qc.getQueryData(qk.persistence.markers())
      const optimistic = {
        id: `tmp-${Date.now()}`,
        created_at: new Date().toISOString(),
        kind: vars.kind || 'manual',
        payload: vars.payload || '',
        created_by: vars.created_by || '',
        _optimistic: true,
      }
      qc.setQueryData(qk.persistence.markers(), (old) => ({
        markers: [optimistic, ...(old?.markers || [])],
      }))
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(qk.persistence.markers(), ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.persistence.markers() })
      qc.invalidateQueries({ queryKey: qk.persistence.status() })
    },
  })
}

export function useTakeSnapshot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/api/persistence/snapshots'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.persistence.snapshots() })
      qc.invalidateQueries({ queryKey: qk.persistence.status() })
    },
  })
}
