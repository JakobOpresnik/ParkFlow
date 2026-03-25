import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
})

/**
 * Invalidate all parking-related queries so the UI reflects the freshest state.
 * Call this after any mutation that changes spot status, bookings, or overrides.
 */
export function invalidateAllSpotQueries() {
  void queryClient.invalidateQueries({ queryKey: ['spots'] })
  void queryClient.invalidateQueries({ queryKey: ['bookings'] })
  void queryClient.invalidateQueries({ queryKey: ['owners', 'me'] })
  void queryClient.invalidateQueries({ queryKey: ['changes'] })
  void queryClient.invalidateQueries({ queryKey: ['presence'] })
  void queryClient.invalidateQueries({ queryKey: ['lots'] })
}
