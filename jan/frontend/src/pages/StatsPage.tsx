import { useState } from 'react'
import { useSpots } from '@/hooks/useSpots'
import { useLots } from '@/hooks/useLots'
import { useChanges } from '@/hooks/useChanges'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SpotStatus } from '@/types'

// ─── Donut chart ─────────────────────────────────────────────────────────────

interface Segment {
  label: string
  count: number
  pct: number
  colorVar: string
}

interface DonutSlice extends Segment {
  dashLen: number
  startAngle: number
}

function buildSlices(segments: Segment[], total: number): DonutSlice[] {
  const circ = 2 * Math.PI * 72
  const GAP_DEG = total > 1 ? 2 : 0
  let accumulated = 0
  return segments.map((seg) => {
    const pct = seg.count / total
    const angleDeg = pct * 360
    const dashLen = Math.max(0, ((angleDeg - GAP_DEG) / 360) * circ)
    const startAngle = accumulated * 360 - 90
    accumulated += pct
    return { ...seg, dashLen, startAngle }
  })
}

function DonutChart({
  segments,
  total,
}: {
  segments: Segment[]
  total: number
}) {
  const r = 72
  const cx = 100
  const cy = 100
  const circ = 2 * Math.PI * r
  const slices = buildSlices(segments, total)

  return (
    <svg viewBox="0 0 200 200" className="size-52 drop-shadow-sm">
      {slices.map((slice) => {
        if (slice.count === 0) return null
        return (
          <circle
            key={slice.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            strokeWidth="28"
            strokeDasharray={`${slice.dashLen} ${circ}`}
            transform={`rotate(${slice.startAngle} ${cx} ${cy})`}
            style={{ stroke: `var(${slice.colorVar})` }}
          />
        )
      })}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={28}
        fontWeight={700}
        className="fill-foreground"
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        className="fill-muted-foreground"
      >
        total spots
      </text>
    </svg>
  )
}

function StatusProgressRow({ seg, total }: { seg: Segment; total: number }) {
  const barWidth = total > 0 ? (seg.count / total) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: `var(${seg.colorVar})` }}
          />
          <span className="font-medium">{seg.label}</span>
        </div>
        <span className="text-muted-foreground tabular-nums">
          {seg.count} · {seg.pct}%
        </span>
      </div>
      <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, background: `var(${seg.colorVar})` }}
        />
      </div>
    </div>
  )
}

const STATUS_META: Record<SpotStatus, { label: string; colorVar: string }> = {
  free: { label: 'Free', colorVar: '--color-spot-free' },
  occupied: { label: 'Occupied', colorVar: '--color-spot-occupied' },
  reserved: { label: 'Reserved', colorVar: '--color-spot-reserved' },
}

// ─── Audit log table ──────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StatsPage() {
  const { data: allSpots = [], isLoading: spotsLoading } = useSpots()
  const { data: lots = [], isLoading: lotsLoading } = useLots()
  const [selectedLotId, setSelectedLotId] = useState<string>('__all__')

  const { data: changes = [], isLoading: changesLoading } = useChanges(
    selectedLotId === '__all__' ? undefined : selectedLotId,
  )

  const isLoading = spotsLoading || lotsLoading

  // Filter spots for the selected lot
  const spots =
    selectedLotId === '__all__'
      ? allSpots
      : allSpots.filter((s) => s.lot_id === selectedLotId)

  const total = spots.length
  const counts: Record<SpotStatus, number> = {
    free: spots.filter((s) => s.status === 'free').length,
    occupied: spots.filter((s) => s.status === 'occupied').length,
    reserved: spots.filter((s) => s.status === 'reserved').length,
  }

  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0)

  const segments: Segment[] = (
    ['free', 'occupied', 'reserved'] as SpotStatus[]
  ).map((s) => ({
    label: STATUS_META[s].label,
    count: counts[s],
    pct: pct(counts[s]),
    colorVar: STATUS_META[s].colorVar,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Statistics</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Parking utilization overview
          </p>
        </div>

        {/* Lot filter */}
        {!isLoading && lots.length > 0 && (
          <Select value={selectedLotId} onValueChange={setSelectedLotId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All floors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All floors</SelectItem>
              {lots.map((lot) => (
                <SelectItem key={lot.id} value={lot.id}>
                  {lot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {isLoading && (
        <div className="bg-muted h-64 animate-pulse rounded-lg border" />
      )}

      {!isLoading && total === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          No data — run the database migration to add spots.
        </div>
      )}

      {!isLoading && total > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {segments.map((seg) => (
              <div
                key={seg.label}
                className="bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-sm"
              >
                <div
                  className="h-1 w-10 rounded-full"
                  style={{ background: `var(${seg.colorVar})` }}
                />
                <p className="text-3xl font-bold tabular-nums">{seg.pct}%</p>
                <p className="text-muted-foreground text-sm">{seg.label}</p>
                <p className="text-xs font-medium">
                  {seg.count} / {total} spots
                </p>
              </div>
            ))}
          </div>

          {/* Chart + breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card flex flex-col items-center justify-center gap-4 rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground self-start text-sm font-medium">
                Distribution
              </p>
              <DonutChart segments={segments} total={total} />
              <div className="flex flex-wrap justify-center gap-4">
                {segments.map((seg) => (
                  <div
                    key={seg.label}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: `var(${seg.colorVar})` }}
                    />
                    {seg.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground mb-4 text-sm font-medium">
                Breakdown
              </p>
              <div className="space-y-5">
                {segments.map((seg) => (
                  <StatusProgressRow key={seg.label} seg={seg} total={total} />
                ))}
              </div>
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Occupancy rate</span>
                  <span className="font-semibold">
                    {pct(counts.occupied + counts.reserved)}%
                  </span>
                </div>
                <div className="bg-muted mt-2 h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct(counts.occupied + counts.reserved)}%`,
                    }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {counts.occupied + counts.reserved} of {total} spots in use
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Audit log */}
      <div className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Recent changes</h2>
          <p className="text-muted-foreground text-xs">
            Last 50 · auto-refreshes every 15s
          </p>
        </div>

        {changesLoading && (
          <div className="bg-muted m-4 h-24 animate-pulse rounded" />
        )}

        {!changesLoading && changes.length === 0 && (
          <p className="text-muted-foreground p-6 text-center text-sm">
            No changes recorded yet. Assign owners or change statuses to see
            activity.
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
              <tbody className="px-4">
                {changes.map((change) => (
                  <tr key={change.id} className="border-b px-4 last:border-0">
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
                      {CHANGE_TYPE_LABEL[change.change_type] ??
                        change.change_type}
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
