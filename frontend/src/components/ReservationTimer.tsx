import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fmtTime } from '@/lib/datetime'

interface ReservationTimerProps {
  readonly expiresAt: string
  readonly arrivalTime?: string
}

function fmtFutureDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Live label for an active reservation. Refreshes every 30 s. */
export function ReservationTimer({
  expiresAt,
  arrivalTime,
}: ReservationTimerProps) {
  const { t } = useTranslation()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const expiry = new Date(expiresAt)
  const ms = expiry.getTime() - now
  const endStr = fmtTime(expiry)
  const startStr = arrivalTime ?? '09:00'

  if (ms <= 0) return <span>{t('bookings.availableNow')}</span>

  // More than 24 h away — show the date with interval
  if (ms > 24 * 3_600_000) {
    return (
      <span>
        {t('bookings.takenOnDate', {
          date: fmtFutureDate(expiry),
          start: startStr,
          end: endStr,
        })}
      </span>
    )
  }

  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`
  return (
    <span>
      {t('bookings.takenWithCountdown', {
        start: startStr,
        end: endStr,
        countdown,
      })}
    </span>
  )
}
