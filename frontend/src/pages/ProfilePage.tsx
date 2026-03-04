import { Link } from '@tanstack/react-router'
import {
  Bell,
  BellOff,
  Calendar,
  CalendarCheck,
  Clock,
  Hash,
  MapPin,
  ParkingCircle,
  ShieldCheck,
  TrendingUp,
  User,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useMyBookings } from '@/hooks/useBookings'
import { useLots } from '@/hooks/useLots'
import { useAuthStore } from '@/store/authStore'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'
import type { Booking, BookingStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
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

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  colorClass: string
}) {
  return (
    <div className="bg-card rounded-lg border p-4 text-center shadow-sm">
      <div
        className={`mx-auto mb-3 flex size-10 items-center justify-center rounded-full ${colorClass}`}
      >
        <Icon className="size-5" />
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
    </div>
  )
}

// ─── Recent booking row ───────────────────────────────────────────────────────

function BookingRow({ booking }: { booking: Booking }) {
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
        {STATUS_LABEL[booking.status]}
      </Badge>
    </div>
  )
}

// ─── Preference row ───────────────────────────────────────────────────────────

function PrefRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const { data: bookings = [], isLoading } = useMyBookings()
  const { data: lots = [] } = useLots()

  const notifyOnBooking = usePrefsStore((s) => s.notifyOnBooking)
  const notifyOnAvailability = usePrefsStore((s) => s.notifyOnAvailability)
  const preferredLotId = usePrefsStore((s) => s.preferredLotId)
  const setNotifyOnBooking = usePrefsStore((s) => s.setNotifyOnBooking)
  const setNotifyOnAvailability = usePrefsStore(
    (s) => s.setNotifyOnAvailability,
  )
  const setPreferredLotId = usePrefsStore((s) => s.setPreferredLotId)
  const setSelectedLotId = useParkingStore((s) => s.setSelectedLotId)

  function handlePreferredLotChange(id: string | null) {
    setPreferredLotId(id)
    setSelectedLotId(id)
  }

  const totalBookings = bookings.length
  const activeBookings = bookings.filter((b) => b.status === 'active')
  const cancelledCount = bookings.filter((b) => b.status === 'cancelled').length
  const expiredCount = bookings.filter((b) => b.status === 'expired').length
  const activeBooking = activeBookings[0] ?? null

  // Utilization rate: bookings that were actually used (active or expired, not cancelled)
  const usedCount = bookings.filter((b) => b.status !== 'cancelled').length
  const utilizationPct =
    totalBookings > 0 ? Math.round((usedCount / totalBookings) * 100) : 0

  // Unique parking lots the user has booked in
  const uniqueFloors = [...new Set(bookings.map((b) => b.spot_floor))]

  const recentHistory = bookings.slice(0, 5)

  if (!user) return null

  const initials = getInitials(user.displayName)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Your account details and parking history
        </p>
      </div>

      {/* User card */}
      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="bg-primary/10 text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-xl font-bold">
            {initials}
          </div>
          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{user.displayName}</h2>
              {user.role === 'admin' && (
                <Badge className="border-transparent bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  <ShieldCheck className="mr-1 size-3" />
                  Admin
                </Badge>
              )}
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" />
                {user.username}
              </span>
              <span className="flex items-center gap-1.5">
                <Hash className="size-3.5" />
                <span className="font-mono text-xs">{user.id}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Parking summary strip */}
        {!isLoading && (
          <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Total Bookings
              </p>
              <p className="mt-1 text-lg font-bold">{totalBookings}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Utilization
              </p>
              <p className="mt-1 text-lg font-bold">{utilizationPct}%</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Floors Used
              </p>
              <p className="mt-1 text-lg font-bold">
                {uniqueFloors.length > 0 ? uniqueFloors.join(', ') : '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Active booking banner */}
      {!isLoading && activeBooking && (
        <div className="border-spot-free rounded-lg border border-l-4 bg-green-500/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Active booking
              </p>
              <p className="mt-0.5 text-sm">
                Spot{' '}
                <span className="font-bold">#{activeBooking.spot_number}</span>
                {activeBooking.spot_label && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {activeBooking.spot_label}
                  </span>
                )}{' '}
                — {activeBooking.spot_floor}
              </p>
            </div>
            <div className="text-right text-sm">
              <p className="font-medium text-green-700 dark:text-green-400">
                <Clock className="mr-1 inline size-3.5" />
                {timeRemaining(activeBooking.expires_at)}
              </p>
              <p className="text-muted-foreground text-xs">
                until {formatDate(activeBooking.expires_at)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total Bookings"
          value={isLoading ? '—' : totalBookings}
          icon={CalendarCheck}
          colorClass="bg-primary/10 text-primary"
        />
        <StatCard
          label="Active"
          value={isLoading ? '—' : activeBookings.length}
          icon={Clock}
          colorClass="bg-green-500/15 text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Cancelled"
          value={isLoading ? '—' : cancelledCount}
          icon={XCircle}
          colorClass="bg-muted text-muted-foreground"
        />
        <StatCard
          label="Utilization"
          value={isLoading ? '—' : `${utilizationPct}%`}
          icon={TrendingUp}
          colorClass="bg-orange-500/15 text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-5 py-3">
          <h3 className="text-sm font-semibold">Preferences</h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Saved locally on this device
          </p>
        </div>
        <div className="divide-y px-5">
          <div className="py-4">
            <PrefRow
              icon={Bell}
              title="Reservation confirmations"
              description="Get notified when you book or cancel a spot"
            >
              <Switch
                checked={notifyOnBooking}
                onCheckedChange={setNotifyOnBooking}
              />
            </PrefRow>
          </div>
          <div className="py-4">
            <PrefRow
              icon={BellOff}
              title="Availability alerts"
              description="Get notified when preferred spots become available"
            >
              <Switch
                checked={notifyOnAvailability}
                onCheckedChange={setNotifyOnAvailability}
              />
            </PrefRow>
          </div>
          {lots.length > 0 && (
            <div className="py-4">
              <PrefRow
                icon={ParkingCircle}
                title="Preferred parking lot"
                description="Default lot shown when browsing the map"
              >
                <Select
                  value={preferredLotId ?? ''}
                  onChange={(v) => handlePreferredLotChange(v ?? null)}
                  clearable
                  placeholder="Any lot"
                  className="w-36 text-xs"
                  data={lots.map((lot) => ({
                    value: lot.id,
                    label: lot.name,
                  }))}
                />
              </PrefRow>
            </div>
          )}
        </div>
      </div>

      {/* Recent bookings */}
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

        {!isLoading && recentHistory.length === 0 && (
          <div className="p-8 text-center">
            <Calendar className="text-muted-foreground mx-auto mb-2 size-8" />
            <p className="text-muted-foreground text-sm">No bookings yet.</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Book a spot from the{' '}
              <Link
                to="/"
                className="text-primary underline underline-offset-2"
              >
                parking map
              </Link>
              .
            </p>
          </div>
        )}

        {!isLoading && recentHistory.length > 0 && (
          <div className="divide-y px-5">
            {recentHistory.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>

      {/* Expired stat — shown only when there are expired bookings */}
      {!isLoading && expiredCount > 0 && (
        <p className="text-muted-foreground text-center text-xs">
          {expiredCount} booking{expiredCount !== 1 ? 's' : ''} expired without
          cancellation
        </p>
      )}
    </div>
  )
}
