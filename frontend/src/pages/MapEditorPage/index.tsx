import { notifications } from '@mantine/notifications'
import { useEffect, useRef, useState } from 'react'

import { useLots } from '@/hooks/useLots'
import { useCreateSpot, usePatchCoordinates, useSpots } from '@/hooks/useSpots'
import type { Spot, SpotCoordinates } from '@/types'

import { EditorSidebar } from './EditorSidebar'
import { EditorToolbar } from './EditorToolbar'
import { ParkingMapCanvas } from './ParkingMapCanvas'
import type { Mode, PendingRect } from './types'
import { useAutoSave } from './useAutoSave'
import { getSvgPoint, MIN_RECT_SIZE, normalizeRect } from './utils'

// — constants —

const CANVAS_SKELETON_STYLE = { aspectRatio: '13/10' }

// — main component —

export function MapEditorPage() {
  const svgRef = useRef<SVGSVGElement>(null)

  const { data: lots = [], isLoading: lotsLoading } = useLots()
  const { data: allSpots = [], isLoading: spotsLoading } = useSpots()
  const patchCoords = usePatchCoordinates()
  const createSpot = useCreateSpot()

  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('draw')
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  )
  const [dragCurrent, setDragCurrent] = useState<{
    x: number
    y: number
  } | null>(null)
  const [pendingRect, setPendingRect] = useState<PendingRect | null>(null)
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null)
  const [selectedSpotLiveCoords, setSelectedSpotLiveCoords] =
    useState<SpotCoordinates | null>(null)
  const { saveStatus, scheduleAutoSave } = useAutoSave(patchCoords)

  const isLoading = lotsLoading || spotsLoading
  const isMutating = patchCoords.isPending || createSpot.isPending

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

  // Arrow key nudge for pending rect
  useEffect(() => {
    if (!pendingRect) return
    function handleKeyDown(e: KeyboardEvent) {
      // Don't hijack arrow keys while user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return
      const step = e.shiftKey ? 5 : 1
      const delta: Partial<PendingRect> = {}
      if (e.key === 'ArrowLeft') delta.x = (pendingRect?.x ?? 0) - step
      else if (e.key === 'ArrowRight') delta.x = (pendingRect?.x ?? 0) + step
      else if (e.key === 'ArrowUp') delta.y = (pendingRect?.y ?? 0) - step
      else if (e.key === 'ArrowDown') delta.y = (pendingRect?.y ?? 0) + step
      else return
      e.preventDefault()
      setPendingRect((p) => (p ? { ...p, ...delta } : p))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pendingRect])

  // — mouse handlers —

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || mode !== 'draw') return
    e.preventDefault()
    const pt = getSvgPoint(svgRef.current, e)
    setDragStart(pt)
    setDragCurrent(pt)
    setSelectedSpotId(null)
    setPendingRect(null)
  }

  function handleSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || !dragStart || mode !== 'draw') return
    setDragCurrent(getSvgPoint(svgRef.current, e))
  }

  function handleSvgMouseUp() {
    if (!dragStart || !dragCurrent || mode !== 'draw') return
    const rect = normalizeRect(
      dragStart.x,
      dragStart.y,
      dragCurrent.x,
      dragCurrent.y,
    )
    if (rect.width > MIN_RECT_SIZE && rect.height > MIN_RECT_SIZE) {
      setPendingRect({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        rotation: 0,
        labelPosition: 'top',
        labelRotation: 0,
      })
      setMode('select')
    }
    setDragStart(null)
    setDragCurrent(null)
  }

  function handleSpotClick(e: React.MouseEvent, spotId: string) {
    if (mode !== 'select') return
    e.stopPropagation()
    setSelectedSpotId(spotId)
    setPendingRect(null)
  }

  function handleMouseLeave() {
    setDragStart(null)
    setDragCurrent(null)
  }

  // — toolbar handlers —

  function handleSetDrawMode() {
    setMode('draw')
    setSelectedSpotId(null)
    setPendingRect(null)
  }

  function handleLotSelect(id: string) {
    setSelectedLotId(id)
    setSelectedSpotId(null)
    setPendingRect(null)
  }

  // — sidebar handlers —

  function handleDiscard() {
    setPendingRect(null)
  }

  function handlePendingChange(patch: Partial<PendingRect>) {
    setPendingRect((p) => (p ? { ...p, ...patch } : p))
  }

  // — mutations —

  async function handleSaveToSpot(spotId: string, relCoords: SpotCoordinates) {
    try {
      await patchCoords.mutateAsync({ id: spotId, coordinates: relCoords })
      notifications.show({ message: 'Coordinates saved', color: 'green' })
      setPendingRect(null)
      setSelectedSpotId(spotId)
      setMode('select')
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Failed to save',
        color: 'red',
      })
    }
  }

  async function handleCreateSpot(
    number: number,
    label: string,
    relCoords: SpotCoordinates,
  ) {
    if (!activeLotId) return
    try {
      const spot = await createSpot.mutateAsync({
        number,
        label: label || null,
        lot_id: activeLotId,
      })
      await patchCoords.mutateAsync({ id: spot.id, coordinates: relCoords })
      notifications.show({ message: `Spot #${number} created`, color: 'green' })
      setPendingRect(null)
      setSelectedSpotId(spot.id)
      setMode('select')
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Failed to create spot',
        color: 'red',
      })
    }
  }

  async function handleRemoveCoords() {
    if (!selectedSpotId) return
    try {
      await patchCoords.mutateAsync({ id: selectedSpotId, coordinates: null })
      notifications.show({ message: 'Coordinates removed', color: 'green' })
      setSelectedSpotId(null)
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Failed to remove',
        color: 'red',
      })
    }
  }

  const previewRect =
    dragStart && dragCurrent && mode === 'draw'
      ? normalizeRect(dragStart.x, dragStart.y, dragCurrent.x, dragCurrent.y)
      : null

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Map Editor</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Draw rectangles on the floor plan to assign coordinates to parking
          spots
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
            No lots found. Add a parking lot via the Admin page first.
          </p>
        </div>
      )}

      {!isLoading && activeLot && (
        <div className="flex items-start gap-4">
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
            pendingRect={pendingRect}
            previewRect={previewRect}
            onMouseDown={handleSvgMouseDown}
            onMouseMove={handleSvgMouseMove}
            onMouseUp={handleSvgMouseUp}
            onMouseLeave={handleMouseLeave}
            onSpotClick={handleSpotClick}
          />

          <EditorSidebar
            activeLot={activeLot}
            mappedCount={mappedSpots.length}
            totalCount={lotSpots.length}
            pendingRect={pendingRect}
            selectedSpot={selectedSpot}
            unmappedSpots={unmappedSpots}
            imgW={imgW}
            imgH={imgH}
            isMutating={isMutating}
            mode={mode}
            saveStatus={saveStatus}
            onSaveToSpot={handleSaveToSpot}
            onCreateSpot={handleCreateSpot}
            onDiscard={handleDiscard}
            onPendingChange={handlePendingChange}
            onAutoSave={(relCoords) => {
              if (selectedSpot) scheduleAutoSave(selectedSpot.id, relCoords)
            }}
            onCoordsChange={setSelectedSpotLiveCoords}
            onRemove={handleRemoveCoords}
          />
        </div>
      )}
    </div>
  )
}
