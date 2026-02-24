import { useEffect, useRef } from 'react'
import { notifications } from '@mantine/notifications'
import { CheckCircle, Info, AlertTriangle, XCircle } from 'lucide-react'
import { useNotificationStore } from '@/store/notificationStore'

const iconMap = {
  success: <CheckCircle className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
  warning: <AlertTriangle className="h-5 w-5" />,
  error: <XCircle className="h-5 w-5" />,
}

const colorMap = {
  success: 'green',
  info: 'violet',
  warning: 'yellow',
  error: 'red',
} as const

export default function ToastListener() {
  const allNotifications = useNotificationStore((s) => s.notifications)
  const shownRef = useRef(new Set<string>())

  useEffect(() => {
    const latest = allNotifications[0]
    if (latest && !shownRef.current.has(latest.id)) {
      shownRef.current.add(latest.id)
      notifications.show({
        title: latest.title,
        message: latest.message,
        color: colorMap[latest.type],
        icon: iconMap[latest.type],
        radius: 'lg',
        position: 'top-right',
        autoClose: 4000,
        mt: 60,
      })
    }
  }, [allNotifications])

  return null
}
