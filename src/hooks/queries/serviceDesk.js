// Service Desk query hooks. The Service Desk view does the most data
// thrashing in the whole app, so this is the biggest near-term win
// for moving to TanStack Query (deduped requests, cache, background
// refetch, optimistic mutations).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { qk } from './keys'

function buildQs(filters) {
  const p = new URLSearchParams()
  Object.entries(filters || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, v) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function useServiceDeskRequests(filters = {}, options = {}) {
  return useQuery({
    queryKey: qk.serviceDesk.requests(filters),
    queryFn: () => api.get(`/api/service-desk/requests${buildQs(filters)}`),
    refetchInterval: 60_000,
    ...options,
  })
}

export function useServiceDeskMetrics() {
  return useQuery({
    queryKey: qk.serviceDesk.metrics(),
    queryFn: () => api.get('/api/service-desk/metrics'),
    refetchInterval: 60_000,
  })
}

export function useServiceDeskRequest(type, id, options = {}) {
  return useQuery({
    queryKey: qk.serviceDesk.request(type, id),
    queryFn: () => api.get(`/api/service-desk/requests/${type}/${id}`),
    enabled: !!type && !!id,
    ...options,
  })
}

// ── Mutations ─────────────────────────────────────────────────
export function useReplyToRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, body }) =>
      api.post(`/api/service-desk/requests/${type}/${id}/reply`, body),
    onSuccess: (_data, { type, id }) => {
      qc.invalidateQueries({ queryKey: qk.serviceDesk.request(type, id) })
      qc.invalidateQueries({ queryKey: qk.serviceDesk.all })
    },
  })
}

export function usePatchRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, patch }) =>
      api.patch(`/api/service-desk/requests/${type}/${id}`, patch),
    onSuccess: (_data, { type, id }) => {
      qc.invalidateQueries({ queryKey: qk.serviceDesk.request(type, id) })
      qc.invalidateQueries({ queryKey: qk.serviceDesk.all })
    },
  })
}

export function useAddRequestNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, body }) =>
      api.post(`/api/service-desk/requests/${type}/${id}/notes`, body),
    onSuccess: (_data, { type, id }) =>
      qc.invalidateQueries({ queryKey: qk.serviceDesk.request(type, id) }),
  })
}

export function useConvertRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, target, payload }) =>
      api.post(`/api/service-desk/requests/${type}/${id}/convert`, { target, payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.serviceDesk.all }),
  })
}
