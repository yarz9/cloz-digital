// Client Portal query hooks. Wraps the existing portal API client
// in src/lib/portalApi.js so we inherit:
//   - Bearer-token auth (token in localStorage)
//   - Automatic clearPortalSession() on 401
//   - 20s default timeout (60s for AI assistant)
//
// Mutations are optimistic where the operator-facing UX benefits
// (ticket replies, direct messages, approval decisions).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { portal } from '@/lib/portalApi'
import { qk } from './keys'

// ── Queries ───────────────────────────────────────────────────
export function usePortalMe() {
  return useQuery({
    queryKey: qk.portal.me(),
    queryFn: () => portal.me(),
    staleTime: 60 * 1000,
  })
}

export function usePortalDashboard() {
  return useQuery({
    queryKey: qk.portal.dashboard(),
    queryFn: () => portal.dashboard(),
  })
}

export function usePortalTickets() {
  return useQuery({
    queryKey: qk.portal.tickets(),
    queryFn: () => portal.tickets(),
  })
}

export function usePortalTicket(id) {
  return useQuery({
    queryKey: qk.portal.ticket(id),
    queryFn: () => portal.ticket(id),
    enabled: !!id,
  })
}

export function usePortalAssets(folder = '') {
  return useQuery({
    queryKey: qk.portal.assets(folder),
    queryFn: () => portal.assets(folder),
  })
}

export function usePortalBilling() {
  return useQuery({
    queryKey: qk.portal.billing(),
    queryFn: () => portal.billing(),
  })
}

export function usePortalHosting() {
  return useQuery({
    queryKey: qk.portal.hosting(),
    queryFn: () => portal.hosting(),
  })
}

export function usePortalMessages() {
  return useQuery({
    queryKey: qk.portal.messages(),
    queryFn: () => portal.messages(),
  })
}

export function usePortalApprovals() {
  return useQuery({
    queryKey: qk.portal.approvals(),
    queryFn: () => portal.approvals(),
  })
}

export function usePortalProposals() {
  return useQuery({
    queryKey: qk.portal.proposals(),
    queryFn: () => portal.proposals(),
  })
}

export function usePortalProposal(id) {
  return useQuery({
    queryKey: qk.portal.proposal(id),
    queryFn: () => portal.proposal(id),
    enabled: !!id,
  })
}

export function usePortalMaintenance() {
  return useQuery({
    queryKey: qk.portal.maintenance(),
    queryFn: () => portal.maintenance(),
  })
}

export function usePortalKnowledge() {
  return useQuery({
    queryKey: qk.portal.knowledge(),
    queryFn: () => portal.knowledge(),
    staleTime: 10 * 60 * 1000, // knowledge changes slowly
  })
}

// ── Mutations ─────────────────────────────────────────────────

export function usePortalCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => portal.createTicket(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.portal.tickets() })
      qc.invalidateQueries({ queryKey: qk.portal.dashboard() })
    },
  })
}

// Optimistic ticket reply — the client's message lands in the
// conversation immediately, then is reconciled with server truth.
export function usePortalReplyToTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }) => portal.replyTicket(id, body),
    onMutate: async ({ id, body }) => {
      const key = qk.portal.ticket(id)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      const optimistic = {
        id: `tmp-${Date.now()}`,
        author: 'client',
        author_name: 'You',
        body,
        created_at: new Date().toISOString(),
        _optimistic: true,
      }
      qc.setQueryData(key, (old) => old ? {
        ...old,
        messages: [...(old.messages || []), optimistic],
      } : old)
      return { previous, key }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: qk.portal.ticket(id) })
      qc.invalidateQueries({ queryKey: qk.portal.tickets() })
    },
  })
}

// Update ticket (close / reopen / rate). Optimistic for status flips
// so the action feedback feels instant.
export function usePortalUpdateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }) => portal.updateTicket(id, body),
    onMutate: async ({ id, body }) => {
      const key = qk.portal.ticket(id)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData(key, (old) => {
        if (!old) return old
        const patch = {}
        if (body.action === 'close')  patch.status = 'closed'
        if (body.action === 'reopen') patch.status = 'open'
        if (body.action === 'rate' && body.satisfaction_rating != null) {
          patch.satisfaction_rating = body.satisfaction_rating
        }
        return { ...old, ticket: { ...old.ticket, ...patch, _optimistic: true } }
      })
      return { previous, key }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: (_d, _e, { id }) => {
      qc.invalidateQueries({ queryKey: qk.portal.ticket(id) })
      qc.invalidateQueries({ queryKey: qk.portal.tickets() })
      qc.invalidateQueries({ queryKey: qk.portal.dashboard() })
    },
  })
}

// Optimistic outbound message — same pattern as ticket reply.
export function usePortalSendMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => portal.sendMessage(body),
    onMutate: async (body) => {
      const key = qk.portal.messages()
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      const optimistic = {
        id: `tmp-${Date.now()}`,
        author: 'client',
        author_name: 'You',
        body,
        created_at: new Date().toISOString(),
        _optimistic: true,
      }
      qc.setQueryData(key, (old) => old ? {
        ...old,
        messages: [...(old.messages || []), optimistic],
      } : { messages: [optimistic] })
      return { previous, key }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.portal.messages() }),
  })
}

export function usePortalCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => portal.createAsset(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'assets'] })
      qc.invalidateQueries({ queryKey: qk.portal.dashboard() })
    },
  })
}

export function usePortalDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => portal.deleteAsset(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', 'assets'] })
      qc.invalidateQueries({ queryKey: qk.portal.dashboard() })
    },
  })
}

// Optimistic approval decision — the chip flips state immediately.
export function usePortalDecideApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, notes }) => portal.decideApproval(id, { decision, notes }),
    onMutate: async ({ id, decision, notes }) => {
      const key = qk.portal.approvals()
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData(key, (old) => old ? {
        ...old,
        approvals: (old.approvals || []).map(a =>
          a.id === id
            ? { ...a, status: decision, decision_notes: notes || a.decision_notes, _optimistic: true }
            : a
        ),
      } : old)
      return { previous, key }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.key, ctx.previous)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.portal.approvals() })
      qc.invalidateQueries({ queryKey: qk.portal.dashboard() })
    },
  })
}

export function usePortalSignProposal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, signature_name }) => portal.signProposal(id, signature_name),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: qk.portal.proposal(id) })
      qc.invalidateQueries({ queryKey: qk.portal.proposals() })
      qc.invalidateQueries({ queryKey: qk.portal.dashboard() })
    },
  })
}

// AI assistant — not a tracked query (turn-by-turn chat). Stays a
// pure mutation; the component owns the message-list state.
export function usePortalAIAssistant() {
  return useMutation({
    mutationFn: (messages) => portal.aiAssistant(messages),
  })
}
