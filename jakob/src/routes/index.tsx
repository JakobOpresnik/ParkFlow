import { createRoute } from '@tanstack/react-router'
import {
  SimpleGrid,
  Paper,
  Group,
  Text,
  ThemeIcon,
  Stack,
  Title,
  RingProgress,
} from '@mantine/core'
import { Car, Users, CalendarCheck, TrendingUp } from 'lucide-react'
import { useParkingStore } from '@/store/parkingStore'
import AnalyticsChart from '@/components/AnalyticsChart'
import SmartSuggestions from '@/components/SmartSuggestions'
import LiveActivityFeed from '@/components/LiveActivityFeed'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})

function Dashboard() {
  const getFloorStats = useParkingStore((s) => s.getFloorStats)

  const b1 = getFloorStats('B1')
  const b2 = getFloorStats('B2')
  const b3 = getFloorStats('B3')

  const totalSpots = b1.total + b2.total + b3.total
  const totalFilled = b1.filled + b2.filled + b3.filled
  const totalAvailable = b1.available + b2.available + b3.available
  const totalReserved = b1.reserved + b2.reserved + b3.reserved
  const occupancyPct = Math.round(
    ((totalFilled + totalReserved) / totalSpots) * 100,
  )

  const statCards = [
    {
      label: 'Total Spots',
      value: totalSpots,
      icon: Car,
      color: 'violet',
      description: 'Across all floors',
    },
    {
      label: 'Available Now',
      value: totalAvailable,
      icon: CalendarCheck,
      color: 'green',
      description: 'Open for booking',
    },
    {
      label: 'Occupied',
      value: totalFilled,
      icon: Users,
      color: 'red',
      description: 'Permanent owners in office',
    },
    {
      label: 'Reserved',
      value: totalReserved,
      icon: TrendingUp,
      color: 'blue',
      description: 'Booked for today',
    },
  ]

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Stack ml={5} gap={4}>
          <Title order={2} fw={700}>
            Dashboard
          </Title>
          <Text size="sm" c="dimmed">
            Overview of parking lot status for today
          </Text>
        </Stack>
        <Paper radius="lg" shadow="xs" p="sm" withBorder>
          <Group gap="sm">
            <div className="cursor-default transition-transform duration-300 ease-out hover:scale-[1.3]">
              <RingProgress
                size={52}
                thickness={5}
                roundCaps
                sections={[{ value: occupancyPct, color: 'violet' }]}
                label={
                  <Text size="xs" ta="center" fw={700}>
                    {occupancyPct}%
                  </Text>
                }
              />
            </div>
            <div>
              <Text size="xs" c="dimmed">
                Occupancy
              </Text>
              <Text size="sm" fw={600}>
                {totalFilled + totalReserved}/{totalSpots}
              </Text>
            </div>
          </Group>
        </Paper>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        {statCards.map((stat) => (
          <Paper key={stat.label} radius="lg" shadow="xs" p="lg" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="2rem" fw={700} lh={1.1}>
                {stat.value}
              </Text>
              <ThemeIcon
                variant="light"
                color={stat.color}
                size="lg"
                radius="xl"
              >
                <stat.icon className="h-5 w-5" />
              </ThemeIcon>
            </Group>

            <Text size="sm" fw={600} mt={4}>
              {stat.label}
            </Text>
            <Text size="xs" c="dimmed">
              {stat.description}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      <SmartSuggestions />

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {(['B1', 'B2', 'B3'] as const).map((floor) => {
          const stats = getFloorStats(floor)
          const pct = Math.round(
            ((stats.filled + stats.reserved) / stats.total) * 100,
          )
          return (
            <Paper key={floor} radius="lg" shadow="xs" p="lg" withBorder>
              <Group justify="space-between" align="center">
                <div>
                  <Text size="lg" fw={700}>
                    Floor {floor}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {stats.available} spots available
                  </Text>
                </div>
                <div className="cursor-default transition-transform duration-300 ease-out hover:scale-[1.5]">
                  <RingProgress
                    size={60}
                    thickness={6}
                    roundCaps
                    sections={[
                      {
                        value: (stats.filled / stats.total) * 100,
                        color: 'red',
                      },
                      {
                        value: (stats.reserved / stats.total) * 100,
                        color: 'blue',
                      },
                      {
                        value: (stats.available / stats.total) * 100,
                        color: 'green',
                      },
                    ]
                      .filter((s) => s.value > 0)
                      .sort((a, b) => b.value - a.value)}
                    label={
                      <Text size="xs" ta="center" fw={700}>
                        {pct}%
                      </Text>
                    }
                  />
                </div>
              </Group>
              <Group mt="sm" gap="lg">
                <Group gap={4}>
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <Text size="xs" c="dimmed">
                    {stats.filled} filled
                  </Text>
                </Group>
                <Group gap={4}>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <Text size="xs" c="dimmed">
                    {stats.reserved} reserved
                  </Text>
                </Group>
                <Group gap={4}>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <Text size="xs" c="dimmed">
                    {stats.available} open
                  </Text>
                </Group>
              </Group>
            </Paper>
          )
        })}
      </SimpleGrid>

      <LiveActivityFeed />

      <AnalyticsChart />
    </Stack>
  )
}
