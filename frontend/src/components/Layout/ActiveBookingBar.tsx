import { Link, useRouterState } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { Clock, ParkingCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useMyBookings } from '@/hooks/useBookings'
import { useLotName } from '@/hooks/useLotName'
import { expiryProgressPct } from '@/lib/datetime'
import { useAuthStore } from '@/store/authStore'

// — helpers —

function remainingLabel(expiresAt: string, now: number, t: TFunction): string {
  const ms = new Date(expiresAt).getTime() - now
  if (ms <= 0) return t('bookings.expired')
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0
    ? t('bookings.remaining', { h, m })
    : t('bookings.remainingMins', { m })
}

// — components —

// Slim, app-wide banner shown on every page while the user holds an active
// reservation (spot label, floor, live countdown) so the booking stays visible
// beyond the Profile page. Renders nothing when there's no active booking.
function ActiveBookingBarInner() {
  const { t } = useTranslation()
  const tLot = useLotName()
  const { data: bookings = [] } = useMyBookings()

  // Re-tick about once a minute so the countdown stays fresh on whatever page
  // the bar happens to be sitting on.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const active = bookings.find((b) => b.status === 'active')
  if (!active) return null

  const label = active.spot_label ?? `#${active.spot_number}`
  const pct = expiryProgressPct(
    active.starts_at ?? active.booked_at,
    active.expires_at,
    now,
  )

  return (
    <Link
      to="/my-bookings"
      aria-label={`${t('profile.activeBooking')}: ${label}`}
      className="group relative flex shrink-0 cursor-pointer items-center gap-2 border-b border-green-600/20 bg-green-500/10 px-4 py-1.5 text-sm text-green-800 transition-all hover:bg-green-500/20 hover:shadow-sm dark:text-green-300"
    >
      <ParkingCircle className="size-4 shrink-0 transition-transform group-hover:-translate-y-0.5" />
      <span className="font-semibold">{label}</span>
      <span className="text-green-700/70 dark:text-green-400/70">
        · {tLot(active.spot_floor)}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1 text-xs font-medium">
        <Clock className="size-3.5" />
        {remainingLabel(active.expires_at, now, t)}
      </span>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-0.5 bg-green-500/60 transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </Link>
  )
}

// Guests can't hold bookings (GET /api/bookings/my is non-guest), so skip the
// component — and its request — entirely for them. The Profile page renders its
// own richer active-booking banner, so suppress the slim one there to avoid
// showing the reservation twice.
export function ActiveBookingBar() {
  const role = useAuthStore((s) => s.user?.role)
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (role === 'guest') return null
  if (pathname === '/profile') return null
  return <ActiveBookingBarInner />
}
