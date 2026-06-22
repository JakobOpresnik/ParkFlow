import { RingProgress, Text } from '@mantine/core'

// — types —

interface UtilizationRingProps {
  readonly label: string
  readonly utilizationPct: number
  readonly isLoading: boolean
}

// — main component —

// Utilization as a filled ring rather than a flat percentage, so the share of
// bookings actually used reads at a glance. Matches the StatCard chrome it sits
// beside in the profile stats grid.
export function UtilizationRing({
  label,
  utilizationPct,
  isLoading,
}: UtilizationRingProps) {
  return (
    <div className="bg-card flex flex-col items-center justify-center rounded-lg border p-4 text-center shadow-sm">
      <RingProgress
        size={72}
        thickness={8}
        roundCaps
        sections={[{ value: isLoading ? 0 : utilizationPct, color: 'orange' }]}
        label={
          <Text ta="center" fw={700} size="sm" className="tabular-nums">
            {isLoading ? '—' : `${utilizationPct}%`}
          </Text>
        }
      />
      <p className="text-muted-foreground mt-2 text-xs">{label}</p>
    </div>
  )
}
