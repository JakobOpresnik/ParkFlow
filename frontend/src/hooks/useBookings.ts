import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createBooking,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['spots'] })
      void qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function useCancelBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.cancelBooking,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['spots'] })
      void qc.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}
