import {
  Maximize2,
  Minimize2,
  Minus,
  PanelRight,
  Plus,
  RotateCcw,
} from 'lucide-react'
import type { RefObject } from 'react'

import type { ParkingMapHandle } from '@/components/ParkingMap/ParkingMap'

import { OverlayButton } from './OverlayButton'

// — types —

interface MapControlsProps {
  readonly sidebarOpen: boolean
  readonly onSidebarToggle: () => void
  readonly mapRef: RefObject<ParkingMapHandle | null>
  readonly isFullscreen: boolean
  readonly onToggleFullscreen: () => void
}

// — main component —

export function MapControls({
  sidebarOpen,
  onSidebarToggle,
  mapRef,
  isFullscreen,
  onToggleFullscreen,
}: MapControlsProps) {
  return (
    <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2">
      <div className="rounded-xl bg-black/40 p-1 backdrop-blur-sm">
        <OverlayButton
          onClick={onSidebarToggle}
          title="Toggle sidebar"
          active={sidebarOpen}
        >
          <PanelRight className="size-5" />
        </OverlayButton>
      </div>
      <div className="flex flex-col rounded-xl bg-black/40 p-1 backdrop-blur-sm">
        <OverlayButton onClick={() => mapRef.current?.zoomIn()} title="Zoom in">
          <Plus className="size-5" />
        </OverlayButton>
        <div className="mx-1 h-px bg-white/20" />
        <OverlayButton
          onClick={() => mapRef.current?.zoomOut()}
          title="Zoom out"
        >
          <Minus className="size-5" />
        </OverlayButton>
        <div className="mx-1 h-px bg-white/20" />
        <OverlayButton
          onClick={() => mapRef.current?.resetZoom()}
          title="Reset zoom"
        >
          <RotateCcw className="size-4" />
        </OverlayButton>
      </div>
      <div className="rounded-xl bg-black/40 p-1 backdrop-blur-sm">
        <OverlayButton
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="size-5" />
          ) : (
            <Maximize2 className="size-5" />
          )}
        </OverlayButton>
      </div>
    </div>
  )
}
