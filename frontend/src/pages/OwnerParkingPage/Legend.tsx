import { useTranslation } from 'react-i18next'

import type { DayStatus } from './types'
import { StatusConfig } from './utils'

export function Legend() {
  const { t } = useTranslation()
  const STATUS_LABELS: Record<DayStatus, string> = {
    free: t('ownerParking.statusFree'),
    occupied: t('ownerParking.statusOccupied'),
    reserved: t('ownerParking.statusReserved'),
  }
  return (
    <div className="flex items-center gap-3 text-[11px]">
      {(['free', 'occupied', 'reserved'] as const).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`size-2 rounded-full ${StatusConfig[s].dot}`} />
          <span className="text-muted-foreground">{STATUS_LABELS[s]}</span>
        </div>
      ))}
    </div>
  )
}
