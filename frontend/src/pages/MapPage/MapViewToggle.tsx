import { LayoutGrid, Map } from 'lucide-react'

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
          title="Map view"
          className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
            isMapMode
              ? 'bg-white/20 text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <Map className="size-4 shrink-0" />
          <span>Map</span>
        </button>
        <button
          onClick={onSelectGrid}
          title="Grid view"
          className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
            !isMapMode
              ? 'bg-accent text-foreground'
              : 'text-white/60 hover:bg-white/10 hover:text-white'
          }`}
        >
          <LayoutGrid className="size-4 shrink-0" />
          <span>Grid</span>
        </button>
      </div>
    </div>
  )
}
