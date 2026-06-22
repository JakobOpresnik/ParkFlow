import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { useRelativeTime } from '@/hooks/useRelativeTime'
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
  const relativeTime = useRelativeTime()
  const STATUS_LABELS: Record<BookingStatus, string> = {
    active: t('bookings.statusActive'),
    cancelled: t('bookings.statusCancelled'),
    expired: t('bookings.statusExpired'),
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
          <MapPin className="text-muted-foreground size-3.5" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Spot {booking.spot_label ?? `#${booking.spot_number}`}
          </p>
          <p
            className="text-muted-foreground text-xs"
            title={formatDate(booking.booked_at)}
          >
            {booking.spot_floor} · {relativeTime(booking.booked_at)}
          </p>
        </div>
      </div>
      <Badge className={STATUS_BADGE[booking.status]}>
        {STATUS_LABELS[booking.status]}
      </Badge>
    </div>
  )
}
