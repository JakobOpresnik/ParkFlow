import { useState } from 'react'
import { Link, useMatchRoute } from '@tanstack/react-router'
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  TextInput,
  ActionIcon,
  Avatar,
  Text,
  Indicator,
  Popover,
  Stack,
  Button,
  Box,
  UnstyledButton,
  Modal,
  Select,
  Textarea,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  LayoutDashboard,
  CalendarCheck,
  Car,
  BarChart3,
  Bell,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'
import SearchBar from '@/components/SearchBar'

const navItems = [
  { to: '/' as const, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/booking' as const, label: 'Booking', icon: CalendarCheck },
  { to: '/parking' as const, label: 'Parking Spaces', icon: Car },
  { to: '/analytics' as const, label: 'Reports', icon: BarChart3 },
]

export default function Layout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const [opened, { toggle, close }] = useDisclosure()
  const [reportOpened, { open: openReport, close: closeReport }] =
    useDisclosure()
  const [notifOpened, setNotifOpened] = useState(false)
  const [reportCategory, setReportCategory] = useState<string | null>(null)
  const [reportSpotId, setReportSpotId] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const matchRoute = useMatchRoute()
  const {
    unreadCount,
    notifications,
    dismissNotification,
    clearAll,
    addNotification,
  } = useNotificationStore()

  const resetReportForm = () => {
    setReportCategory(null)
    setReportSpotId('')
    setReportDescription('')
  }

  const handleReportSubmit = () => {
    addNotification({
      type: 'success',
      title: 'Report Submitted',
      message: `Your ${reportCategory ?? 'problem'} report has been submitted successfully.`,
    })
    closeReport()
    resetReportForm()
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: { backgroundColor: '#f5f5f9' },
        header: { borderBottom: '1px solid #f0f0f0' },
        navbar: { borderRight: '1px solid #f0f0f0' },
      }}
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <SearchBar />
          </Group>

          <Text
            size="xl"
            fw={800}
            variant="gradient"
            gradient={{ from: 'violet', to: 'grape', deg: 135 }}
            style={{ letterSpacing: '-0.02em' }}
          >
            Park
            <Text
              span
              inherit
              variant="gradient"
              gradient={{ from: 'grape', to: 'pink', deg: 135 }}
            >
              Flow
            </Text>
          </Text>

          <Group gap="xs">
            {/* Notifications */}
            <Popover
              opened={notifOpened}
              onChange={setNotifOpened}
              position="bottom-end"
              width={320}
              shadow="xl"
              radius="lg"
            >
              <Popover.Target>
                <Indicator
                  label={unreadCount}
                  size={18}
                  disabled={unreadCount === 0}
                  color="red"
                  offset={6}
                  styles={{
                    indicator: {
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                      padding: 0,
                      fontSize: 10,
                    },
                  }}
                >
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="lg"
                    radius="xl"
                    onClick={() => setNotifOpened((o) => !o)}
                  >
                    <Bell className="h-5 w-5" />
                  </ActionIcon>
                </Indicator>
              </Popover.Target>
              <Popover.Dropdown p={0}>
                <Group
                  justify="space-between"
                  className="border-b border-gray-100 px-4 py-3"
                >
                  <Text size="sm" fw={600}>
                    Notifications
                  </Text>
                  {notifications.length > 0 && (
                    <UnstyledButton onClick={clearAll}>
                      <Text size="xs" c="red">
                        Clear all
                      </Text>
                    </UnstyledButton>
                  )}
                </Group>
                <Stack gap={0} className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <Text size="sm" c="dimmed" ta="center" py="xl">
                      No notifications
                    </Text>
                  ) : (
                    notifications.map((n) => {
                      const getDotColor = () => {
                        if (n.type === 'success') return 'bg-green-500'
                        if (n.type === 'error') return 'bg-red-500'
                        return 'bg-primary-500'
                      }
                      const dotColor = getDotColor()
                      return (
                        <Group
                          key={n.id}
                          px="md"
                          py="sm"
                          wrap="nowrap"
                          className="border-b border-gray-50 last:border-b-0 hover:bg-gray-50"
                        >
                          <div
                            className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${dotColor}`}
                          />
                          <Box className="min-w-0 flex-1">
                            <Text size="sm" fw={500} truncate>
                              {n.title}
                            </Text>
                            <Text size="xs" c="dimmed" truncate>
                              {n.message}
                            </Text>
                          </Box>
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="xs"
                            onClick={() => dismissNotification(n.id)}
                          >
                            <X className="h-3 w-3" />
                          </ActionIcon>
                        </Group>
                      )
                    })
                  )}
                </Stack>
              </Popover.Dropdown>
            </Popover>

            {/* Report Problem */}
            <Button
              variant="light"
              color="red"
              size="sm"
              radius="xl"
              leftSection={<AlertTriangle className="h-4 w-4" />}
              visibleFrom="sm"
              onClick={openReport}
            >
              Report Problem
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Navbar */}
      <AppShell.Navbar p="sm">
        <AppShell.Section>
          <Group gap="xs" px="sm" py="md">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <Text size="md" fw={700} lh={1.2}>
                ParkFlow
              </Text>
              <Text
                size="xs"
                c="dimmed"
                tt="uppercase"
                lh={1}
                style={{ letterSpacing: '0.08em', fontSize: 10 }}
              >
                Manager
              </Text>
            </div>
          </Group>
        </AppShell.Section>

        <AppShell.Section grow mt="sm">
          <Stack gap={4}>
            {navItems.map((item) => {
              const isActive = !!matchRoute({ to: item.to, fuzzy: true })
              return (
                <NavLink
                  key={item.to}
                  renderRoot={(props) => (
                    <Link to={item.to} onClick={close} {...props} />
                  )}
                  label={item.label}
                  leftSection={<item.icon className="h-5 w-5" />}
                  active={isActive}
                  variant="filled"
                  color="violet"
                  styles={{
                    root: {
                      borderRadius: 12,
                      fontWeight: 500,
                    },
                  }}
                />
              )
            })}
          </Stack>
        </AppShell.Section>

        <AppShell.Section>
          <UnstyledButton
            renderRoot={(props) => (
              <Link to="/profile" onClick={close} {...props} />
            )}
            className="w-full rounded-xl bg-gray-50 p-3 transition-colors hover:bg-gray-100"
          >
            <Group wrap="nowrap">
              <Avatar color="violet" radius="xl" size="md">
                AM
              </Avatar>
              <Box className="min-w-0">
                <Text size="sm" fw={600} truncate>
                  Alex Morgan
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  alex.m@company.com
                </Text>
              </Box>
            </Group>
          </UnstyledButton>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main content */}
      <AppShell.Main>{children}</AppShell.Main>

      {/* Report Problem Modal */}
      <Modal
        opened={reportOpened}
        onClose={() => {
          closeReport()
          resetReportForm()
        }}
        title="Report a Problem"
        radius="lg"
        centered
      >
        <Stack gap="md">
          <Select
            label="Category"
            labelProps={{
              pb: 4,
              pl: 4,
            }}
            placeholder="Select category"
            data={['Damaged Spot', 'Lighting Issue', 'Access Problem', 'Other']}
            value={reportCategory}
            onChange={setReportCategory}
          />
          <TextInput
            label="Spot ID"
            labelProps={{
              pb: 4,
              pl: 4,
            }}
            placeholder="e.g. B1-A3"
            value={reportSpotId}
            onChange={(e) => setReportSpotId(e.currentTarget.value)}
          />
          <Textarea
            label="Description"
            labelProps={{
              pb: 4,
              pl: 4,
            }}
            placeholder="Describe the problem..."
            required
            // minRows={3}
            maxRows={6}
            rows={3}
            value={reportDescription}
            onChange={(e) => setReportDescription(e.currentTarget.value)}
          />
          <Button
            color="violet"
            radius="md"
            disabled={!reportDescription.trim()}
            onClick={handleReportSubmit}
          >
            Submit Report
          </Button>
        </Stack>
      </Modal>
    </AppShell>
  )
}
