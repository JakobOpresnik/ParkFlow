import { useTranslation } from 'react-i18next'

export function MapLegend() {
  const { t } = useTranslation()
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
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
      <span className="flex items-center gap-1.5">
        <span
          className="size-2.5 rounded-sm"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--color-spot-spotted) 0 3px, var(--color-spot-spotted-stripe) 3px 6px)',
          }}
        />
        {t('map.spotted')}
      </span>
    </div>
  )
}
