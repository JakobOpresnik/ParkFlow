import { Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Booking } from '@/types'

import { formatDate, timeRemaining } from './utils'

// — types —

interface ActiveBookingBannerProps {
  readonly booking: Booking
}

// — main component —

export function ActiveBookingBanner({ booking }: ActiveBookingBannerProps) {
  const { t } = useTranslation()
  return (
    <div className="border-spot-free rounded-lg border border-l-4 bg-green-500/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-green-700 dark:text-green-400">
            {t('profile.activeBooking')}
          </p>
          <p className="mt-0.5 text-sm">
            {t('profile.spotLabel')}{' '}
            <span className="font-bold">#{booking.spot_number}</span>
            {booking.spot_label && (
              <span className="text-muted-foreground">
                {' '}
                · {booking.spot_label}
              </span>
            )}{' '}
            — {booking.spot_floor}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium text-green-700 dark:text-green-400">
            <Clock className="mr-1 inline size-3.5" />
            {timeRemaining(booking.expires_at)}
          </p>
          <p className="text-muted-foreground text-xs">
            {t('profile.until')} {formatDate(booking.expires_at)}
          </p>
        </div>
      </div>
    </div>
  )
}
