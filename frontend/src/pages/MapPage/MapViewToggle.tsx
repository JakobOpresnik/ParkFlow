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
    <div className="absolute top-3 right-3 z-20">
      <div
        className={`flex flex-col gap-0.5 rounded-xl p-1 min-[800px]:flex-row ${
          isMapMode
            ? 'bg-primary/10 backdrop-blur-sm'
            : 'bg-card border shadow-sm'
        }`}
      >
        <button
          onClick={onSelectMap}
          title={t('map.mapView')}
          className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
            isMapMode
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Map className="size-4 shrink-0" />
          <span className="hidden sm:inline">{t('map.mapView')}</span>
        </button>
        <button
          onClick={onSelectGrid}
          title={t('map.gridView')}
          className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
            !isMapMode
              ? 'bg-accent text-foreground'
              : 'text-primary/70 hover:bg-primary/15 hover:text-primary'
          }`}
        >
          <LayoutGrid className="size-4 shrink-0" />
          <span className="hidden sm:inline">{t('map.gridView')}</span>
        </button>
      </div>
    </div>
  )
}
