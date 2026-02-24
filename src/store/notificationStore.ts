import { create } from 'zustand'
import type { Notification } from '@/types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void
  dismissNotification: (id: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: `notif-${Date.now()}`,
      timestamp: Date.now(),
    }
    set({
      notifications: [notification, ...get().notifications],
      unreadCount: get().unreadCount + 1,
    })
  },

  dismissNotification: (id) => {
    set({
      notifications: get().notifications.filter((n) => n.id !== id),
      unreadCount: Math.max(0, get().unreadCount - 1),
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },
}))
