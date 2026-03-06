import { useEffect, useState } from 'react'

interface ReservationTimerProps {
  readonly expiresAt: string
  readonly arrivalTime?: string
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
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
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const expiry = new Date(expiresAt)
  const ms = expiry.getTime() - now
  const endStr = fmtTime(expiry)
  const startStr = arrivalTime ?? '09:00'

  if (ms <= 0) return <span>Available now</span>

  // More than 24 h away — show the date with interval
  if (ms > 24 * 3_600_000) {
    return (
      <span>
        Taken on {fmtFutureDate(expiry)}, {startStr} – {endStr}
      </span>
    )
  }

  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`
  return (
    <span>
      Taken {startStr} – {endStr} · {countdown} left
    </span>
  )
}
