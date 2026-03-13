import type { SpotStatus } from '@/types'

import { STATUS_CONFIG } from './constants'

// — types —

interface StatusBannerProps {
  readonly status: SpotStatus
  readonly subtext: string
}

// — main component —

export function StatusBanner({ status, subtext }: StatusBannerProps) {
  const config = STATUS_CONFIG[status]
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bg}`}
    >
      <span className={config.text}>{config.icon}</span>
      <div>
        <p className={`text-sm leading-snug font-semibold ${config.text}`}>
          {config.label}
        </p>
        <p className="text-muted-foreground text-xs">{subtext}</p>
      </div>
    </div>
  )
}
