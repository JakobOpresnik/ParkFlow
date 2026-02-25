import { ParkingCircle, CheckCircle2, Clock, Activity } from 'lucide-react'
import { useSpots } from '@/hooks/useSpots'
import { useLots } from '@/hooks/useLots'
import { useChanges } from '@/hooks/useChanges'
import type { SpotStatus } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHANGE_TYPE_LABEL: Record<string, string> = {
  owner_assigned: 'Owner assigned',
  owner_unassigned: 'Owner unassigned',
  status_changed: 'Status changed',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Lot occupancy mini-bar ────────────────────────────────────────────────────

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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground tabular-nums">
          {free} free / {total} total
        </span>
      </div>
      <div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${occupiedPct}%`, background: 'var(--color-spot-occupied)' }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${reservedPct}%`, background: 'var(--color-spot-reserved)' }}
        />
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${freePct}%`, background: 'var(--color-spot-free)' }}
        />
      </div>
      <div className="text-muted-foreground flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ background: 'var(--color-spot-free)' }} />
          {free} free
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ background: 'var(--color-spot-occupied)' }} />
          {occupied} occupied
        </span>
        {reserved > 0 && (
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: 'var(--color-spot-reserved)' }} />
            {reserved} reserved
          </span>
        )}
      </div>
    </div>
  )
}

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
  const occupancyPct = total ? Math.round(((totalOccupied + totalReserved) / total) * 100) : 0

  const statCards = [
    {
      label: 'Free spots',
      value: totalFree,
      sub: `of ${total} total`,
      Icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      label: 'Occupied',
      value: totalOccupied,
      sub: `${occupancyPct}% occupancy`,
      Icon: ParkingCircle,
      color: 'text-red-500',
    },
    {
      label: 'Reserved',
      value: totalReserved,
      sub: 'booked spots',
      Icon: Clock,
      color: 'text-yellow-500',
    },
    {
      label: 'Recent changes',
      value: changes.length,
      sub: 'in audit log',
      Icon: Activity,
      color: 'text-primary',
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

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-muted h-24 animate-pulse rounded-lg border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(({ label, value, sub, Icon, color }) => (
            <div
              key={label}
              className="bg-card flex flex-col gap-1.5 rounded-lg border p-4 shadow-sm"
            >
              <Icon className={`size-4 ${color}`} />
              <p className="text-3xl font-bold tabular-nums">{value}</p>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-muted-foreground text-xs">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Per-lot breakdown */}
      {!isLoading && lots.length > 0 && (
        <div className="bg-card rounded-lg border p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Availability by location</h2>
          <div className="space-y-5">
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

      {/* Recent changes */}
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent changes</h2>
          <p className="text-muted-foreground text-xs">Last 50 · auto-refreshes every 15s</p>
        </div>

        {changesLoading && (
          <div className="bg-muted m-4 h-24 animate-pulse rounded" />
        )}

        {!changesLoading && changes.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No changes recorded yet. Assign owners or change statuses to see activity.
          </p>
        )}

        {!changesLoading && changes.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-muted-foreground border-b text-xs">
                  <th className="px-4 py-2 text-left font-medium">Time</th>
                  <th className="px-4 py-2 text-left font-medium">Spot</th>
                  <th className="px-4 py-2 text-left font-medium">Change</th>
                  <th className="px-4 py-2 text-left font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((change) => (
                  <tr key={change.id} className="border-b last:border-0">
                    <td className="text-muted-foreground px-4 py-2 text-xs whitespace-nowrap">
                      {formatTime(change.changed_at)}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium">
                      #{change.spot_number}
                      {change.spot_label && (
                        <span className="text-muted-foreground ml-1 font-normal">
                          {change.spot_label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {CHANGE_TYPE_LABEL[change.change_type] ?? change.change_type}
                    </td>
                    <td className="text-muted-foreground px-4 py-2 text-sm">
                      {change.old_value ?? '—'}
                      {' → '}
                      {change.new_value ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
