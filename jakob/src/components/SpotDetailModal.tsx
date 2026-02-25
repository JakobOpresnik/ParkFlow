import {
  Modal,
  Button,
  Group,
  Stack,
  Text,
  Badge,
  ThemeIcon,
  Divider,
} from '@mantine/core'
import { Car, User, Calendar, Zap, Accessibility } from 'lucide-react'
import type { ParkingSpot } from '@/types'

interface Props {
  readonly spot: ParkingSpot | null
  readonly isCurrentUser: boolean
  readonly onClose: () => void
  readonly onReserve: () => void
  readonly onCancel: () => void
}

const statusColorMap = {
  available: 'green',
  occupied: 'red',
  reserved: 'violet',
  unavailable: 'gray',
} as const

export default function SpotDetailModal({
  spot,
  isCurrentUser,
  onClose,
  onReserve,
  onCancel,
}: Props) {
  if (!spot) return null

  const statusColor = statusColorMap[spot.status]

  return (
    <Modal
      opened={!!spot}
      onClose={onClose}
      radius="lg"
      size="sm"
      centered
      title={
        <Group gap="sm">
          <ThemeIcon color={statusColor} size="lg" radius="xl">
            <Car className="h-5 w-5" />
          </ThemeIcon>
          <div>
            <Text size="lg" fw={700}>
              Spot {spot.label}
            </Text>
            <Text size="xs" c="dimmed">
              Floor {spot.floor}
            </Text>
          </div>
        </Group>
      }
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Status
          </Text>
          <Badge
            color={statusColor}
            variant="light"
            radius="md"
            tt="capitalize"
          >
            {spot.status}
          </Badge>
        </Group>

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Type
          </Text>
          <Group gap={4}>
            {spot.type === 'ev' && <Zap className="h-4 w-4 text-yellow-500" />}
            {spot.type === 'handicap' && (
              <Accessibility className="h-4 w-4 text-blue-500" />
            )}
            <Text size="sm" fw={500} tt="capitalize">
              {spot.type}
            </Text>
          </Group>
        </Group>

        {spot.permanentOwner && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Permanent Owner
            </Text>
            <Group gap={6}>
              <User className="h-4 w-4 text-gray-400" />
              <Text size="sm" fw={500}>
                {spot.permanentOwner}
              </Text>
            </Group>
          </Group>
        )}

        {spot.reservedBy && (
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Reserved By
            </Text>
            <Group gap={6}>
              <User className="h-4 w-4 text-primary-400" />
              <Text size="sm" fw={500}>
                {isCurrentUser ? 'You' : spot.reservedBy}
              </Text>
            </Group>
          </Group>
        )}

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            Date
          </Text>
          <Group gap={6}>
            <Calendar className="h-4 w-4 text-gray-400" />
            <Text size="sm" fw={500}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </Group>
        </Group>

        <Divider my={4} />

        {spot.status === 'available' && (
          <Button
            fullWidth
            color="violet"
            radius="xl"
            size="md"
            onClick={onReserve}
          >
            Reserve This Spot
          </Button>
        )}

        {spot.status === 'reserved' && isCurrentUser && (
          <Button
            fullWidth
            color="red"
            radius="xl"
            size="md"
            onClick={onCancel}
          >
            Cancel Reservation
          </Button>
        )}

        {spot.status === 'occupied' && (
          <Text size="sm" c="dimmed" ta="center">
            This spot is currently occupied by its permanent owner.
          </Text>
        )}

        {spot.status === 'reserved' && !isCurrentUser && (
          <Text size="sm" c="dimmed" ta="center">
            This spot is reserved by another employee.
          </Text>
        )}
      </Stack>
    </Modal>
  )
}
