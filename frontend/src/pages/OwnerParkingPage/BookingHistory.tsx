import { History, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSpotBookings } from '@/hooks/useOwnerParking'
import type { SpotBooking } from '@/types'

import type { BookingHistoryProps } from './types'
import { formatDateTime } from './utils'

// — constants —

const BookingStatusStyles: Record<string, string> = {
  active:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-muted text-muted-foreground',
}

// — sub-components —

export function BookingHistory({
  spotId,
  spotNumber,
  onClose,
}: BookingHistoryProps) {
  const { t, i18n } = useTranslation()
  const { data: bookings = [], isLoading } = useSpotBookings(spotId)
  const BOOKING_STATUS_LABELS: Record<string, string> = {
    active: t('ownerParking.statusActive'),
    cancelled: t('ownerParking.statusCancelled'),
    expired: t('ownerParking.statusExpired'),
  }

  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">
          {t('ownerParking.historyTitle', { number: spotNumber })}
        </h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7">
          {t('ownerParking.close')}
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-muted/50 h-20 animate-pulse" />
      ) : bookings.length === 0 ? (
        <div className="border-t px-4 py-8 text-center">
          <History className="text-muted-foreground mx-auto mb-2 size-5" />
          <p className="text-muted-foreground text-sm">
            {t('ownerParking.noPastBookings')}
          </p>
        </div>
      ) : (
        <div className="divide-y border-t">
          {bookings.map((b: SpotBooking) => (
            <div key={b.id} className="flex items-start gap-3 px-4 py-3">
              <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                <User className="text-muted-foreground size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {b.reserved_by ?? t('ownerParking.unknown')}
                  </span>
                  <Badge
                    className={`shrink-0 border-transparent text-[10px] ${BookingStatusStyles[b.status] ?? ''}`}
                  >
                    {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatDateTime(b.booked_at, i18n.language)} —{' '}
                  {formatDateTime(b.expires_at, i18n.language)}
                </p>
                {b.cancelled_by && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    {t('ownerParking.cancelledBy')} {b.cancelled_by}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
