import { useTranslation } from 'react-i18next'

export function MapLegend() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-free size-2.5 rounded-sm" />
        {t('map.free')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-occupied size-2.5 rounded-sm" />
        {t('map.occupied')}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-reserved size-2.5 rounded-sm" />
        {t('map.reserved')}
      </span>
    </div>
  )
}
