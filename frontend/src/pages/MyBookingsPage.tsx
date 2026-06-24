import { notifications } from '@mantine/notifications'
import { Calendar, Clock, MapPin, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ExpiryProgress } from '@/components/ExpiryProgress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCancelBooking, useMyBookings } from '@/hooks/useBookings'
import { useRelativeTime } from '@/hooks/useRelativeTime'
import { useTimeRemaining } from '@/hooks/useTimeRemaining'
import { expiryProgressPct } from '@/lib/datetime'
import { useAuthStore } from '@/store/authStore'
import type { Booking, BookingStatus } from '@/types'

const STATUS_BADGE: Record<BookingStatus, string> = {
  active: 'bg-spot-free text-white border-transparent',
  cancelled: 'bg-muted text-muted-foreground border-transparent',
  expired: 'bg-muted text-muted-foreground border-transparent',
}

const STATUS_LABEL_KEYS: Record<BookingStatus, string> = {
  active: 'bookings.statusActive',
  cancelled: 'bookings.statusCancelled',
  expired: 'bookings.statusExpired',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface BookingCardProps {
  readonly booking: Booking
}

function BookingCard({ booking }: BookingCardProps) {
  const { t } = useTranslation()
  const cancelBooking = useCancelBooking()
  const timeRemaining = useTimeRemaining()
  const relativeTime = useRelativeTime()

  function handleCancel() {
    cancelBooking.mutate(booking.id, {
      onSuccess: () =>
        notifications.show({
          message: t('bookings.bookingCancelled'),
          color: 'green',
        }),
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error ? err.message : t('bookings.failedToCancel'),
          color: 'red',
        }),
    })
  }

  return (
    <div
      className={`bg-card rounded-lg border p-4 shadow-sm ${
        booking.status === 'active' ? 'border-l-spot-free border-l-4' : ''
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">
              {booking.spot_label ?? `#${booking.spot_number}`}
            </span>
            <Badge className={STATUS_BADGE[booking.status]}>
              {t(STATUS_LABEL_KEYS[booking.status])}
            </Badge>
          </div>

          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5" />
            {booking.spot_floor}
          </div>

          <div
            className="text-muted-foreground flex items-center gap-1.5 text-sm"
            title={formatDate(booking.booked_at)}
          >
            <Calendar className="size-3.5" />
            {t('bookings.booked', { date: relativeTime(booking.booked_at) })}
          </div>

          {booking.status === 'active' && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
              <Clock className="size-3.5" />
              {timeRemaining(booking.expires_at)} ·{' '}
              {t('bookings.until', { date: formatDate(booking.expires_at) })}
            </div>
          )}

          {booking.ended_at && booking.status !== 'active' && (
            <div
              className="text-muted-foreground flex items-center gap-1.5 text-sm"
              title={formatDate(booking.ended_at)}
            >
              <Clock className="size-3.5" />
              {t('bookings.ended', { date: relativeTime(booking.ended_at) })}
            </div>
          )}

          {booking.cancelled_by && (
            <div className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <XCircle className="size-3.5" />
              {t('bookings.cancelledByOwner', { name: booking.cancelled_by })}
            </div>
          )}
        </div>

        {booking.status === 'active' && (
          <Button
            size="sm"
            variant="ghost"
            color="red.7"
            className="w-full gap-2 sm:w-auto sm:shrink-0"
            disabled={cancelBooking.isPending}
            onClick={handleCancel}
          >
            <XCircle className="size-4" />
            {t('bookings.cancel')}
          </Button>
        )}
      </div>

      {booking.status === 'active' && (
        <ExpiryProgress
          pct={expiryProgressPct(
            booking.starts_at ?? booking.booked_at,
            booking.expires_at,
          )}
          className="mt-3"
        />
      )}
    </div>
  )
}

export function MyBookingsPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { data: bookings = [], isLoading } = useMyBookings()

  const active = bookings.filter((b) => b.status === 'active')
  const history = bookings.filter((b) => b.status !== 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('bookings.title')}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {user?.displayName
            ? t('bookings.subtitle', { name: user.displayName })
            : t('bookings.yourReservations')}
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="bg-card space-y-3 rounded-lg border p-4 shadow-sm"
            >
              <div className="bg-muted h-5 w-28 animate-pulse rounded" />
              <div className="bg-muted h-4 w-20 animate-pulse rounded" />
              <div className="bg-muted h-4 w-44 animate-pulse rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Calendar className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">
            {t('bookings.noBookings')}
          </p>
        </div>
      )}

      {!isLoading && active.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {t('bookings.active')}
            </h2>
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-700 tabular-nums dark:text-green-400">
              {active.length}
            </span>
          </div>
          {active.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </section>
      )}

      {!isLoading && history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
              {t('bookings.history')}
            </h2>
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium tabular-nums">
              {history.length}
            </span>
          </div>
          {history.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </section>
      )}
    </div>
  )
}
