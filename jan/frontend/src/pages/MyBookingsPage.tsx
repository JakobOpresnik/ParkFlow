import { Calendar, Clock, MapPin, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMyBookings, useCancelBooking } from '@/hooks/useBookings'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { Booking, BookingStatus } from '@/types'

const STATUS_BADGE: Record<BookingStatus, string> = {
  active: 'bg-spot-free text-white border-transparent',
  cancelled: 'bg-muted text-muted-foreground border-transparent',
  expired: 'bg-muted text-muted-foreground border-transparent',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  active: 'Active',
  cancelled: 'Cancelled',
  expired: 'Expired',
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

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m remaining` : `${m}m remaining`
}

interface BookingCardProps {
  booking: Booking
}

function BookingCard({ booking }: BookingCardProps) {
  const cancelBooking = useCancelBooking()

  function handleCancel() {
    cancelBooking.mutate(booking.id, {
      onSuccess: () => toast.success('Booking cancelled'),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Failed to cancel'),
    })
  }

  return (
    <div
      className={`bg-card rounded-lg border p-4 shadow-sm ${
        booking.status === 'active' ? 'border-l-spot-free border-l-4' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">#{booking.spot_number}</span>
            {booking.spot_label && (
              <span className="text-muted-foreground text-sm">
                {booking.spot_label}
              </span>
            )}
            <Badge className={STATUS_BADGE[booking.status]}>
              {STATUS_LABEL[booking.status]}
            </Badge>
          </div>

          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <MapPin className="size-3.5" />
            {booking.spot_floor}
          </div>

          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Calendar className="size-3.5" />
            Booked {formatDate(booking.booked_at)}
          </div>

          {booking.status === 'active' && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400">
              <Clock className="size-3.5" />
              {timeRemaining(booking.expires_at)} · until{' '}
              {formatDate(booking.expires_at)}
            </div>
          )}

          {booking.ended_at && booking.status !== 'active' && (
            <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Clock className="size-3.5" />
              Ended {formatDate(booking.ended_at)}
            </div>
          )}
        </div>

        {booking.status === 'active' && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive shrink-0"
            disabled={cancelBooking.isPending}
            onClick={handleCancel}
          >
            <XCircle className="mr-1 size-4" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

export function MyBookingsPage() {
  const user = useAuthStore((s) => s.user)
  const { data: bookings = [], isLoading } = useMyBookings()

  const active = bookings.filter((b) => b.status === 'active')
  const history = bookings.filter((b) => b.status !== 'active')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Bookings</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {user?.displayName ?? 'Your'} parking reservations
        </p>
      </div>

      {isLoading && (
        <div className="bg-muted h-24 animate-pulse rounded-lg border" />
      )}

      {!isLoading && bookings.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <Calendar className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">
            No bookings yet. Book a free spot from the parking map.
          </p>
        </div>
      )}

      {!isLoading && active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-wide uppercase opacity-60">
            Active
          </h2>
          {active.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </section>
      )}

      {!isLoading && history.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium tracking-wide uppercase opacity-60">
            History
          </h2>
          {history.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </section>
      )}
    </div>
  )
}
