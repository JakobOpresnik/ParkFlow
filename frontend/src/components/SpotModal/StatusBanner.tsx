import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { SpotStatus } from '@/types'

import { STATUS_CONFIG } from './constants'

// — types —

interface StatusBannerProps {
  readonly status: SpotStatus
  readonly subtext: string
  readonly titleOverride?: string
  readonly action?: ReactNode
}

// — main component —

export function StatusBanner({
  status,
  subtext,
  titleOverride,
  action,
}: StatusBannerProps) {
  const { t } = useTranslation()
  const config = STATUS_CONFIG[status]

  const STATUS_LABELS: Record<SpotStatus, string> = {
    free: t('spotModal.available'),
    occupied: t('spotModal.occupied'),
    reserved: t('spotModal.reservedStatus'),
    spotted: t('spotModal.spottedStatus'),
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bg}`}
    >
      <span className={config.text}>{config.icon}</span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm leading-snug font-semibold ${config.text}`}>
          {titleOverride ?? STATUS_LABELS[status]}
        </p>
        <p className="text-muted-foreground text-xs">{subtext}</p>
      </div>
      {action && <div className="ml-auto shrink-0">{action}</div>}
    </div>
  )
}
