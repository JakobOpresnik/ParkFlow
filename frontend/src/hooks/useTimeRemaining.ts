import { useTranslation } from 'react-i18next'

/** Returns a translator that renders the time left until `expiresAt`. */
export function useTimeRemaining() {
  const { t } = useTranslation()
  return function timeRemaining(expiresAt: string): string {
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) return t('bookings.expired')
    const h = Math.floor(ms / 3_600_000)
    const m = Math.floor((ms % 3_600_000) / 60_000)
    return h > 0
      ? t('bookings.remaining', { h, m })
      : t('bookings.remainingMins', { m })
  }
}
