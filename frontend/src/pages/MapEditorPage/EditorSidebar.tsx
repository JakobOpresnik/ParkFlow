import { useTranslation } from 'react-i18next'

import type { ParkingLot, Spot, SpotCoordinates } from '@/types'

import { PendingPanel } from './PendingPanel'
import { SelectedPanel } from './SelectedPanel'
import type { Mode, PendingRect, SaveStatus } from './types'

// — types —

interface EditorSidebarProps {
  readonly activeLot: ParkingLot
  readonly mappedCount: number
  readonly totalCount: number
  readonly pendingRect: PendingRect | null
  readonly selectedSpot: (Spot & { coordinates: SpotCoordinates }) | null
  readonly unmappedSpots: Spot[]
  readonly imgW: number
  readonly imgH: number
  readonly isMutating: boolean
  readonly mode: Mode
  readonly saveStatus: SaveStatus
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
  readonly onAutoSave: (coords: SpotCoordinates) => void
  readonly onCoordsChange: (coords: SpotCoordinates) => void
  readonly onRemove: () => void
}

// — main component —

export function EditorSidebar({
  activeLot,
  mappedCount,
  totalCount,
  pendingRect,
  selectedSpot,
  unmappedSpots,
  imgW,
  imgH,
  isMutating,
  mode,
  saveStatus,
  onSaveToSpot,
  onCreateSpot,
  onDiscard,
  onPendingChange,
  onAutoSave,
  onCoordsChange,
  onRemove,
}: EditorSidebarProps) {
  const { t } = useTranslation()
  return (
    <div className="w-64 shrink-0 space-y-3">
      {/* Stats */}
      <div className="bg-card rounded-lg border p-3">
        <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
          {activeLot.name}
        </p>
        <p className="text-2xl font-bold">{mappedCount}</p>
        <p className="text-muted-foreground text-xs">
          {t('mapEditor.ofSpotsMapped', { n: totalCount })}
        </p>
      </div>

      {/* Pending panel */}
      {pendingRect && (
        <PendingPanel
          pending={pendingRect}
          unmappedSpots={unmappedSpots}
          imgW={imgW}
          imgH={imgH}
          onSaveToSpot={onSaveToSpot}
          onCreateSpot={onCreateSpot}
          onDiscard={onDiscard}
          onPendingChange={onPendingChange}
          isSaving={isMutating}
        />
      )}

      {/* Selected spot panel */}
      {!pendingRect && selectedSpot && (
        <SelectedPanel
          key={selectedSpot.id}
          spot={selectedSpot}
          imgW={imgW}
          imgH={imgH}
          onAutoSave={onAutoSave}
          onCoordsChange={onCoordsChange}
          onRemove={onRemove}
          saveStatus={saveStatus}
        />
      )}

      {/* Empty state */}
      {!pendingRect && !selectedSpot && (
        <div className="bg-card text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
          {mode === 'draw'
            ? t('mapEditor.clickAndDrag')
            : t('mapEditor.clickToEdit')}
        </div>
      )}

      {/* Instructions */}
      <div className="text-muted-foreground space-y-1 rounded-lg border p-3 text-xs">
        <p className="text-foreground font-medium">{t('mapEditor.howToUse')}</p>
        <p>{t('mapEditor.instruction1')}</p>
        <p>{t('mapEditor.instruction2')}</p>
        <p>{t('mapEditor.instruction3')}</p>
        <p>{t('mapEditor.instruction4')}</p>
      </div>
    </div>
  )
}
