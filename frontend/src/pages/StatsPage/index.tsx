import { Select } from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useLots } from '@/hooks/useLots'
import { useStatsHistory } from '@/hooks/useStatsHistory'
import type { SpotStatus } from '@/types'

import { DonutChart, type Segment } from './DonutChart'
import { FloorBreakdown } from './FloorBreakdown'
import { type HeatmapRange, PeakHoursHeatmap } from './PeakHoursHeatmap'
import { StatsSkeleton } from './StatsSkeleton'
import { TrendChart, type TrendRange } from './TrendChart'
import { computeFloorStats, computePct, type FloorStats } from './utils'

const StatusColorVar: Record<SpotStatus, string> = {
  free: '--color-spot-free',
  occupied: '--color-spot-occupied',
  reserved: '--color-spot-occupied',
  unconfirmed: '--color-spot-occupied',
  spotted: '--color-spot-spotted',
}

const STATUS_LABEL_KEYS: Record<SpotStatus, string> = {
  free: 'stats.free',
  occupied: 'stats.occupied',
  reserved: 'stats.occupied',
  unconfirmed: 'stats.occupied',
  spotted: 'map.spotted',
}

interface StatusProgressRowProps {
  readonly segment: Segment
  readonly total: number
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

export function StatsPage() {
  const { t } = useTranslation()
  const today = new Date().toISOString().slice(0, 10)
  const { data: allSpots = [], isLoading: isSpotsLoading } =
    useEffectiveSpots(today)
  const { data: lots = [], isLoading: isLotsLoading } = useLots()
  const [selectedLotId, setSelectedLotId] = useState<string>('__all__')
  const [trendRange, setTrendRange] = useState<TrendRange>(30)
  const [heatmapRange, setHeatmapRange] = useState<HeatmapRange>(90)
  const scopedLotId = selectedLotId === '__all__' ? undefined : selectedLotId
  const { data: history } = useStatsHistory(
    scopedLotId,
    trendRange,
    heatmapRange,
  )

  const isLoading = isSpotsLoading || isLotsLoading

  const spots = useMemo(
    () =>
      selectedLotId === '__all__'
        ? allSpots
        : allSpots.filter((s) => s.lot_id === selectedLotId),
    [allSpots, selectedLotId],
  )

  const floors: FloorStats[] = useMemo(() => {
    return lots
      .map((lot) => {
        const lotSpots = allSpots.filter((s) => s.lot_id === lot.id)
        return computeFloorStats(lot.id, lot.name, lotSpots)
      })
      .filter((f) => f.total > 0)
  }, [lots, allSpots])

  const total = spots.length
  const counts: Record<SpotStatus, number> = {
    free: spots.filter((s) => s.status === 'free').length,
    occupied: spots.filter((s) => s.status === 'occupied').length,
    reserved: spots.filter((s) => s.status === 'reserved').length,
    unconfirmed: spots.filter((s) => s.status === 'unconfirmed').length,
    spotted: spots.filter((s) => s.status === 'spotted').length,
  }
  // 'occupied' bucket here = occupied + reserved + unconfirmed (system-owned signals).
  // 'spotted' stays its own bucket so users can see at a glance how many spots
  // were user-reported as taken. Overall occupancy rate (below) still sums all
  // non-free statuses, including spotted.
  const mergedCounts = {
    free: counts.free,
    occupied: counts.occupied + counts.reserved + counts.unconfirmed,
    spotted: counts.spotted,
  }

  const totalOccupied = mergedCounts.occupied + mergedCounts.spotted

  // Spotted gets its own donut slice only when there's something to show — keeps
  // the chart clean for the common case of zero reports.
  const segmentKeys: ('free' | 'occupied' | 'spotted')[] =
    mergedCounts.spotted > 0
      ? ['free', 'occupied', 'spotted']
      : ['free', 'occupied']

  const segments: Segment[] = segmentKeys.map((s) => ({
    label: t(STATUS_LABEL_KEYS[s]),
    count: mergedCounts[s],
    pct: computePct(mergedCounts[s], total),
    colorVar: StatusColorVar[s],
  }))

  return (
    <div className="space-y-6">
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

      {isLoading && <StatsSkeleton />}

      {!isLoading && total === 0 && (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          {t('stats.noData')}
        </div>
      )}

      {!isLoading && total > 0 && (
        <>
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
            <div className="bg-card flex flex-col gap-1 rounded-lg border p-4 shadow-sm">
              <div className="bg-primary/80 h-1 w-10 rounded-full" />
              <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                {computePct(totalOccupied, total)}%
              </p>
              <p className="text-muted-foreground text-sm">
                {t('stats.occupancyRate')}
              </p>
              <p className="text-xs font-medium">
                {t('stats.spotsInUse', {
                  used: totalOccupied,
                  total,
                })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-card flex flex-col items-center justify-center gap-4 rounded-lg border p-4 shadow-sm sm:p-6">
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

            <div className="bg-card rounded-lg border p-4 shadow-sm sm:p-6">
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
                    {computePct(totalOccupied, total)}%
                  </span>
                </div>
                <div className="bg-muted mt-2 h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${computePct(totalOccupied, total)}%`,
                    }}
                  />
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('stats.spotsInUse', {
                    used: totalOccupied,
                    total,
                  })}
                </p>
              </div>
            </div>
          </div>

          {floors.length > 1 && <FloorBreakdown floors={floors} />}

          {history && (
            <div className="grid gap-4 min-[1250px]:grid-cols-2">
              <PeakHoursHeatmap
                data={history.heatmap}
                days={heatmapRange}
                onRangeChange={setHeatmapRange}
              />
              <TrendChart
                data={history.daily}
                days={trendRange}
                onRangeChange={setTrendRange}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
