import { useQuery } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'

import { api } from '@/api'
import { invalidateAllSpotQueries } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'

export function useMyBookings() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['bookings', 'my'],
    queryFn: api.getMyBookings,
    enabled: !!token,
  })
}

export function useCreateBooking() {
  return useMutation({
    mutationFn: api.createBooking,
    onSuccess: invalidateAllSpotQueries,
  })
}

export function useUpdateBookingTimes() {
  return useMutation({
    mutationFn: ({
      id,
      starts_at,
      expires_at,
    }: {
      id: string
      starts_at: string
      expires_at: string
    }) => api.updateBookingTimes(id, { starts_at, expires_at }),
    onSuccess: invalidateAllSpotQueries,
  })
}

export function useCancelBooking() {
  return useMutation({
    mutationFn: api.cancelBooking,
    onSuccess: invalidateAllSpotQueries,
  })
}
