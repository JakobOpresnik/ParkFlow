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

interface NotificationBellProps {
  // 'sidebar' = compact icon button (desktop sidebar header);
  // 'mobile' = bottom-nav tab (icon + label), matching MobileBottomNav items.
  readonly variant?: 'sidebar' | 'mobile'
}

export function NotificationBell({
  variant = 'sidebar',
}: NotificationBellProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const markAll = useMarkAllNotificationsRead()
  const unread = notifications.filter((n) => n.read_at === null).length

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next && unread > 0) markAll.mutate()
  }

  const badge =
    unread > 0 ? (
      <span className="bg-destructive absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white">
        {unread > 9 ? '9+' : unread}
      </span>
    ) : null

  return (
    <>
      {variant === 'mobile' ? (
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          aria-label={t('notifications.title')}
          className="text-muted-foreground flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-0.5 px-0.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-colors"
        >
          <span className="relative">
            <Bell className="size-5 shrink-0" />
            {badge}
          </span>
          <span className="w-full truncate text-center text-[9px] leading-tight">
            {t('nav.notifications')}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          title={t('notifications.title')}
          aria-label={t('notifications.title')}
          className="text-muted-foreground/70 hover:text-muted-foreground relative cursor-pointer rounded-full p-1 transition-colors"
        >
          <Bell className="size-4" />
          {badge}
        </button>
      )}
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
