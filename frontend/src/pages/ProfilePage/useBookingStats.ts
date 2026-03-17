import { useMyBookings } from '@/hooks/useBookings'

export function useBookingStats() {
  const { data: bookings = [], isLoading } = useMyBookings()

  const totalBookings = bookings.length
  const activeBookings = bookings.filter((b) => b.status === 'active')
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length
  const expiredCount = bookings.filter((b) => b.status === 'expired').length
  const activeBooking = activeBookings[0] ?? null
  const usedCount = bookings.filter((b) => b.status !== 'cancelled').length
  const utilizationPct =
    totalBookings > 0 ? Math.round((usedCount / totalBookings) * 100) : 0
  const uniqueFloors = [...new Set(bookings.map((b) => b.spot_floor))]
  const recentHistory = bookings.slice(0, 5)

  return {
    isLoading,
    totalBookings,
    activeBookings,
    activeBooking,
    cancelledCount,
    expiredCount,
    utilizationPct,
    uniqueFloors,
    recentHistory,
  }
}
