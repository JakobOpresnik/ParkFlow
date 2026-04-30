import { Tooltip } from '@mantine/core'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { StatsDailyPoint } from '@/types'

export type TrendRange = 7 | 30 | 90

interface TrendChartProps {
  readonly data: readonly StatsDailyPoint[]
  readonly days: TrendRange
  readonly onRangeChange: (days: TrendRange) => void
}

const WIDTH = 600
const HEIGHT = 160
const PAD_LEFT = 28
const PAD_RIGHT = 8
const PAD_TOP = 8
const PAD_BOTTOM = 22

const RANGE_OPTIONS: readonly TrendRange[] = [7, 30, 90]

const RANGE_LABEL_KEYS: Record<TrendRange, string> = {
  7: 'stats.range7d',
  30: 'stats.range30d',
  90: 'stats.range90d',
}

function fillLastNDays(
  data: readonly StatsDailyPoint[],
  days: number,
): StatsDailyPoint[] {
  const byDate = new Map(data.map((d) => [d.date, d.count]))
  const out: StatsDailyPoint[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    out.push({ date: key, count: byDate.get(key) ?? 0 })
  }
  return out
}

export function TrendChart({ data, days, onRangeChange }: TrendChartProps) {
  const { t } = useTranslation()
  const series = fillLastNDays(data, days)
  const max = Math.max(1, ...series.map((p) => p.count))
  const n = series.length

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const stepX = innerW / Math.max(1, n - 1)

  const points = series.map((p, i) => {
    const x = PAD_LEFT + i * stepX
    const y = PAD_TOP + innerH - (p.count / max) * innerH
    return { x, y, ...p }
  })

  const path = points.reduce(
    (acc, p, i) => acc + (i === 0 ? `M${p.x},${p.y}` : ` L${p.x},${p.y}`),
    '',
  )
  const first = points[0]
  const last = points[points.length - 1]
  const areaPath =
    first && last
      ? `${path} L${last.x},${PAD_TOP + innerH} L${first.x},${PAD_TOP + innerH} Z`
      : path

  const total = series.reduce((sum, p) => sum + p.count, 0)
  const avg = total / n
  const avgRounded = Math.round(avg * 10) / 10
  const avgLabel = Number.isInteger(avgRounded)
    ? String(avgRounded)
    : avgRounded.toFixed(1)

  const yTicks = [0, Math.round(max / 2), max]

  // Dot size scales with point density: fewer points → larger dots.
  const dotRadius = days <= 7 ? 3.5 : days <= 30 ? 2.2 : 1.5

  // Three x-axis label positions: first / middle / last
  const labelIndices = [0, Math.floor(n / 2), n - 1]

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm sm:p-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="text-muted-foreground text-sm font-medium">
            {t('stats.trend30d')}
          </p>
          <Tooltip
            label={t('stats.trendInfo')}
            multiline
            w={280}
            withArrow
            events={{ hover: true, focus: true, touch: true }}
          >
            <button
              type="button"
              className="text-muted-foreground/70 hover:text-muted-foreground cursor-help"
              aria-label={t('stats.trendInfo')}
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

      <div className="mb-5 flex flex-col items-end">
        <div className="flex items-baseline gap-2">
          <p className="text-muted-foreground text-sm font-medium">
            {t('stats.total')}
          </p>
          <p className="text-2xl font-bold tabular-nums">{total}</p>
        </div>
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          {t('stats.avgPerDay', { n: avgLabel })}
        </p>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
        {/* Grid lines + y labels */}
        {yTicks.map((v) => {
          const y = PAD_TOP + innerH - (v / max) * innerH
          return (
            <g key={v}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-border"
              />
              <text
                x={PAD_LEFT - 4}
                y={y + 3}
                textAnchor="end"
                fontSize={10}
                className="fill-muted-foreground tabular-nums"
              >
                {v}
              </text>
            </g>
          )
        })}

        {/* Area */}
        <path d={areaPath} fill="var(--color-spot-occupied)" opacity={0.12} />

        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke="var(--color-spot-occupied)"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p) => (
          <circle
            key={p.date}
            cx={p.x}
            cy={p.y}
            r={dotRadius}
            fill="var(--color-spot-occupied)"
          >
            <title>{`${p.date} — ${p.count}`}</title>
          </circle>
        ))}

        {/* X-axis labels: first, middle, last */}
        {labelIndices.map((i) => {
          const p = points[i]
          const s = series[i]
          if (!p || !s) return null
          return (
            <text
              key={i}
              x={p.x}
              y={HEIGHT - 6}
              textAnchor="middle"
              fontSize={10}
              className="fill-muted-foreground"
            >
              {s.date.slice(5)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
