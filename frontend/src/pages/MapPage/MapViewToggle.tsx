import { LayoutGrid, Map } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ─── types ────────────────────────────────────────────────────────────────────

interface MapViewToggleProps {
  readonly isMapMode: boolean
  readonly onSelectMap: () => void
  readonly onSelectGrid: () => void
}

// ─── component ────────────────────────────────────────────────────────────────

export function MapViewToggle({
  isMapMode,
  onSelectMap,
  onSelectGrid,
}: MapViewToggleProps) {
  const { t } = useTranslation()
  return (
    <div className="absolute top-3 right-8 z-20">
      <div
        className={`flex gap-0.5 rounded-xl p-1 ${
          isMapMode
            ? 'bg-black/40 backdrop-blur-sm'
            : 'bg-card border shadow-sm'
        }`}
      >
        <button
          onClick={onSelectMap}
          title={t('map.mapView')}
          className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
            isMapMode
              ? 'bg-white/20 text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Map className="size-4 shrink-0" />
          <span>{t('map.mapView')}</span>
        </button>
        <button
          onClick={onSelectGrid}
          title={t('map.gridView')}
          className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
            !isMapMode
              ? 'bg-accent text-foreground'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <LayoutGrid className="size-4 shrink-0" />
          <span>{t('map.gridView')}</span>
        </button>
      </div>
    </div>
  )
}
