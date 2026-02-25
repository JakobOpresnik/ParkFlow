import {
  Paper,
  Group,
  Text,
  ThemeIcon,
  Badge,
  Button,
  Stack,
} from '@mantine/core'
import {
  Sparkles,
  Car,
  Building2,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Minimize2,
} from 'lucide-react'
import { useSmartSuggestions } from '@/hooks/useSmartSuggestions'
import { useParkingStore } from '@/store/parkingStore'
import { useNotificationStore } from '@/store/notificationStore'
import type { ReasonTag } from '@/types'

const reasonIconMap: Record<ReasonTag['icon'], typeof Building2> = {
  floor: Building2,
  elevator: ArrowUpRight,
  reliable: ShieldCheck,
  ev: Zap,
  compact: Minimize2,
}

export default function SmartSuggestions() {
  const suggestions = useSmartSuggestions()
  const reserveSpotOnFloor = useParkingStore((s) => s.reserveSpotOnFloor)
  const addNotification = useNotificationStore((s) => s.addNotification)

  const handleReserve = (spotId: string, floor: string, label: string) => {
    reserveSpotOnFloor(spotId, floor as 'B1' | 'B2' | 'B3')
    addNotification({
      type: 'success',
      title: 'Spot Reserved!',
      message: `You reserved spot ${label} on floor ${floor}.`,
    })
  }

  if (suggestions.length === 0) {
    return (
      <Paper radius="lg" shadow="xs" p="lg" withBorder>
        <Group gap="sm" mb="md">
          <ThemeIcon
            variant="gradient"
            gradient={{ from: 'violet', to: 'pink' }}
            size="lg"
            radius="xl"
          >
            <Sparkles className="h-5 w-5" />
          </ThemeIcon>
          <div>
            <Text fw={700} size="lg">
              Smart Suggestions
            </Text>
            <Text size="xs" c="dimmed">
              For Alex Morgan
            </Text>
          </div>
        </Group>
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No available spots to suggest right now.
        </Text>
      </Paper>
    )
  }

  return (
    <Paper radius="lg" shadow="xs" p="lg" withBorder>
      <Group gap="sm" mb="md">
        <ThemeIcon
          variant="gradient"
          gradient={{ from: 'violet', to: 'pink' }}
          size="lg"
          radius="xl"
        >
          <Sparkles className="h-5 w-5" />
        </ThemeIcon>
        <div>
          <Text fw={700} size="lg">
            Smart Suggestions
          </Text>
          <Text size="xs" c="dimmed">
            For Alex Morgan
          </Text>
        </div>
      </Group>

      <Stack gap="sm">
        {suggestions.map(({ spot, reasons }) => (
          <div
            key={spot.id}
            className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
          >
            <ThemeIcon variant="light" color="green" size="lg" radius="xl">
              <Car className="h-5 w-5" />
            </ThemeIcon>

            <div className="min-w-0 flex-1">
              <Group gap="xs">
                <Text size="sm" fw={600}>
                  {spot.label}
                </Text>
                <Text size="xs" c="dimmed">
                  Floor {spot.floor}
                </Text>
              </Group>
              <Group gap={4} mt={4}>
                {reasons.map((reason) => {
                  const Icon = reasonIconMap[reason.icon]
                  return (
                    <Badge
                      key={reason.label}
                      size="xs"
                      variant="light"
                      color={reason.color}
                      leftSection={<Icon className="h-3 w-3" />}
                    >
                      {reason.label}
                    </Badge>
                  )
                })}
              </Group>
            </div>

            <Button
              size="xs"
              radius="xl"
              variant="light"
              onClick={() => handleReserve(spot.id, spot.floor, spot.label)}
            >
              Reserve
            </Button>
          </div>
        ))}
      </Stack>
    </Paper>
  )
}
