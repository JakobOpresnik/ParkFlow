import { Group, SegmentedControl, Badge, Text } from '@mantine/core'
import type { FloorId } from '@/types'

interface Props {
  currentFloor: FloorId
  onSelectFloor: (floor: FloorId) => void
  stats: { total: number; filled: number; available: number; reserved: number }
}

const floors: FloorId[] = ['B1', 'B2', 'B3']

export default function FloorSelector({
  currentFloor,
  onSelectFloor,
  stats,
}: Props) {
  return (
    <Group gap="lg" wrap="wrap">
      <Group gap="sm">
        <Text size="sm" fw={500} c="dimmed">
          Floor
        </Text>
        <SegmentedControl
          value={currentFloor}
          onChange={(val) => onSelectFloor(val as FloorId)}
          data={floors}
          radius="lg"
          color="violet"
          styles={{
            root: { backgroundColor: '#f1f3f5' },
          }}
        />
      </Group>

      <Group gap="md" visibleFrom="sm">
        <Group gap={6}>
          <div className="h-2.5 w-2.5 rounded-full bg-spot-occupied" />
          <Text size="sm" c="dimmed">
            Filled
          </Text>
          <Badge variant="light" color="red" size="sm" radius="md">
            {stats.filled}
          </Badge>
        </Group>
        <Group gap={6}>
          <div className="h-2.5 w-2.5 rounded-full bg-spot-available" />
          <Text size="sm" c="dimmed">
            Available
          </Text>
          <Badge variant="light" color="green" size="sm" radius="md">
            {stats.available}
          </Badge>
        </Group>
        <Group gap={6}>
          <div className="h-2.5 w-2.5 rounded-full bg-spot-reserved" />
          <Text size="sm" c="dimmed">
            Reserved
          </Text>
          <Badge variant="light" color="violet" size="sm" radius="md">
            {stats.reserved}
          </Badge>
        </Group>
      </Group>
    </Group>
  )
}
