import { Bell } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from '@/hooks/useNotifications'

export function NotificationBell() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const unread = notifications.filter((n) => n.read_at === null).length

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
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="border-border rounded-lg border p-3 text-sm"
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-muted-foreground">{n.body}</p>
                  <p className="text-muted-foreground/60 mt-1 text-xs">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
