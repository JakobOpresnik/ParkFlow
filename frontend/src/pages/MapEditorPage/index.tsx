import { notifications } from '@mantine/notifications'
import { MousePointer, Pencil } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useLots } from '@/hooks/useLots'
import { useCreateSpot, usePatchCoordinates, useSpots } from '@/hooks/useSpots'
import type { Spot, SpotCoordinates } from '@/types'

import { LotTabs } from './LotTabs'
import { ParkingMapCanvas } from './ParkingMapCanvas'
import { PendingPanel } from './PendingPanel'
import { SelectedPanel } from './SelectedPanel'
import type { Mode, PendingRect } from './types'
import { useAutoSave } from './useAutoSave'
import { getSvgPoint, MIN_RECT_SIZE, normalizeRect } from './utils'

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

  // ── Mouse handlers ─────────────────────────────────────────────

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

  // ── Mutations ──────────────────────────────────────────────────

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

  // ── Derived render values ──────────────────────────────────────

  const previewRect =
    dragStart && dragCurrent && mode === 'draw'
      ? normalizeRect(dragStart.x, dragStart.y, dragCurrent.x, dragCurrent.y)
      : null

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Map Editor</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Draw rectangles on the floor plan to assign coordinates to parking
          spots
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
        {/* Left: mode toggle */}
        <div className="flex items-center">
          <div className="flex rounded-md border">
            <button
              className={`flex cursor-pointer items-center gap-1.5 rounded-l-md px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'draw'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => {
                setMode('draw')
                setSelectedSpotId(null)
                setPendingRect(null)
              }}
            >
              <Pencil className="size-4" />
              Draw
            </button>
            <button
              className={`flex cursor-pointer items-center gap-1.5 rounded-r-md border-l px-3 py-1.5 text-sm font-medium transition-colors ${
                mode === 'select'
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setMode('select')}
            >
              <MousePointer className="size-4" />
              Select
            </button>
          </div>
        </div>

        {/* Center: lot tabs */}
        <div className="flex flex-1 items-center justify-center">
          {!isLoading && (
            <LotTabs
              lots={lots}
              selectedId={activeLotId}
              onSelect={(id) => {
                setSelectedLotId(id)
                setSelectedSpotId(null)
                setPendingRect(null)
              }}
            />
          )}
        </div>

        {/* Right: mapped count */}
        <div className="text-muted-foreground text-xs">
          {mappedSpots.length}/{lotSpots.length} mapped
        </div>
      </div>

      {isLoading && (
        <div
          className="bg-muted animate-pulse rounded-lg border"
          style={{ aspectRatio: '13/10' }}
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
            onMouseLeave={() => {
              setDragStart(null)
              setDragCurrent(null)
            }}
            onSpotClick={handleSpotClick}
          />

          {/* Sidebar */}
          <div className="w-64 shrink-0 space-y-3">
            {/* Stats */}
            <div className="bg-card rounded-lg border p-3">
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                {activeLot.name}
              </p>
              <p className="text-2xl font-bold">{mappedSpots.length}</p>
              <p className="text-muted-foreground text-xs">
                of {lotSpots.length} spots mapped
              </p>
            </div>

            {/* Pending panel */}
            {pendingRect && (
              <PendingPanel
                pending={pendingRect}
                unmappedSpots={unmappedSpots}
                imgW={imgW}
                imgH={imgH}
                onSaveToSpot={handleSaveToSpot}
                onCreateSpot={handleCreateSpot}
                onDiscard={() => setPendingRect(null)}
                onPendingChange={(patch) =>
                  setPendingRect((p) => (p ? { ...p, ...patch } : p))
                }
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
                onAutoSave={(relCoords) =>
                  scheduleAutoSave(selectedSpot.id, relCoords)
                }
                onCoordsChange={setSelectedSpotLiveCoords}
                onRemove={handleRemoveCoords}
                saveStatus={saveStatus}
              />
            )}

            {/* Empty state */}
            {!pendingRect && !selectedSpot && (
              <div className="bg-card text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
                {mode === 'draw'
                  ? 'Click and drag to place a spot'
                  : 'Click a spot to edit'}
              </div>
            )}

            {/* Instructions */}
            <div className="text-muted-foreground space-y-1 rounded-lg border p-3 text-xs">
              <p className="text-foreground font-medium">How to use</p>
              <p>
                1. <strong>Draw</strong> — drag to place a rectangle
              </p>
              <p>2. Assign to an existing spot or create a new one</p>
              <p>
                3. <strong>Select</strong> — click to edit; changes auto-save
              </p>
              <p>4. Use Reset to revert or Delete to remove coordinates</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
