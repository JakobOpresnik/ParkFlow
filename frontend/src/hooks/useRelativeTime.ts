import { useTranslation } from 'react-i18next'

import { relativeTime } from '@/lib/datetime'

// Returns a formatter that renders an ISO timestamp relative to now ("2h ago"),
// localized to the active i18n language. The 2–6 day range is rendered as a
// plain "N days ago" — Intl's idiomatic Slovenian for 2 days
// ("predvčerajšnjim") reads poorly. Everything else falls through to Intl.
export function useRelativeTime() {
  const { t, i18n } = useTranslation()
  return (iso: string): string => {
    const ts = new Date(iso).getTime()
    if (Number.isFinite(ts)) {
      const days = Math.round((ts - Date.now()) / 86_400_000)
      if (Math.abs(days) >= 2 && Math.abs(days) < 7) {
        return days < 0
          ? t('time.daysAgo', { n: -days })
          : t('time.inDays', { n: days })
      }
    }
    return relativeTime(iso, i18n.language)
  }
}
