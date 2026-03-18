import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Select } from '@/components/ui/select'
import { useLots } from '@/hooks/useLots'
import { useSpots } from '@/hooks/useSpots'
import type { SpotStatus } from '@/types'

// — types —

interface Segment {
  readonly label: string
  readonly count: number
  readonly pct: number
  readonly colorVar: string
}

interface DonutSlice extends Segment {
  readonly dashLen: number
  readonly startAngle: number
}

interface DonutChartProps {
  readonly segments: Segment[]
  readonly total: number
}

interface StatusProgressRowProps {
  readonly segment: Segment
  readonly total: number
}

// — constants —

const DONUT_RADIUS = 72

const StatusColorVar: Record<SpotStatus, string> = {
  free: '--color-spot-free',
  occupied: '--color-spot-occupied',
  reserved: '--color-spot-reserved',
}

// — helpers —

function computePct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

function buildSlices(segments: Segment[], total: number): DonutSlice[] {
  const circ = 2 * Math.PI * DONUT_RADIUS
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

// — sub-components —

function TotalSpotsText({
  cx,
  cy,
}: {
  readonly cx: number
  readonly cy: number
}) {
  const { t } = useTranslation()
  return (
    <text
      x={cx}
      y={cy + 18}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={11}
      className="fill-muted-foreground"
    >
      {t('stats.totalSpots')}
    </text>
  )
}

function DonutChart({ segments, total }: DonutChartProps) {
  const r = DONUT_RADIUS
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
      <TotalSpotsText cx={cx} cy={cy} />
    </svg>
  )
}

function StatusProgressRow({ segment, total }: StatusProgressRowProps) {
  const barWidth = total > 0 ? (segment.count / total) * 100 : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: `var(${segment.colorVar})` }}
          />
          <span className="font-medium">{segment.label}</span>
        </div>
        <span className="text-muted-foreground tabular-nums">
          {segment.count} · {segment.pct}%
        </span>
      </div>
      <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            background: `var(${segment.colorVar})`,
          }}
        />
      </div>
    </div>
  )
}

// — main component —

export function StatsPage() {
  const { t } = useTranslation()
  const { data: allSpots = [], isLoading: isSpotsLoading } = useSpots()
  const { data: lots = [], isLoading: isLotsLoading } = useLots()
  const [selectedLotId, setSelectedLotId] = useState<string>('__all__')

  const isLoading = isSpotsLoading || isLotsLoading

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

  const STATUS_LABELS: Record<SpotStatus, string> = {
    free: t('stats.free'),
    occupied: t('stats.occupied'),
    reserved: t('stats.reserved'),
  }

  const segments: Segment[] = (
    ['free', 'occupied', 'reserved'] as SpotStatus[]
  ).map((s) => ({
    label: STATUS_LABELS[s],
    count: counts[s],
    pct: computePct(counts[s], total),
    colorVar: StatusColorVar[s],
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('stats.title')}</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {t('stats.subtitle')}
          </p>
        </div>

        {!isLoading && lots.length > 0 && (
          <Select
            value={selectedLotId}
            onChange={(v) => v && setSelectedLotId(v)}
            data={[
              { value: '__all__', label: t('stats.allFloors') },
              ...lots.map((lot) => ({ value: lot.id, label: lot.name })),
            ]}
            placeholder={t('stats.allFloors')}
          />
        )}
      </div>

      {isLoading && (
        <div className="bg-muted h-64 animate-pulse rounded-lg border" />
      )}

      {!isLoading && total === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          {t('stats.noData')}
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
                <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                  {seg.pct}%
                </p>
                <p className="text-muted-foreground text-sm">{seg.label}</p>
                <p className="text-xs font-medium">
                  {t('stats.spots', { count: seg.count, total })}
                </p>
              </div>
            ))}
          </div>

          {/* Chart + breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card flex flex-col items-center justify-center gap-4 rounded-lg border p-6 shadow-sm">
              <p className="text-muted-foreground self-start text-sm font-medium">
                {t('stats.distribution')}
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
                {t('stats.breakdown')}
              </p>
              <div className="space-y-5">
                {segments.map((seg) => (
                  <StatusProgressRow
                    key={seg.label}
                    segment={seg}
                    total={total}
                  />
                ))}
              </div>
              <div className="mt-6 border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t('stats.occupancyRate')}
                  </span>
                  <span className="font-semibold">
                    {computePct(counts.occupied + counts.reserved, total)}%
                  </span>
                </div>
                <div className="bg-muted mt-2 h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${computePct(counts.occupied + counts.reserved, total)}%`,
                    }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('stats.spotsInUse', {
                    used: counts.occupied + counts.reserved,
                    total,
                  })}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
