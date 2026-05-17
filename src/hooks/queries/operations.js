// Operations query hooks. Today: just SOP list (used by the Service
// Desk "Convert → SOP" panel). Will grow as Operations is migrated.

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/fetcher'
import { qk } from './keys'

export function useOperationsSops() {
  return useQuery({
    queryKey: qk.operations.sops(),
    queryFn: () => api.get('/api/operations/sops'),
    staleTime: 5 * 60 * 1000, // SOPs change rarely
  })
}
