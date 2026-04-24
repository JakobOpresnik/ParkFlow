import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface Segment {
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
  readonly segments: readonly Segment[]
  readonly total: number
}

const DONUT_RADIUS = 72

function buildSlices(
  segments: readonly Segment[],
  total: number,
): DonutSlice[] {
  const circ = 2 * Math.PI * DONUT_RADIUS
  const GAP_DEG = total > 1 ? 2 : 0
  let accumulated = 0
  return segments.map((seg) => {
    const pct = total > 0 ? seg.count / total : 0
    const angleDeg = pct * 360
    const dashLen = Math.max(0, ((angleDeg - GAP_DEG) / 360) * circ)
    const startAngle = accumulated * 360 - 90
    accumulated += pct
    return { ...seg, dashLen, startAngle }
  })
}

export function DonutChart({ segments, total }: DonutChartProps) {
  const { t } = useTranslation()
  const r = DONUT_RADIUS
  const cx = 100
  const cy = 100
  const circ = 2 * Math.PI * r
  const slices = buildSlices(segments, total)

  // Entrance animation: start with dashLen = 0, transition to full on mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <svg viewBox="0 0 200 200" className="size-44 drop-shadow-sm sm:size-52">
      {slices.map((slice) => {
        if (slice.count === 0) return null
        const drawn = mounted ? slice.dashLen : 0
        return (
          <circle
            key={slice.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            strokeWidth="28"
            strokeDasharray={`${drawn} ${circ}`}
            transform={`rotate(${slice.startAngle} ${cx} ${cy})`}
            style={{
              stroke: `var(${slice.colorVar})`,
              transition: 'stroke-dasharray 800ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
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
        {t('stats.totalSpots')}
      </text>
    </svg>
  )
}
