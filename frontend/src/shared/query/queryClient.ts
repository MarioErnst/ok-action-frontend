import { QueryClient } from '@tanstack/react-query'

// Single shared QueryClient instance for the whole app.
// Defaults are conservative: no automatic refetch on window focus
// (mobile users open/close the browser frequently and we don't want surprise reloads)
// and a 30s stale time so navigation between cached pages stays snappy.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
