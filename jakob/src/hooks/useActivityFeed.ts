import { useEffect } from 'react'
import { useActivityFeedStore } from '@/store/activityFeedStore'
import { newEventTemplates } from '@/data/activity_feed'
import type { ActivityEvent } from '@/types'

let templateIndex = 0

export function useActivityFeed() {
  const events = useActivityFeedStore((s) => s.events)
  const addEvent = useActivityFeedStore((s) => s.addEvent)

  useEffect(() => {
    const scheduleNext = () => {
      const jitter = 20000 + Math.random() * 10000 // 20-30s
      return window.setTimeout(() => {
        const template =
          newEventTemplates[templateIndex % newEventTemplates.length]
        templateIndex++
        const event: ActivityEvent = {
          id: `live-${Date.now()}`,
          type: template.type,
          message: template.message,
          timestamp: Date.now(),
        }
        addEvent(event)
        timerId = scheduleNext()
      }, jitter)
    }

    let timerId = scheduleNext()
    return () => clearTimeout(timerId)
  }, [addEvent])

  return events
}
