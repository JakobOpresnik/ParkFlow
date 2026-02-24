import { create } from 'zustand'
import type { ActivityEvent } from '@/types'
import { seedEvents } from '@/data/activity_feed'

const MAX_EVENTS = 20

interface ActivityFeedState {
  events: ActivityEvent[]
  latestEventId: string | null
  addEvent: (event: ActivityEvent) => void
}

export const useActivityFeedStore = create<ActivityFeedState>((set, get) => ({
  events: seedEvents,
  latestEventId: null,

  addEvent: (event) => {
    const current = get().events
    set({
      events: [event, ...current].slice(0, MAX_EVENTS),
      latestEventId: event.id,
    })
  },
}))
