import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useLots } from '@/hooks/useLots'
import { useSpots } from '@/hooks/useSpots'
import { useUIStore } from '@/store/uiStore'
import type { Spot, SpotCoordinates } from '@/types'

import { EditorSidebar } from './EditorSidebar'
import { EditorToolbar } from './EditorToolbar'
import { ParkingMapCanvas } from './ParkingMapCanvas'
import type { Mode } from './types'
import { useAutoSave } from './useAutoSave'
import { useDrawing } from './useDrawing'
import { useEditorMutations } from './useEditorMutations'

// — constants —

const CANVAS_SKELETON_STYLE = { aspectRatio: '13/10' }

// — main component —

export function MapEditorPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setMoreOpen = useUIStore((s) => s.setMoreDrawerOpen)
  const svgRef = useRef<SVGSVGElement>(null)

  const { data: lots = [], isLoading: lotsLoading } = useLots()
  const { data: allSpots = [], isLoading: spotsLoading } = useSpots()

  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('draw')
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const [selectedSpotLiveCoords, setSelectedSpotLiveCoords] =
    useState<SpotCoordinates | null>(null)

  const drawing = useDrawing({
    svgRef,
    mode,
    setMode,
    onClearSelection: () => setSelectedSpotId(null),
  })

  const mutations = useEditorMutations({
    onSaved: (spotId) => {
      drawing.setPendingRect(null)
      setSelectedSpotId(spotId)
      setMode('select')
    },
    onRemoved: () => setSelectedSpotId(null),
  })

  const { saveStatus, scheduleAutoSave } = useAutoSave(mutations.patchCoords)

  // — derived data —

  const isLoading = lotsLoading || spotsLoading
  const activeLotId = selectedLotId ?? lots[0]?.id ?? null
  const activeLot = lots.find((l) => l.id === activeLotId) ?? null
  const imgW = activeLot?.image_width ?? 792
  const imgH = activeLot?.image_height ?? 612

  const lotSpots = allSpots.filter((s) => s.lot_id === activeLotId)
  const mappedSpots = lotSpots.filter(
    (s): s is Spot & { coordinates: SpotCoordinates } =>
      s.coordinates !== null && typeof s.coordinates.x === 'number',
  )
  const unmappedSpots = lotSpots.filter(
    (s) => !s.coordinates || typeof s.coordinates.x !== 'number',
  )
  const selectedSpot = mappedSpots.find((s) => s.id === selectedSpotId) ?? null

  // — toolbar handlers —

  function handleSetDrawMode() {
    setMode('draw')
    setSelectedSpotId(null)
    drawing.setPendingRect(null)
  }

  function handleLotSelect(id: string) {
    setSelectedLotId(id)
    setSelectedSpotId(null)
    drawing.setPendingRect(null)
  }

  function handleSpotClick(e: React.MouseEvent, spotId: string) {
    if (mode !== 'select') return
    e.stopPropagation()
    setSelectedSpotId(spotId)
    drawing.setPendingRect(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button
          onClick={() => {
            setMoreOpen(true)
            void navigate({ to: '/' })
          }}
          className="text-muted-foreground hover:text-foreground mb-2 inline-flex cursor-pointer items-center gap-1 sm:hidden"
          style={{ fontSize: 12 }}
        >
          <ArrowLeft className="size-3.5" />
          {t('common.back')}
        </button>
        <h1 className="text-2xl font-semibold">{t('mapEditor.title')}</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t('mapEditor.subtitle')}
        </p>
      </div>

      <EditorToolbar
        mode={mode}
        onDrawMode={handleSetDrawMode}
        onSelectMode={() => setMode('select')}
        isLoading={isLoading}
        lots={lots}
        activeLotId={activeLotId}
        onLotSelect={handleLotSelect}
        mappedCount={mappedSpots.length}
        totalCount={lotSpots.length}
      />

      {isLoading && (
        <div
          className="bg-muted animate-pulse rounded-lg border"
          style={CANVAS_SKELETON_STYLE}
        />
      )}

      {!isLoading && !activeLot && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            {t('mapEditor.noLotsFound')}
          </p>
        </div>
      )}

      {!isLoading && activeLot && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <ParkingMapCanvas
            key={activeLotId ?? 'none'}
            svgRef={svgRef}
            imgW={imgW}
            imgH={imgH}
            activeLot={activeLot}
            mode={mode}
            mappedSpots={mappedSpots}
            selectedSpotId={selectedSpotId}
            selectedSpotLiveCoords={selectedSpotLiveCoords}
            pendingRect={drawing.pendingRect}
            previewRect={drawing.previewRect}
            onMouseDown={drawing.handleSvgMouseDown}
            onMouseMove={drawing.handleSvgMouseMove}
            onMouseUp={drawing.handleSvgMouseUp}
            onMouseLeave={drawing.handleMouseLeave}
            onSpotClick={handleSpotClick}
          />

          <EditorSidebar
            activeLot={activeLot}
            mappedCount={mappedSpots.length}
            totalCount={lotSpots.length}
            pendingRect={drawing.pendingRect}
            selectedSpot={selectedSpot}
            unmappedSpots={unmappedSpots}
            imgW={imgW}
            imgH={imgH}
            isMutating={mutations.isPending}
            mode={mode}
            saveStatus={saveStatus}
            onSaveToSpot={mutations.handleSaveToSpot}
            onCreateSpot={(number, label, relCoords) =>
              mutations.handleCreateSpot(number, label, relCoords, activeLotId!)
            }
            onDiscard={drawing.handleDiscard}
            onPendingChange={drawing.handlePendingChange}
            onAutoSave={(relCoords) => {
              if (selectedSpot) scheduleAutoSave(selectedSpot.id, relCoords)
            }}
            onCoordsChange={setSelectedSpotLiveCoords}
            onRemove={() => {
              if (selectedSpotId)
                void mutations.handleRemoveCoords(selectedSpotId)
            }}
          />
        </div>
      )}
    </div>
  )
}
