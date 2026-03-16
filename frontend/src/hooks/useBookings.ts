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
      void qc.invalidateQueries({ queryKey: ['owners', 'me'] })
    },
  })
}

export function useUpdateBookingTimes() {
  const qc = useQueryClient()
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
      void qc.invalidateQueries({ queryKey: ['owners', 'me'] })
    },
  })
}
