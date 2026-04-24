import { Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { StatsHeatmapCell } from '@/types'

export type HeatmapRange = 7 | 30 | 90

interface PeakHoursHeatmapProps {
  readonly data: readonly StatsHeatmapCell[]
  readonly days: HeatmapRange
  readonly onRangeChange: (days: HeatmapRange) => void
}

const RANGE_OPTIONS: readonly HeatmapRange[] = [7, 30, 90]

const RANGE_LABEL_KEYS: Record<HeatmapRange, string> = {
  7: 'stats.range7d',
  30: 'stats.range30d',
  90: 'stats.range90d',
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)
// Postgres DOW: 0=Sun..6=Sat. Reorder to Mon..Sun for readability.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
const WEEKDAY_LABEL_KEYS = [
  'stats.weekdays.mon',
  'stats.weekdays.tue',
  'stats.weekdays.wed',
  'stats.weekdays.thu',
  'stats.weekdays.fri',
  'stats.weekdays.sat',
  'stats.weekdays.sun',
] as const

// CSS grid template: day label + 24 hour cells, all sharing the row width.
// 'minmax(0, 1fr)' lets each cell shrink below its intrinsic size on narrow
// viewports so the whole chart fits without horizontal scroll.
const GRID_TEMPLATE = '28px repeat(24, minmax(0, 1fr))'

function buildGrid(data: readonly StatsHeatmapCell[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () =>
    Array<number>(24).fill(0),
  )
  for (const cell of data) {
    const rowIdx = WEEKDAY_ORDER.indexOf(
      cell.weekday as (typeof WEEKDAY_ORDER)[number],
    )
    if (rowIdx === -1) continue
    if (cell.hour < 0 || cell.hour > 23) continue
    const row = grid[rowIdx]
    if (row) row[cell.hour] = cell.count
  }
  return grid
}

function weekdayLabel(rowIdx: number): string {
  return WEEKDAY_LABEL_KEYS[rowIdx] ?? 'stats.weekdays.mon'
}

export function PeakHoursHeatmap({
  data,
  days,
  onRangeChange,
}: PeakHoursHeatmapProps) {
  const { t } = useTranslation()
  const grid = buildGrid(data)
  const max = Math.max(1, ...grid.flat())

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-muted-foreground text-sm font-medium">
            {t('stats.peakHours')}
          </p>
          <Tooltip
            label={t('stats.peakHoursInfo')}
            multiline
            w={280}
            withArrow
            events={{ hover: true, focus: true, touch: true }}
          >
            <button
              type="button"
              className="text-muted-foreground/70 hover:text-muted-foreground cursor-help"
              aria-label={t('stats.peakHoursInfo')}
            >
              <Info className="size-3.5" />
            </button>
          </Tooltip>
        </div>

        <div className="bg-muted inline-flex rounded-md p-0.5 text-xs">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                r === days
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t(RANGE_LABEL_KEYS[r])}
            </button>
          ))}
        </div>
      </div>

      {/* Hour headers — shares grid template with rows for perfect alignment */}
      <div
        className="grid items-center gap-[2px] sm:gap-1"
        style={{ gridTemplateColumns: GRID_TEMPLATE }}
      >
        <div />
        {HOURS.map((h) => (
          <div
            key={h}
            className="text-muted-foreground min-w-0 text-center text-[8px] tabular-nums sm:text-[9px]"
          >
            {h % 6 === 0 ? h : ''}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="mt-1 space-y-[2px] sm:space-y-0.5">
        {grid.map((row, rowIdx) => (
          <div
            key={weekdayLabel(rowIdx)}
            className="grid items-center gap-[2px] sm:gap-1"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            <div className="text-muted-foreground pr-1 text-right text-[9px] font-medium sm:text-[10px]">
              {t(weekdayLabel(rowIdx))}
            </div>
            {row.map((count, hour) => {
              const intensity = count / max
              const alpha = count === 0 ? 0.06 : 0.15 + intensity * 0.85
              return (
                <div
                  key={`${rowIdx}-${hour}`}
                  title={`${t(weekdayLabel(rowIdx))} ${hour
                    .toString()
                    .padStart(2, '0')}:00 — ${count}`}
                  className="aspect-square min-w-0 rounded-sm transition-colors"
                  style={{
                    background: `color-mix(in oklch, var(--color-spot-occupied) ${
                      alpha * 100
                    }%, transparent)`,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="text-muted-foreground mt-3 flex items-center gap-2 text-[10px]">
        <span>{t('stats.less')}</span>
        {[0.1, 0.25, 0.5, 0.75, 1].map((a) => (
          <div
            key={a}
            className="size-3 rounded-sm"
            style={{
              background: `color-mix(in oklch, var(--color-spot-occupied) ${
                a * 100
              }%, transparent)`,
            }}
          />
        ))}
        <span>{t('stats.more')}</span>
      </div>
    </div>
  )
}
