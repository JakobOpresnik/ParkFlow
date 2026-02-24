import { createRoute } from '@tanstack/react-router'
import {
  Stack,
  Title,
  Text,
  Paper,
  SimpleGrid,
  Group,
  ThemeIcon,
  Progress,
} from '@mantine/core'
import { TrendingDown, Car, Users } from 'lucide-react'
import AnalyticsChart from '@/components/AnalyticsChart'
import { useParkingStore } from '@/store/parkingStore'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: Analytics,
})

function Analytics() {
  const getFloorStats = useParkingStore((s) => s.getFloorStats)

  const floors = (['B1', 'B2', 'B3'] as const).map((floor) => {
    const stats = getFloorStats(floor)
    const pct = Math.round(
      ((stats.filled + stats.reserved) / stats.total) * 100,
    )
    return { floor, ...stats, pct }
  })

  const totalSpots = floors.reduce((s, f) => s + f.total, 0)
  const totalUsed = floors.reduce((s, f) => s + f.filled + f.reserved, 0)
  const overallPct = Math.round((totalUsed / totalSpots) * 100)

  return (
    <Stack gap="lg">
      <Stack ml={5} gap={4}>
        <Title order={2} fw={700}>
          Reports & Analytics
        </Title>
        <Text size="sm" c="dimmed">
          Parking utilization insights
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        <Paper radius="lg" shadow="xs" p="lg" withBorder>
          <Group justify="space-between" mb="xs">
            <ThemeIcon variant="light" color="violet" size="lg" radius="xl">
              <Car className="h-5 w-5" />
            </ThemeIcon>
            {/* <ThemeIcon variant="light" color="green" size="sm" radius="xl">
              <TrendingUp className="h-3 w-3" />
            </ThemeIcon> */}
          </Group>
          <Text size="2rem" fw={700} lh={1.1}>
            {overallPct}%
          </Text>
          <Text size="sm" c="dimmed">
            Overall Utilization
          </Text>
        </Paper>

        <Paper radius="lg" shadow="xs" p="lg" withBorder>
          <Group justify="space-between" mb="xs">
            <ThemeIcon variant="light" color="green" size="lg" radius="xl">
              <TrendingDown className="h-5 w-5" />
            </ThemeIcon>
          </Group>
          <Text size="2rem" fw={700} lh={1.1}>
            {totalSpots - totalUsed}
          </Text>
          <Text size="sm" c="dimmed">
            Spots Available
          </Text>
        </Paper>

        <Paper radius="lg" shadow="xs" p="lg" withBorder>
          <Group justify="space-between" mb="xs">
            <ThemeIcon variant="light" color="red" size="lg" radius="xl">
              <Users className="h-5 w-5" />
            </ThemeIcon>
          </Group>
          <Text size="2rem" fw={700} lh={1.1}>
            {totalUsed}
          </Text>
          <Text size="sm" c="dimmed">
            Spots In Use
          </Text>
        </Paper>

        <Paper radius="lg" shadow="xs" p="lg" withBorder>
          <Group justify="space-between" mb="xs">
            <ThemeIcon variant="light" color="blue" size="lg" radius="xl">
              <Car className="h-5 w-5" />
            </ThemeIcon>
          </Group>
          <Text size="2rem" fw={700} lh={1.1}>
            {totalSpots}
          </Text>
          <Text size="sm" c="dimmed">
            Total Capacity
          </Text>
        </Paper>
      </SimpleGrid>

      <AnalyticsChart />

      <Paper radius="lg" shadow="xs" p="lg" withBorder>
        <Text size="lg" fw={600} mb="md">
          Floor Breakdown
        </Text>
        <Stack gap="md">
          {floors.map((f) => (
            <div key={f.floor}>
              <Group justify="space-between" mb={4}>
                <Text size="sm" fw={600}>
                  Floor {f.floor}
                </Text>
                <Text size="sm" c="dimmed">
                  {f.filled + f.reserved}/{f.total} used ({f.pct}%)
                </Text>
              </Group>
              <Progress.Root size="lg" radius="xl">
                <Progress.Section
                  value={(f.filled / f.total) * 100}
                  color="red"
                />
                <Progress.Section
                  value={(f.reserved / f.total) * 100}
                  color="blue"
                />
                <Progress.Section
                  value={(f.available / f.total) * 100}
                  color="green"
                />
              </Progress.Root>
              <Group mt={4} gap="lg">
                <Group gap={4}>
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <Text size="xs" c="dimmed">
                    {f.filled} occupied
                  </Text>
                </Group>
                <Group gap={4}>
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <Text size="xs" c="dimmed">
                    {f.reserved} reserved
                  </Text>
                </Group>
                <Group gap={4}>
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <Text size="xs" c="dimmed">
                    {f.available} available
                  </Text>
                </Group>
              </Group>
            </div>
          ))}
        </Stack>
      </Paper>
    </Stack>
  )
}
