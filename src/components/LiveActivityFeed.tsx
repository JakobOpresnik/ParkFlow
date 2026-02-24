import { useRef } from 'react'
import { Paper, Group, Text, Badge, ScrollArea, ThemeIcon } from '@mantine/core'
import { Car, CircleCheck, CalendarCheck, X, AlertTriangle } from 'lucide-react'
import { useActivityFeed } from '@/hooks/useActivityFeed'
import { useActivityFeedStore } from '@/store/activityFeedStore'
import type { ActivityEventType } from '@/types'

const iconMap: Record<ActivityEventType, typeof Car> = {
  parked: Car,
  available: CircleCheck,
  reserved: CalendarCheck,
  cancelled: X,
  alert: AlertTriangle,
}

const colorMap: Record<ActivityEventType, string> = {
  parked: 'blue',
  available: 'green',
  reserved: 'violet',
  cancelled: 'red',
  alert: 'orange',
}

function relativeTime(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return 'Yesterday'
}

export default function LiveActivityFeed() {
  const events = useActivityFeed()
  const latestEventId = useActivityFeedStore((s) => s.latestEventId)
  const viewportRef = useRef<HTMLDivElement>(null)

  return (
    <Paper radius="lg" shadow="xs" p="lg" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Text fw={700} size="lg">
            Live Activity
          </Text>
          <Badge variant="dot" color="green" size="sm">
            Live
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          {events.length} events
        </Text>
      </Group>

      <ScrollArea h={320} viewportRef={viewportRef}>
        <div className="space-y-2">
          {events.map((event) => {
            const Icon = iconMap[event.type]
            const color = colorMap[event.type]
            return (
              <div
                key={event.id}
                className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50"
                style={
                  event.id === latestEventId
                    ? { animation: 'var(--animate-slide-in-feed)' }
                    : undefined
                }
              >
                <ThemeIcon
                  variant="light"
                  color={color}
                  size="md"
                  radius="xl"
                  className="mt-0.5 shrink-0"
                >
                  <Icon className="h-3.5 w-3.5" />
                </ThemeIcon>
                <div className="min-w-0 flex-1">
                  <Text size="sm" className="leading-snug">
                    {event.message}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {relativeTime(event.timestamp)}
                  </Text>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </Paper>
  )
}
