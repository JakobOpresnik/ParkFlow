import { createRoute, Link } from '@tanstack/react-router'
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  Button,
  ThemeIcon,
  SimpleGrid,
  Timeline,
  Alert,
} from '@mantine/core'
import { CalendarCheck, Clock, MapPin, Car, Info } from 'lucide-react'
import { useParkingStore } from '@/store/parkingStore'
import { useNotificationStore } from '@/store/notificationStore'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/booking',
  component: Booking,
})

function Booking() {
  const { reservations, cancelReservation, currentUserId, currentUserName } =
    useParkingStore()
  const addNotification = useNotificationStore((s) => s.addNotification)

  const myReservations = reservations.filter(
    (r) => r.employeeId === currentUserId,
  )

  const handleCancel = (spotId: string, label: string) => {
    cancelReservation(spotId)
    addNotification({
      type: 'info',
      title: 'Reservation Cancelled',
      message: `Your reservation for spot ${label} has been cancelled.`,
    })
  }

  return (
    <Stack gap="lg">
      <Stack ml={5} gap={4}>
        <Title order={2} fw={700}>
          My Bookings
        </Title>
        <Text size="sm" c="dimmed">
          Manage your parking reservations
        </Text>
      </Stack>

      <Alert
        icon={<Info className="h-5 w-5" />}
        title="How booking works"
        color="violet"
        variant="light"
        radius="lg"
      >
        <Stack gap={2} mt={3}>
          <Text size="sm">
            Employees without permanent spots must reserve a spot for the day
            before coming in.
          </Text>
          <Text size="sm">
            Reservations automatically expire at the end of the day. Permanent
            spots become available when their owners are out of office.
          </Text>
        </Stack>
      </Alert>

      {myReservations.length === 0 ? (
        <Paper radius="lg" shadow="xs" p="xl" withBorder ta="center">
          <ThemeIcon
            variant="light"
            color="gray"
            size={60}
            radius="xl"
            mx="auto"
            mb="md"
          >
            <Car className="h-8 w-8" />
          </ThemeIcon>
          <Text size="lg" fw={600} mb={4}>
            No Active Reservations
          </Text>
          <Text size="sm" c="dimmed" maw={400} mx="auto">
            You don&apos;t have any parking reservations for today. Head to
            <Link to="/parking" className="ml-1 text-violet-600">
              {' '}
              Parking Spaces
            </Link>{' '}
            to reserve a spot.
          </Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {myReservations.map((res) => (
            <Paper key={res.id} radius="lg" shadow="xs" p="lg" withBorder>
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <ThemeIcon color="violet" size="lg" radius="xl">
                    <Car className="h-5 w-5" />
                  </ThemeIcon>
                  <div>
                    <Text size="md" fw={700}>
                      Spot {res.spotId.split('-').pop()}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Floor {res.floor}
                    </Text>
                  </div>
                </Group>
                <Badge color="violet" variant="light" radius="md">
                  Active
                </Badge>
              </Group>

              <Timeline active={2} bulletSize={20} lineWidth={2} color="violet">
                <Timeline.Item
                  bullet={<CalendarCheck className="h-3 w-3" />}
                  title={
                    <Text size="xs" fw={500}>
                      Reserved
                    </Text>
                  }
                >
                  <Text size="xs" c="dimmed">
                    {res.date}
                  </Text>
                </Timeline.Item>
                <Timeline.Item
                  bullet={<Clock className="h-3 w-3" />}
                  title={
                    <Text size="xs" fw={500}>
                      Valid until end of day
                    </Text>
                  }
                >
                  <Text size="xs" c="dimmed">
                    Auto-expires at 11:59 PM
                  </Text>
                </Timeline.Item>
                <Timeline.Item
                  bullet={<MapPin className="h-3 w-3" />}
                  title={
                    <Text size="xs" fw={500}>
                      {currentUserName}
                    </Text>
                  }
                >
                  <Text size="xs" c="dimmed">
                    Floor {res.floor}, Spot {res.spotId.split('-').pop()}
                  </Text>
                </Timeline.Item>
              </Timeline>

              <Button
                fullWidth
                variant="light"
                color="red"
                radius="xl"
                mt="md"
                onClick={() =>
                  handleCancel(res.spotId, res.spotId.split('-').pop() ?? '')
                }
              >
                Cancel Reservation
              </Button>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Stack>
  )
}
