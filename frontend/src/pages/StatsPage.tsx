import { useState } from 'react'
import { useSpots } from '@/hooks/useSpots'
import { useLots } from '@/hooks/useLots'
import { Select } from '@/components/ui/select'
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function StatsPage() {
  const { data: allSpots = [], isLoading: spotsLoading } = useSpots()
  const { data: lots = [], isLoading: lotsLoading } = useLots()
  const [selectedLotId, setSelectedLotId] = useState<string>('__all__')

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
          <Select
            value={selectedLotId}
            onChange={(v) => v && setSelectedLotId(v)}
            data={[
              { value: '__all__', label: 'All floors' },
              ...lots.map((lot) => ({ value: lot.id, label: lot.name })),
            ]}
            placeholder="All floors"
          />
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {segments.map((seg) => (
              <div
                key={seg.label}
                className="bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-sm"
              >
                <div
                  className="h-1 w-10 rounded-full"
                  style={{ background: `var(${seg.colorVar})` }}
                />
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">{seg.pct}%</p>
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

    </div>
  )
}
