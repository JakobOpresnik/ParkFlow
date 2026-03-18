import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import type { Booking, BookingStatus } from '@/types'

import { formatDate } from './utils'

// — types —

interface BookingRowProps {
  readonly booking: Booking
}

// — constants —

const STATUS_BADGE: Record<BookingStatus, string> = {
  active: 'bg-spot-free text-white border-transparent',
  cancelled: 'bg-muted text-muted-foreground border-transparent',
  expired: 'bg-muted text-muted-foreground border-transparent',
}

// — main component —

export function BookingRow({ booking }: BookingRowProps) {
  const { t } = useTranslation()
  const STATUS_LABELS: Record<BookingStatus, string> = {
    active: t('bookings.statusActive'),
    cancelled: t('bookings.statusCancelled'),
    expired: t('bookings.statusExpired'),
  }
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
          <MapPin className="text-muted-foreground size-3.5" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Spot #{booking.spot_number}
            {booking.spot_label ? (
              <span className="text-muted-foreground ml-1 font-normal">
                · {booking.spot_label}
              </span>
            ) : null}
          </p>
          <p className="text-muted-foreground text-xs">
            {booking.spot_floor} · {formatDate(booking.booked_at)}
          </p>
        </div>
      </div>
      <Badge className={STATUS_BADGE[booking.status]}>
        {STATUS_LABELS[booking.status]}
      </Badge>
    </div>
  )
}
