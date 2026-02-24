import { Tooltip, Text } from '@mantine/core'
import { Zap, Accessibility } from 'lucide-react'
import type { ParkingSpot } from '@/types'

interface Props {
  readonly spot: ParkingSpot
  readonly occupancy: number
}

function getHeatColor(pct: number): string {
  // Two-segment linear RGB interpolation
  // 0% → #3b82f6 (blue) | 50% → #f59e0b (amber) | 100% → #ef4444 (red)
  if (pct <= 50) {
    const t = pct / 50
    const r = Math.round(59 + (245 - 59) * t)
    const g = Math.round(130 + (158 - 130) * t)
    const b = Math.round(246 + (11 - 246) * t)
    return `rgb(${r}, ${g}, ${b})`
  }
  const t = (pct - 50) / 50
  const r = Math.round(245 + (239 - 245) * t)
  const g = Math.round(158 + (68 - 158) * t)
  const b = Math.round(11 + (68 - 11) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getTooltipText(label: string, pct: number): string {
  let desc = 'Rarely used'
  if (pct >= 80) desc = 'Almost always taken'
  else if (pct >= 60) desc = 'Frequently used'
  else if (pct >= 40) desc = 'Moderate usage'
  else if (pct >= 20) desc = 'Occasionally used'
  return `Spot ${label}: occupied ${pct}% of the time — ${desc}`
}

export default function HeatmapSpot({ spot, occupancy }: Props) {
  return (
    <Tooltip
      label={getTooltipText(spot.label, occupancy)}
      position="top"
      withArrow
      radius="md"
      fz="xs"
      multiline
      w={220}
    >
      <div
        className="relative flex h-full w-full flex-col items-center justify-center rounded-xl border-2 border-white/30"
        style={{ backgroundColor: getHeatColor(occupancy) }}
      >
        <span className="absolute top-1 left-2 text-[10px] font-bold text-white">
          {spot.label}
        </span>

        {spot.type === 'ev' && (
          <span className="absolute top-1 right-1">
            <Zap className="h-3 w-3 text-white" />
          </span>
        )}
        {spot.type === 'handicap' && (
          <span className="absolute top-1 right-1">
            <Accessibility className="h-3 w-3 text-white" />
          </span>
        )}

        <Text size="lg" fw={800} c="white" className="drop-shadow">
          {occupancy}%
        </Text>
      </div>
    </Tooltip>
  )
}
