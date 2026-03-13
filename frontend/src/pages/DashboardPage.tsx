import { Activity, CheckCircle2, Clock, ParkingCircle } from 'lucide-react'

import { useChanges } from '@/hooks/useChanges'
import { useLots } from '@/hooks/useLots'
import { useSpots } from '@/hooks/useSpots'
import type { SpotStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatAbsTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function changeDotClass(changeType: string, newValue: string | null): string {
  if (changeType === 'status_changed') {
    if (newValue === 'free') return 'bg-spot-free'
    if (newValue === 'occupied') return 'bg-spot-occupied'
    if (newValue === 'reserved') return 'bg-spot-reserved'
  }
  if (changeType === 'owner_assigned') return 'bg-primary'
  return 'bg-muted-foreground/40'
}

function changeDesc(changeType: string, newValue: string | null): string {
  if (changeType === 'status_changed' && newValue) return `→ ${newValue}`
  if (changeType === 'owner_assigned' && newValue) return `owner → ${newValue}`
  if (changeType === 'owner_unassigned') return 'owner removed'
  return changeType.replace(/_/g, ' ')
}

// ─── Lot occupancy bar ────────────────────────────────────────────────────────

function LotBar({
  name,
  free,
  occupied,
  reserved,
  total,
}: {
  name: string
  free: number
  occupied: number
  reserved: number
  total: number
}) {
  const freePct = total ? (free / total) * 100 : 0
  const occupiedPct = total ? (occupied / total) * 100 : 0
  const reservedPct = total ? (reserved / total) * 100 : 0

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {free}
          <span className="text-muted-foreground/40 mx-0.5">/</span>
          {total}
        </span>
      </div>
      <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${occupiedPct}%`,
            background: 'var(--color-spot-occupied)',
          }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${reservedPct}%`,
            background: 'var(--color-spot-reserved)',
          }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${freePct}%`,
            background: 'var(--color-spot-free)',
          }}
        />
      </div>
    </div>
  )
}

const LOT_LEGEND = [
  { label: 'Free', color: 'var(--color-spot-free)' },
  { label: 'Occupied', color: 'var(--color-spot-occupied)' },
  { label: 'Reserved', color: 'var(--color-spot-reserved)' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: allSpots = [], isLoading: spotsLoading } = useSpots()
  const { data: lots = [], isLoading: lotsLoading } = useLots()
  const { data: changes = [], isLoading: changesLoading } = useChanges()

  const isLoading = spotsLoading || lotsLoading

  const countByStatus = (spots: typeof allSpots, status: SpotStatus) =>
    spots.filter((s) => s.status === status).length

  const totalFree = countByStatus(allSpots, 'free')
  const totalOccupied = countByStatus(allSpots, 'occupied')
  const totalReserved = countByStatus(allSpots, 'reserved')
  const total = allSpots.length
  const occupancyPct = total
    ? Math.round(((totalOccupied + totalReserved) / total) * 100)
    : 0

  const supportingCards = [
    {
      label: 'Occupied',
      value: totalOccupied,
      sub: `${occupancyPct}% occupancy`,
      Icon: ParkingCircle,
      iconColor: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      cardClass:
        'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20',
    },
    {
      label: 'Reserved',
      value: totalReserved,
      sub: 'booked spots',
      Icon: Clock,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      cardClass:
        'border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20',
    },
    {
      label: 'Total spots',
      value: total,
      sub: 'across all lots',
      Icon: Activity,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      cardClass: 'bg-card',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Live overview · auto-refreshes every 15s
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="bg-muted h-24 animate-pulse rounded-xl border" />
          <div className="grid grid-cols-3 gap-3">
            {([0, 1, 2] as const).map((k) => (
              <div
                key={k}
                className="bg-muted h-[88px] animate-pulse rounded-xl border"
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Hero */}
          <div className="flex items-center gap-5 rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm dark:border-green-900/40 dark:bg-green-950/20">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-5xl leading-none font-bold tabular-nums">
                {totalFree}
              </p>
              <p className="mt-1.5 text-sm font-medium">
                spots available right now
              </p>
              <p className="text-muted-foreground text-xs">
                of {total} total · {occupancyPct}% occupied
              </p>
            </div>
          </div>

          {/* Supporting */}
          <div className="grid grid-cols-3 gap-3">
            {supportingCards.map(
              ({ label, value, sub, Icon, iconColor, iconBg, cardClass }) => (
                <div
                  key={label}
                  className={`flex flex-col gap-1.5 rounded-xl border p-3 shadow-sm sm:gap-2 sm:p-4 ${cardClass}`}
                >
                  <div
                    className={`flex size-7 items-center justify-center rounded-full sm:size-8 ${iconBg}`}
                  >
                    <Icon className={`size-3.5 sm:size-4 ${iconColor}`} />
                  </div>
                  <p className="text-xl font-bold tabular-nums sm:text-2xl">
                    {value}
                  </p>
                  <div>
                    <p className="text-xs font-medium sm:text-sm">{label}</p>
                    <p className="text-muted-foreground text-[11px] sm:text-xs">
                      {sub}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* Two-column: lot breakdown + activity feed */}
      {!isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Lot breakdown */}
          {lots.length > 0 && (
            <div className="bg-card rounded-xl border shadow-sm">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">By location</h2>
                <div className="flex items-center gap-3">
                  {LOT_LEGEND.map(({ label, color }) => (
                    <span
                      key={label}
                      className="text-muted-foreground flex items-center gap-1 text-[11px]"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ background: color }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4 p-4">
                {lots.map((lot) => {
                  const lotSpots = allSpots.filter((s) => s.lot_id === lot.id)
                  return (
                    <LotBar
                      key={lot.id}
                      name={lot.name}
                      free={countByStatus(lotSpots, 'free')}
                      occupied={countByStatus(lotSpots, 'occupied')}
                      reserved={countByStatus(lotSpots, 'reserved')}
                      total={lotSpots.length}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Activity feed */}
          <div
            className={`bg-card rounded-xl border shadow-sm ${lots.length === 0 ? 'lg:col-span-2' : ''}`}
          >
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <p className="text-muted-foreground text-xs">
                Last 50 · auto-refreshes every 15s
              </p>
            </div>

            {changesLoading && (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 4].map((i) => (
                  <div key={i} className="bg-muted h-8 animate-pulse rounded" />
                ))}
              </div>
            )}

            {!changesLoading && changes.length === 0 && (
              <div className="p-8 text-center">
                <Activity className="text-muted-foreground mx-auto mb-2 size-6" />
                <p className="text-muted-foreground text-sm">
                  No activity yet. Assign owners or change statuses to see
                  events here.
                </p>
              </div>
            )}

            {!changesLoading && changes.length > 0 && (
              <div className="divide-y">
                {changes.map((change) => (
                  <div
                    key={change.id}
                    className="flex items-start gap-3 px-4 py-2.5"
                  >
                    <div
                      className={`mt-[7px] size-1.5 shrink-0 rounded-full ${changeDotClass(change.change_type, change.new_value)}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
                        <span className="text-sm font-medium">
                          #{change.spot_number}
                        </span>
                        {change.spot_label && (
                          <span className="text-muted-foreground text-xs">
                            {change.spot_label}
                          </span>
                        )}
                        <span className="text-muted-foreground text-xs">
                          {changeDesc(change.change_type, change.new_value)}
                        </span>
                      </div>
                    </div>
                    <time
                      className="text-muted-foreground mt-0.5 shrink-0 text-xs whitespace-nowrap"
                      title={formatAbsTime(change.changed_at)}
                    >
                      {relativeTime(change.changed_at)}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
