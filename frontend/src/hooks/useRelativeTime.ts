import { useTranslation } from 'react-i18next'

import { relativeTime } from '@/lib/datetime'

// Returns a formatter that renders an ISO timestamp relative to now ("2h ago"),
// localized to the active i18n language.
export function useRelativeTime() {
  const { i18n } = useTranslation()
  return (iso: string): string => relativeTime(iso, i18n.language)
}
