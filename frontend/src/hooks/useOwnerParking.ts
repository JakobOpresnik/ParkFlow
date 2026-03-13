import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
import { useAuthStore } from '@/store/authStore'

export function useOwnerMe() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me'],
    queryFn: api.getOwnerMe,
    enabled: !!token,
    retry: false,
  })
}

export function useOwnerSpots() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me', 'spots'],
    queryFn: api.getOwnerSpots,
    enabled: !!token,
    refetchInterval: 15_000,
    retry: false,
  })
}

export function useOwnerWeek(from: string, to: string) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me', 'week', from, to],
    queryFn: () => api.getOwnerWeek(from, to),
    enabled: !!token && !!from && !!to,
    staleTime: 60_000,
  })
}

export function useOwnerOverrides(from: string, to: string) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me', 'overrides', from, to],
    queryFn: () => api.getOwnerOverrides(from, to),
    enabled: !!token && !!from && !!to,
    staleTime: 30_000,
  })
}

export function useSetSpotDayStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      spotId,
      date,
      status,
    }: {
      spotId: string
      date: string
      status: 'free' | 'occupied' | null
    }) => api.setSpotDayStatus(spotId, date, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['owners', 'me', 'overrides'] })
      void qc.invalidateQueries({ queryKey: ['owners', 'me', 'spots'] })
      void qc.invalidateQueries({ queryKey: ['spots'] })
    },
  })
}

export function useSpotBookings(spotId: string | null) {
  return useQuery({
    queryKey: ['spots', spotId, 'bookings'],
    queryFn: () => api.getSpotBookings(spotId!),
    enabled: !!spotId,
  })
}
