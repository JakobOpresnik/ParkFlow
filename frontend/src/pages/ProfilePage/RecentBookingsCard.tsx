import { Link } from '@tanstack/react-router'
import { Calendar } from 'lucide-react'

import type { Booking } from '@/types'

import { BookingRow } from './BookingRow'

// — types —

interface RecentBookingsCardProps {
  readonly bookings: Booking[]
  readonly isLoading: boolean
}

// — main component —

export function RecentBookingsCard({
  bookings,
  isLoading,
}: RecentBookingsCardProps) {
  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h3 className="text-sm font-semibold">Recent Bookings</h3>
        <Link
          to="/my-bookings"
          className="text-primary hover:text-primary/80 text-xs transition-colors"
        >
          View all
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3 p-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-12 animate-pulse rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="p-8 text-center">
          <Calendar className="text-muted-foreground mx-auto mb-2 size-8" />
          <p className="text-muted-foreground text-sm">No bookings yet.</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Book a spot from the{' '}
            <Link to="/" className="text-primary underline underline-offset-2">
              parking map
            </Link>
            .
          </p>
        </div>
      )}

      {!isLoading && bookings.length > 0 && (
        <div className="divide-y px-5">
          {bookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  )
}
