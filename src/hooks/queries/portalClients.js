// Portal Clients query hooks. Backed by /api/portal-admin.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { qk } from './keys'

export function usePortalClients() {
  return useQuery({
    queryKey: qk.portalClients.list(),
    queryFn: () => api.get('/api/portal-admin/clients'),
  })
}

export function usePortalClient(id) {
  return useQuery({
    queryKey: qk.portalClients.detail(id),
    queryFn: () => api.get(`/api/portal-admin/clients/${id}`),
    enabled: !!id,
  })
}

export function useOnboardPortalClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.post('/api/portal-admin/clients', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.portalClients.all }),
  })
}

export function useUpdatePortalClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => api.patch(`/api/portal-admin/clients/${id}`, patch),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: qk.portalClients.detail(id) })
      qc.invalidateQueries({ queryKey: qk.portalClients.list() })
    },
  })
}

export function useDeletePortalClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/api/portal-admin/clients/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.portalClients.all }),
  })
}

export function useRotatePortalToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.post(`/api/portal-admin/clients/${id}/rotate-token`),
    onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: qk.portalClients.detail(id) }),
  })
}
