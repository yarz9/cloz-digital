// Single shared QueryClient with sensible defaults for a management
// dashboard: data is treated as fresh for 30s, retried once, and not
// auto-refetched on window focus (would feel noisy on busy tabs).
// Override per-hook when something truly needs to be hotter.

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
