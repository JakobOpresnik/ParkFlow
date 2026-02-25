import { createRoute, Link } from '@tanstack/react-router'
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Badge,
  ThemeIcon,
  SimpleGrid,
  Avatar,
  Box,
  Switch,
  SegmentedControl,
} from '@mantine/core'
import {
  User,
  Mail,
  Building2,
  Briefcase,
  Car,
  CalendarCheck,
  MapPin,
  Clock,
  Bell,
  BellOff,
  Layers,
} from 'lucide-react'
import { useParkingStore } from '@/store/parkingStore'
import attendanceData from '@/data/attendance.json'
import permanentSpotsData from '@/data/permanent_spots.json'
import type { AttendanceRecord, FloorId, PermanentSpot } from '@/types'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: Profile,
})

function Profile() {
  const {
    currentUserId,
    currentUserName,
    reservations,
    preferredFloor,
    setPreferredFloor,
  } = useParkingStore()

  const attendance = attendanceData as AttendanceRecord[]
  const permanentSpots = permanentSpotsData as PermanentSpot[]

  const userAttendance = attendance.find((a) => a.employeeId === currentUserId)
  const userSpot = permanentSpots.find((s) => s.ownerId === currentUserId)
  const myReservations = reservations.filter(
    (r) => r.employeeId === currentUserId,
  )

  const attendanceStatus = userAttendance?.status ?? 'Unknown'

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'In-Office':
        return 'green'
      case 'Remote':
        return 'blue'
      case 'Sick':
        return 'orange'
      case 'Vacation':
        return 'cyan'
      default:
        return 'gray'
    }
  }

  const statusColor = getStatusColor(attendanceStatus)

  return (
    <Stack gap="lg">
      <div>
        <Title order={2} fw={700}>
          Profile
        </Title>
        <Text size="sm" c="dimmed">
          Your account and parking preferences
        </Text>
      </div>

      {/* User Header Card */}
      <Paper radius="lg" shadow="xs" p="xl" withBorder>
        <Group gap="lg" wrap="nowrap">
          <Avatar color="violet" radius="xl" size={72}>
            AM
          </Avatar>
          <Box className="min-w-0">
            <Group gap="sm" mb={4}>
              <Title order={3} fw={700}>
                {currentUserName}
              </Title>
              <Badge color={statusColor} variant="light" radius="md">
                {attendanceStatus}
              </Badge>
            </Group>
            <Group gap="lg" wrap="wrap">
              <Group gap={6}>
                <Mail className="h-4 w-4 text-gray-400" />
                <Text size="sm" c="dimmed">
                  alex.m@company.com
                </Text>
              </Group>
              <Group gap={6}>
                <Building2 className="h-4 w-4 text-gray-400" />
                <Text size="sm" c="dimmed">
                  Engineering
                </Text>
              </Group>
              <Group gap={6}>
                <Briefcase className="h-4 w-4 text-gray-400" />
                <Text size="sm" c="dimmed">
                  Software Developer
                </Text>
              </Group>
            </Group>
          </Box>
        </Group>
      </Paper>

      {/* Parking Summary Card */}
      <Paper radius="lg" shadow="xs" p="lg" withBorder>
        <Group gap="sm" mb="md">
          <ThemeIcon color="violet" size="lg" radius="xl">
            <Car className="h-5 w-5" />
          </ThemeIcon>
          <Title order={4} fw={600}>
            Parking Summary
          </Title>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Box className="rounded-xl bg-gray-50 p-4">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              Permanent Spot
            </Text>
            {userSpot ? (
              <Text size="sm" fw={600}>
                {userSpot.spotId} (Floor {userSpot.floor})
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                No permanent spot assigned
              </Text>
            )}
          </Box>
          <Box className="rounded-xl bg-gray-50 p-4">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              Active Reservations
            </Text>
            <Group gap="xs" align="baseline">
              <Text size="xl" fw={700} c="violet">
                {myReservations.length}
              </Text>
              <Text
                size="xs"
                c="dimmed"
                renderRoot={(props) => <Link to="/booking" {...props} />}
                className="underline"
              >
                View bookings
              </Text>
            </Group>
          </Box>
          <Box className="rounded-xl bg-gray-50 p-4">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>
              Employee ID
            </Text>
            <Text size="sm" fw={600}>
              {currentUserId}
            </Text>
          </Box>
        </SimpleGrid>
      </Paper>

      {/* Quick Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        <Paper radius="lg" shadow="xs" p="lg" withBorder ta="center">
          <ThemeIcon
            variant="light"
            color="violet"
            size={44}
            radius="xl"
            mx="auto"
            mb="sm"
          >
            <CalendarCheck className="h-5 w-5" />
          </ThemeIcon>
          <Text size="xl" fw={700}>
            {myReservations.length}
          </Text>
          <Text size="xs" c="dimmed">
            Reservations Made
          </Text>
        </Paper>
        <Paper radius="lg" shadow="xs" p="lg" withBorder ta="center">
          <ThemeIcon
            variant="light"
            color="green"
            size={44}
            radius="xl"
            mx="auto"
            mb="sm"
          >
            <Clock className="h-5 w-5" />
          </ThemeIcon>
          <Text size="xl" fw={700}>
            4
          </Text>
          <Text size="xs" c="dimmed">
            Days In Office This Week
          </Text>
        </Paper>
        <Paper radius="lg" shadow="xs" p="lg" withBorder ta="center">
          <ThemeIcon
            variant="light"
            color="blue"
            size={44}
            radius="xl"
            mx="auto"
            mb="sm"
          >
            <Layers className="h-5 w-5" />
          </ThemeIcon>
          <Text size="xl" fw={700}>
            {preferredFloor}
          </Text>
          <Text size="xs" c="dimmed">
            Preferred Floor
          </Text>
        </Paper>
        <Paper radius="lg" shadow="xs" p="lg" withBorder ta="center">
          <ThemeIcon
            variant="light"
            color="orange"
            size={44}
            radius="xl"
            mx="auto"
            mb="sm"
          >
            <MapPin className="h-5 w-5" />
          </ThemeIcon>
          <Text size="xl" fw={700}>
            Standard
          </Text>
          <Text size="xs" c="dimmed">
            Spot Preference
          </Text>
        </Paper>
      </SimpleGrid>

      {/* Preferences */}
      <Paper radius="lg" shadow="xs" p="lg" withBorder>
        <Group gap="sm" mb="md">
          <ThemeIcon color="violet" size="lg" radius="xl">
            <User className="h-5 w-5" />
          </ThemeIcon>
          <Title order={4} fw={600}>
            Preferences
          </Title>
        </Group>
        <Stack gap="md">
          <Group justify="space-between">
            <Group gap="sm">
              <Bell className="h-4 w-4 text-gray-500" />
              <div>
                <Text size="sm" fw={500}>
                  Reservation Confirmations
                </Text>
                <Text size="xs" c="dimmed">
                  Get notified when you book or cancel a spot
                </Text>
              </div>
            </Group>
            <Switch defaultChecked color="violet" />
          </Group>
          <Group justify="space-between">
            <Group gap="sm">
              <BellOff className="h-4 w-4 text-gray-500" />
              <div>
                <Text size="sm" fw={500}>
                  Availability Alerts
                </Text>
                <Text size="xs" c="dimmed">
                  Get notified when preferred spots become available
                </Text>
              </div>
            </Group>
            <Switch color="violet" />
          </Group>
          <Group justify="space-between">
            <Group gap="sm">
              <MapPin className="h-4 w-4 text-gray-500" />
              <div>
                <Text size="sm" fw={500}>
                  Preferred Floor
                </Text>
                <Text size="xs" c="dimmed">
                  Default floor shown when browsing parking spaces
                </Text>
              </div>
            </Group>
            <SegmentedControl
              value={preferredFloor}
              onChange={(value) => setPreferredFloor(value as FloorId)}
              data={['B1', 'B2', 'B3']}
              color="violet"
              size="xs"
            />
          </Group>
        </Stack>
      </Paper>
    </Stack>
  )
}
