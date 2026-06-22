import { CalendarCheck, Clock, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatCard } from '@/components/StatCard/StatCard'

import { ActiveBookingBanner } from './ActiveBookingBanner'
import { PreferencesCard } from './PreferencesCard'
import { RecentBookingsCard } from './RecentBookingsCard'
import { useBookingStats } from './useBookingStats'
import { useProfilePage } from './useProfilePage'
import { UserProfileCard } from './UserProfileCard'
import { UtilizationRing } from './UtilizationRing'

// — main component —

export function ProfilePage() {
  const { t } = useTranslation()
  const {
    user,
    lots,
    preferredLotId,
    arrivalTime,
    reservationDuration,
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
        <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t('profile.subtitle')}
        </p>
      </div>

      <UserProfileCard
        user={user}
        uniqueFloors={uniqueFloors}
        isLoading={isLoading}
      />

      {!isLoading && activeBooking && (
        <ActiveBookingBanner booking={activeBooking} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card rounded-lg border p-4 text-center shadow-sm"
            >
              <div className="bg-muted mx-auto mb-3 size-10 animate-pulse rounded-full" />
              <div className="bg-muted mx-auto h-7 w-12 animate-pulse rounded" />
              <div className="bg-muted mx-auto mt-1.5 h-3 w-16 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label={t('profile.totalBookings')}
            value={totalBookings}
            icon={CalendarCheck}
            colorClass="bg-primary/10 text-primary"
          />
          <StatCard
            label={t('profile.active')}
            value={activeBookings.length}
            icon={Clock}
            colorClass="bg-green-500/15 text-green-600 dark:text-green-400"
          />
          <StatCard
            label={t('profile.cancelled')}
            value={cancelledCount}
            icon={XCircle}
            colorClass="bg-muted text-muted-foreground"
          />
          <UtilizationRing
            label={t('profile.utilization')}
            utilizationPct={utilizationPct}
            isLoading={false}
          />
        </div>
      )}

      <PreferencesCard
        lots={lots}
        preferredLotId={preferredLotId}
        arrivalTime={arrivalTime}
        reservationDuration={reservationDuration}
        onPreferredLotChange={handlePreferredLotChange}
        onArrivalTimeChange={setArrivalTime}
        onReservationDurationChange={setReservationDuration}
      />

      <RecentBookingsCard bookings={recentHistory} isLoading={isLoading} />

      {!isLoading && expiredCount > 0 && (
        <p className="text-muted-foreground text-center text-xs">
          {expiredCount === 1
            ? t('profile.expiredNote', { count: expiredCount })
            : t('profile.expiredNotePlural', { count: expiredCount })}
        </p>
      )}
    </div>
  )
}
