import { useEffect, useState } from 'react'

function fmtTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Live countdown for an active reservation. Refreshes every 30 s. */
export function ReservationTimer({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const ms = new Date(expiresAt).getTime() - now
  const timeStr = fmtTime(new Date(expiresAt))
  if (ms <= 0) return <span>Expired</span>
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const countdown = h > 0 ? `${h}h ${m}m` : `${m}m`
  return (
    <span>
      Available at {timeStr} · in {countdown}
    </span>
  )
}
