import { useMemo } from 'react'
import { Paper, Text, Group, Divider } from '@mantine/core'
import { ArrowDown, ArrowUp } from 'lucide-react'
import ParkingSpotComponent from './ParkingSpot'
import HeatmapSpot from './HeatmapSpot'
import type { ParkingSpot, SpotHeatmapData } from '@/types'

type ViewMode = 'live' | 'heatmap'

interface Props {
  readonly spots: ParkingSpot[]
  readonly currentUserId: string
  readonly onSelectSpot: (spot: ParkingSpot) => void
  readonly viewMode?: ViewMode
  readonly heatmapData?: SpotHeatmapData
}

export default function ParkingMap({
  spots,
  currentUserId,
  onSelectSpot,
  viewMode = 'live',
  heatmapData,
}: Props) {
  const rows = useMemo(() => {
    const grouped = new Map<number, ParkingSpot[]>()
    for (const spot of spots) {
      const row = grouped.get(spot.row) ?? []
      row.push(spot)
      grouped.set(spot.row, row)
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b)
  }, [spots])

  return (
    <Paper radius="lg" shadow="xs" p={{ base: 'sm', md: 'lg' }} withBorder>
      {/* Heatmap legend */}
      {viewMode === 'heatmap' && (
        <div className="mb-4 flex items-center gap-3">
          <Text size="xs" c="dimmed">
            Low
          </Text>
          <div
            className="h-3 flex-1 rounded-full"
            style={{
              background:
                'linear-gradient(to right, #3b82f6, #f59e0b, #ef4444)',
            }}
          />
          <Text size="xs" c="dimmed">
            High
          </Text>
        </div>
      )}

      {/* Entry marker */}
      <Group justify="flex-end" mb="sm">
        <Group gap={4}>
          <ArrowDown className="h-4 w-4 text-green-600" />
          <Text size="xs" fw={700} c="green">
            Entry
          </Text>
        </Group>
      </Group>

      {/* Parking grid */}
      <div className="space-y-2">
        {rows.map(([rowIndex, rowSpots], idx) => (
          <div key={rowIndex}>
            <div className="grid grid-cols-6 gap-2">
              {rowSpots
                .sort((a, b) => a.col - b.col)
                .map((spot) => (
                  <div key={spot.id} className="aspect-[3/4]">
                    {viewMode === 'heatmap' && heatmapData ? (
                      <HeatmapSpot
                        spot={spot}
                        occupancy={heatmapData[spot.id] ?? 0}
                      />
                    ) : (
                      <ParkingSpotComponent
                        spot={spot}
                        isCurrentUser={spot.reservedById === currentUserId}
                        onSelect={onSelectSpot}
                      />
                    )}
                  </div>
                ))}
            </div>
            {/* Lane separator between row pairs */}
            {idx % 2 === 1 && idx < rows.length - 1 && (
              <Divider
                my="md"
                label="lane"
                labelPosition="center"
                styles={{
                  label: {
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#d1d5db',
                  },
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Exit marker */}
      <Group justify="flex-end" mt="sm">
        <Group gap={4}>
          <ArrowUp className="h-4 w-4 text-red-500" />
          <Text size="xs" fw={700} c="red">
            Exit
          </Text>
        </Group>
      </Group>
    </Paper>
  )
}
