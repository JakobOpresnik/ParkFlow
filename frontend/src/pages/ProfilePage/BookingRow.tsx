import { MapPin } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import type { Booking, BookingStatus } from '@/types'

import { formatDate } from './utils'

// — types —

interface BookingRowProps {
  readonly booking: Booking
}

// — constants —

const STATUS_CONFIG: Record<BookingStatus, { badge: string; label: string }> = {
  active: {
    badge: 'bg-spot-free text-white border-transparent',
    label: 'Active',
  },
  cancelled: {
    badge: 'bg-muted text-muted-foreground border-transparent',
    label: 'Cancelled',
  },
  expired: {
    badge: 'bg-muted text-muted-foreground border-transparent',
    label: 'Expired',
  },
}

// — main component —

export function BookingRow({ booking }: BookingRowProps) {
  const config = STATUS_CONFIG[booking.status]
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
      <Badge className={config.badge}>{config.label}</Badge>
    </div>
  )
}
