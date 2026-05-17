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

// ── Queries ───────────────────────────────────────────────────
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

// Optimistically appends the reply to the conversation thread in the
// detail cache so the operator sees their message land instantly.
export function useReplyToRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, body }) =>
      api.post(`/api/service-desk/requests/${type}/${id}/reply`, body),
    onMutate: async ({ type, id, body }) => {
      const key = qk.serviceDesk.request(type, id)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      const optimistic = {
        id: `tmp-${Date.now()}`,
        author: 'cloz',
        author_name: body.author_name || 'Cloz Digital',
        body: body.body,
        created_at: new Date().toISOString(),
        _optimistic: true,
      }
      qc.setQueryData(key, (old) => old ? {
        ...old,
        messages: [...(old.messages || []), optimistic],
      } : old)
      return { previous, key }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: (_data, _err, { type, id }) => {
      qc.invalidateQueries({ queryKey: qk.serviceDesk.request(type, id) })
      qc.invalidateQueries({ queryKey: qk.serviceDesk.all })
    },
  })
}

// Optimistically applies the PATCH to the detail cache so badges/pills
// update immediately.
export function usePatchRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, patch }) =>
      api.patch(`/api/service-desk/requests/${type}/${id}`, patch),
    onMutate: async ({ type, id, patch }) => {
      const key = qk.serviceDesk.request(type, id)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData(key, (old) => old ? {
        ...old,
        request: {
          ...old.request,
          ...(patch.status        !== undefined ? { status: patch.status } : {}),
          ...(patch.priority      !== undefined ? { priority: patch.priority } : {}),
          ...(patch.assignee_name !== undefined ? { assignee: patch.assignee_name } : {}),
          ...(patch.escalated     !== undefined ? { escalated: !!patch.escalated } : {}),
        },
      } : old)
      return { previous, key }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: (_data, _err, { type, id }) => {
      qc.invalidateQueries({ queryKey: qk.serviceDesk.request(type, id) })
      qc.invalidateQueries({ queryKey: qk.serviceDesk.all })
    },
  })
}

// Optimistically prepends the note in the detail cache.
export function useAddRequestNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, body }) =>
      api.post(`/api/service-desk/requests/${type}/${id}/notes`, body),
    onMutate: async ({ type, id, body }) => {
      const key = qk.serviceDesk.request(type, id)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      const optimistic = {
        id: `tmp-${Date.now()}`,
        author: body.author || '',
        body: body.body,
        created_at: new Date().toISOString(),
        _optimistic: true,
      }
      qc.setQueryData(key, (old) => old ? {
        ...old,
        notes: [...(old.notes || []), optimistic],
      } : old)
      return { previous, key }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: (_data, _err, { type, id }) =>
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

// Run an AI helper (summary, suggest_reply, urgency, assignee, effort,
// upsell, checklist). Used by the Toolbox + ReplyComposer suggest button.
// Side-effect: if action === 'summary', the server persists ai_summary
// onto the ticket — invalidate the detail so the AI Summary card
// re-renders.
export function useRequestAI() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id, action, extra }) =>
      api.post(`/api/service-desk/requests/${type}/${id}/ai`, { action, extra }),
    onSuccess: (_data, { type, id, action }) => {
      if (action === 'summary') {
        qc.invalidateQueries({ queryKey: qk.serviceDesk.request(type, id) })
      }
    },
  })
}
