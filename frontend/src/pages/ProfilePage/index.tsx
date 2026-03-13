import { CalendarCheck, Clock, TrendingUp, XCircle } from 'lucide-react'

import { StatCard } from '@/components/StatCard/StatCard'

import { ActiveBookingBanner } from './ActiveBookingBanner'
import { PreferencesCard } from './PreferencesCard'
import { RecentBookingsCard } from './RecentBookingsCard'
import { useBookingStats } from './useBookingStats'
import { useProfilePage } from './useProfilePage'
import { UserProfileCard } from './UserProfileCard'

// — main component —

export function ProfilePage() {
  const {
    user,
    lots,
    notifyOnBooking,
    notifyOnAvailability,
    preferredLotId,
    arrivalTime,
    reservationDuration,
    setNotifyOnBooking,
    setNotifyOnAvailability,
    setArrivalTime,
    setReservationDuration,
    handlePreferredLotChange,
  } = useProfilePage()

  const {
    isLoading,
    totalBookings,
    activeBookings,
    cancelledCount,
    expiredCount,
    activeBooking,
    utilizationPct,
    uniqueFloors,
    recentHistory,
  } = useBookingStats()

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Your account details and parking history
        </p>
      </div>

      <UserProfileCard
        user={user}
        totalBookings={totalBookings}
        utilizationPct={utilizationPct}
        uniqueFloors={uniqueFloors}
        isLoading={isLoading}
      />

      {!isLoading && activeBooking && (
        <ActiveBookingBanner booking={activeBooking} />
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={isLoading ? '—' : totalBookings}
          icon={CalendarCheck}
          colorClass="bg-primary/10 text-primary"
        />
        <StatCard
          label="Active"
          value={isLoading ? '—' : activeBookings.length}
          icon={Clock}
          colorClass="bg-green-500/15 text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Cancelled"
          value={isLoading ? '—' : cancelledCount}
          icon={XCircle}
          colorClass="bg-muted text-muted-foreground"
        />
        <StatCard
          label="Utilization"
          value={isLoading ? '—' : `${utilizationPct}%`}
          icon={TrendingUp}
          colorClass="bg-orange-500/15 text-orange-600 dark:text-orange-400"
        />
      </div>

      <PreferencesCard
        lots={lots}
        preferredLotId={preferredLotId}
        arrivalTime={arrivalTime}
        reservationDuration={reservationDuration}
        notifyOnBooking={notifyOnBooking}
        notifyOnAvailability={notifyOnAvailability}
        onPreferredLotChange={handlePreferredLotChange}
        onNotifyOnBookingChange={setNotifyOnBooking}
        onNotifyOnAvailabilityChange={setNotifyOnAvailability}
        onArrivalTimeChange={setArrivalTime}
        onReservationDurationChange={setReservationDuration}
      />

      <RecentBookingsCard bookings={recentHistory} isLoading={isLoading} />

      {!isLoading && expiredCount > 0 && (
        <p className="text-muted-foreground text-center text-xs">
          {expiredCount} booking{expiredCount === 1 ? '' : 's'} expired without
          cancellation
        </p>
      )}
    </div>
  )
}
