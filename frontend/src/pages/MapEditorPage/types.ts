import type { LabelPosition, ParkingLot, Spot, SpotCoordinates } from '@/types'

// — types —

export type Mode = 'draw' | 'select'

export type SaveStatus = 'idle' | 'saving' | 'saved'

export interface PendingRect {
  x: number
  y: number
  readonly width: number
  readonly height: number
  readonly rotation: number
  readonly labelPosition: LabelPosition
  readonly labelRotation: number
}

// Base constraint for the CoordControls generic
export interface CoordControlsValue {
  readonly rotation: number
  readonly labelPosition: LabelPosition
  readonly labelRotation: number
}

// — props interfaces —

export interface SaveIndicatorProps {
  readonly status: SaveStatus
}

export interface LotTabsProps {
  readonly lots: ParkingLot[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
}

export interface CoordControlsProps<T extends CoordControlsValue> {
  readonly value: T
  readonly onChange: (patch: Partial<T>) => void
}

export interface PendingPanelProps {
  readonly pending: PendingRect
  readonly unmappedSpots: Spot[]
  readonly imgW: number
  readonly imgH: number
  readonly onSaveToSpot: (
    spotId: string,
    coords: SpotCoordinates,
  ) => Promise<void>
  readonly onCreateSpot: (
    number: number,
    label: string,
    coords: SpotCoordinates,
  ) => Promise<void>
  readonly onDiscard: () => void
  readonly onPendingChange: (patch: Partial<PendingRect>) => void
  readonly isSaving: boolean
}

export interface SelectedPanelProps {
  readonly spot: Spot & { coordinates: SpotCoordinates }
  readonly imgW: number
  readonly imgH: number
  readonly onAutoSave: (coords: SpotCoordinates) => void
  /** Called immediately on every coord change (viewBox space) so the canvas can update without waiting for the save debounce. */
  readonly onCoordsChange: (coords: SpotCoordinates) => void
  readonly onRemove: () => void
  readonly saveStatus: SaveStatus
}

export interface ParkingMapCanvasProps {
  readonly svgRef: React.RefObject<SVGSVGElement | null>
  readonly imgW: number
  readonly imgH: number
  readonly activeLot: ParkingLot
  readonly mode: Mode
  readonly mappedSpots: (Spot & { coordinates: SpotCoordinates })[]
  readonly selectedSpotId: string | null
  readonly pendingRect: PendingRect | null
  readonly previewRect: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  } | null
  readonly onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  readonly onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  readonly onMouseUp: () => void
  readonly onMouseLeave: () => void
  readonly onSpotClick: (e: React.MouseEvent, spotId: string) => void
  /** Live viewBox coords for the selected spot — renders immediately without waiting for the save debounce. */
  readonly selectedSpotLiveCoords: SpotCoordinates | null
}
