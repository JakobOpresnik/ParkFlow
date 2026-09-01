import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLotName } from '@/hooks/useLotName'
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from '@/hooks/useNotifications'
import { useRelativeTime } from '@/hooks/useRelativeTime'
import type { AppNotification } from '@/types'

export function NotificationBell() {
  const { t } = useTranslation()
  const tLot = useLotName()
  const relativeTime = useRelativeTime()
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const unread = notifications.filter((n) => n.read_at === null).length

  // Notification title/body are stored in English (written by the backend bot).
  // Re-render them in the user's language from the notification type + data,
  // falling back to the stored text for unknown types or older rows.
  function localize(n: AppNotification): { title: string; body: string } {
    const data = n.data ?? {}
    const str = (k: string) =>
      typeof data[k] === 'string' ? data[k] : undefined
    switch (n.type) {
      case 'reservation_today': {
        const floorVal = str('floor')
        return {
          title: t('notifications.reservationTodayTitle'),
          body: t('notifications.reservationTodayBody', {
            spot: str('spot_label') ?? t('notifications.yourSpot'),
            floor: floorVal ? ` (${tLot(floorVal)})` : '',
          }),
        }
      }
      case 'owner_release_spot':
        return {
          title: t('notifications.ownerReleaseTitle'),
          body: t('notifications.ownerReleaseBody'),
        }
      case 'reservation_released': {
        const spot = str('spot_label')
        if (spot) {
          const dateVal = str('date')
          return {
            title: t('notifications.reservationReleasedTitle'),
            body: t('notifications.reservationReleasedBody', {
              spot,
              date: dateVal ? t('notifications.onDate', { date: dateVal }) : '',
            }),
          }
        }
        break
      }
    }
    return { title: n.title, body: n.body }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unread > 0) markAll.mutate()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        title={t('notifications.title')}
        aria-label={t('notifications.title')}
        className="text-muted-foreground/70 hover:text-muted-foreground relative cursor-pointer rounded-full p-1 transition-colors"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="bg-destructive absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('notifications.title')}</DialogTitle>
          </DialogHeader>
          {notifications.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t('notifications.empty')}
            </p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {notifications.map((n) => {
                const { title, body } = localize(n)
                return (
                  <li
                    key={n.id}
                    className="border-border rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">{title}</p>
                    <p className="text-muted-foreground">{body}</p>
                    <p
                      className="text-muted-foreground/60 mt-1 text-xs"
                      title={new Date(n.created_at).toLocaleString()}
                    >
                      {relativeTime(n.created_at)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
