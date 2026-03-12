import { Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { MousePointer, Pencil, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLots } from '@/hooks/useLots'
import { useCreateSpot, usePatchCoordinates, useSpots } from '@/hooks/useSpots'
import type { LabelPosition, ParkingLot, Spot, SpotCoordinates } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'draw' | 'select'

interface PendingRect {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  labelPosition: LabelPosition
  labelRotation: number
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────
// Coordinates in DB are stored as relative values (0–1), normalized by the
// lot's image_width / image_height.  The SVG editor works internally in
// "viewBox space" (0..imgW × 0..imgH).  Conversion happens only at the
// save/load boundary.

function toRelative(
  abs: SpotCoordinates,
  imgW: number,
  imgH: number,
): SpotCoordinates {
  return {
    ...abs,
    x: abs.x / imgW,
    y: abs.y / imgH,
    width: abs.width / imgW,
    height: abs.height / imgH,
  }
}

function toViewBox(
  rel: SpotCoordinates,
  imgW: number,
  imgH: number,
): SpotCoordinates {
  return {
    ...rel,
    x: rel.x * imgW,
    y: rel.y * imgH,
    width: rel.width * imgW,
    height: rel.height * imgH,
  }
}

/** Back-compat: old data was stored as absolute viewBox pixels (values >> 1). */
function ensureViewBox(
  c: SpotCoordinates,
  imgW: number,
  imgH: number,
): SpotCoordinates {
  const isAbsolute = c.x > 1 || c.y > 1 || c.width > 1 || c.height > 1
  return isAbsolute ? c : toViewBox(c, imgW, imgH)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSvgPoint(
  svg: SVGSVGElement,
  e: React.MouseEvent,
): { x: number; y: number } {
  const pt = svg.createSVGPoint()
  pt.x = e.clientX
  pt.y = e.clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  return pt.matrixTransform(ctm.inverse())
}

function normalizeRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  }
}

// labelTextPos works in viewBox space
function labelTextPos(coords: SpotCoordinates): {
  x: number
  y: number
  anchor: 'middle' | 'start' | 'end'
} {
  const { x, y, width, height, labelPosition } = coords
  const cx = x + width / 2
  const cy = y + height / 2
  const fs = Math.max(10, Math.min(22, height * 0.45))
  switch (labelPosition) {
    case 'top':
      return { x: cx, y: y + fs, anchor: 'middle' }
    case 'bottom':
      return { x: cx, y: y + height - 4, anchor: 'middle' }
    case 'left':
      return { x: x + 4, y: cy, anchor: 'start' }
    case 'right':
      return { x: x + width - 4, y: cy, anchor: 'end' }
  }
}

// ─── Save status indicator ────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  return (
    <span
      className={`text-xs ${status === 'saving' ? 'text-muted-foreground' : 'text-emerald-600 dark:text-emerald-400'}`}
    >
      {status === 'saving' ? 'Saving…' : '✓ Saved'}
    </span>
  )
}

// ─── Lot tabs ─────────────────────────────────────────────────────────────────

function LotTabs({
  lots,
  selectedId,
  onSelect,
}: {
  lots: ParkingLot[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {lots.map((lot) => (
        <button
          key={lot.id}
          onClick={() => onSelect(lot.id)}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selectedId === lot.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {lot.name}
        </button>
      ))}
    </div>
  )
}

// ─── Shared coord controls ────────────────────────────────────────────────────

const LABEL_POSITIONS: LabelPosition[] = ['top', 'bottom', 'left', 'right']
const LABEL_ROTATIONS = [0, 90, 180, 270]

function CoordControls<
  T extends {
    rotation: number
    labelPosition: LabelPosition
    labelRotation: number
  },
>({ value, onChange }: { value: T; onChange: (patch: Partial<T>) => void }) {
  return (
    <>
      {/* Label position */}
      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs">Label position</label>
        <div className="grid grid-cols-2 gap-1">
          {LABEL_POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => onChange({ labelPosition: pos } as Partial<T>)}
              className={`rounded border py-1 text-xs capitalize transition-colors ${
                value.labelPosition === pos
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Label rotation */}
      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs">Label rotation</label>
        <div className="flex gap-1">
          {LABEL_ROTATIONS.map((deg) => (
            <button
              key={deg}
              onClick={() => onChange({ labelRotation: deg } as Partial<T>)}
              className={`flex-1 rounded border py-1 text-xs transition-colors ${
                value.labelRotation === deg
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* Rectangle rotation */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-muted-foreground text-xs">Rect rotation</label>
          <span className="font-mono text-xs">{value.rotation}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          value={value.rotation}
          onChange={(e) =>
            onChange({ rotation: parseInt(e.target.value, 10) } as Partial<T>)
          }
          className="accent-primary w-full"
        />
        <div className="flex flex-wrap gap-1">
          {[0, 45, 90, 135, 180].map((deg) => (
            <button
              key={deg}
              onClick={() => onChange({ rotation: deg } as Partial<T>)}
              className={`rounded border px-2 py-0.5 text-xs transition-colors ${
                value.rotation === deg
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Pending panel (new rect, not yet assigned) ───────────────────────────────

function PendingPanel({
  pending,
  unmappedSpots,
  imgW,
  imgH,
  onSaveToSpot,
  onCreateSpot,
  onDiscard,
  onPendingChange,
  isSaving,
}: {
  pending: PendingRect
  unmappedSpots: Spot[]
  imgW: number
  imgH: number
  onSaveToSpot: (spotId: string, coords: SpotCoordinates) => Promise<void>
  onCreateSpot: (
    number: number,
    label: string,
    coords: SpotCoordinates,
  ) => Promise<void>
  onDiscard: () => void
  onPendingChange: (patch: Partial<PendingRect>) => void
  isSaving: boolean
}) {
  const [tab, setTab] = useState<'assign' | 'create'>('assign')
  const [assignId, setAssignId] = useState(unmappedSpots[0]?.id ?? '')
  const [newNumber, setNewNumber] = useState<number | ''>('')
  const [newLabel, setNewLabel] = useState('')

  // pending is in viewBox space; save as relative
  function buildCoords(): SpotCoordinates {
    return toRelative(
      {
        x: Math.round(pending.x),
        y: Math.round(pending.y),
        width: Math.round(pending.width),
        height: Math.round(pending.height),
        rotation: pending.rotation,
        labelPosition: pending.labelPosition,
        labelRotation: pending.labelRotation,
      },
      imgW,
      imgH,
    )
  }

  async function handleSave() {
    if (tab === 'assign') {
      if (!assignId) return
      await onSaveToSpot(assignId, buildCoords())
    } else {
      if (!newNumber || newNumber < 1) return
      await onCreateSpot(newNumber, newLabel, buildCoords())
    }
  }

  return (
    <div className="bg-card space-y-4 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">New location</p>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={onDiscard}
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Geometry inputs (viewBox coords) */}
      <div className="grid grid-cols-2 gap-1.5 font-mono text-xs">
        {(
          [
            ['x', 'x'],
            ['y', 'y'],
            ['w', 'width'],
            ['h', 'height'],
          ] as const
        ).map(([label, key]) => (
          <label key={key} className="flex items-center gap-1">
            <span className="text-muted-foreground w-3 shrink-0">{label}</span>
            <input
              type="number"
              value={Math.round(pending[key])}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val)) onPendingChange({ [key]: val })
              }}
              className="border-input bg-background w-full rounded border px-1.5 py-0.5 text-xs"
            />
          </label>
        ))}
      </div>

      <CoordControls value={pending} onChange={onPendingChange} />

      {/* Tab switcher */}
      <div className="flex rounded-md border text-xs">
        <button
          onClick={() => setTab('assign')}
          className={`flex-1 rounded-l-md px-2 py-1.5 font-medium transition-colors ${
            tab === 'assign' ? 'bg-accent' : 'text-muted-foreground'
          }`}
        >
          Assign to spot
        </button>
        <button
          onClick={() => setTab('create')}
          className={`flex-1 rounded-r-md border-l px-2 py-1.5 font-medium transition-colors ${
            tab === 'create' ? 'bg-accent' : 'text-muted-foreground'
          }`}
        >
          New spot
        </button>
      </div>

      {tab === 'assign' ? (
        <div className="space-y-2">
          {unmappedSpots.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              All spots in this lot already have coordinates.
            </p>
          ) : (
            <Select
              value={assignId}
              onChange={(v) => setAssignId(v ?? '')}
              data={unmappedSpots.map((s) => ({
                value: s.id,
                label: `#${s.number}${s.label ? ` — ${s.label}` : ''}${s.owner_name ? ` · ${s.owner_name}` : ''}`,
              }))}
              size="sm"
              allowDeselect={false}
              w="100%"
            />
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            type="number"
            min={1}
            placeholder="Spot number"
            value={newNumber}
            onChange={(e) => setNewNumber(parseInt(e.target.value, 10) || '')}
            className="h-8"
          />
          <Input
            placeholder="Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="h-8"
          />
        </div>
      )}

      <Button
        size="sm"
        className="w-full gap-1.5"
        onClick={handleSave}
        disabled={
          isSaving ||
          (tab === 'assign' && (!assignId || unmappedSpots.length === 0)) ||
          (tab === 'create' && (!newNumber || newNumber < 1))
        }
      >
        <Save className="size-3.5" />
        {isSaving ? 'Saving…' : 'Save coordinates'}
      </Button>
    </div>
  )
}

// ─── Selected panel (existing mapped spot) ────────────────────────────────────

function SelectedPanel({
  spot,
  imgW,
  imgH,
  onAutoSave,
  onRemove,
  saveStatus,
}: {
  spot: Spot & { coordinates: SpotCoordinates }
  imgW: number
  imgH: number
  // receives relative coords (0-1) ready to save to DB
  onAutoSave: (coords: SpotCoordinates) => void
  onRemove: () => void
  saveStatus: SaveStatus
}) {
  // Internal state in viewBox space for human-readable display and SVG editing
  const [coords, setCoords] = useState<SpotCoordinates>(() =>
    ensureViewBox(spot.coordinates, imgW, imgH),
  )

  function handleChange(patch: Partial<SpotCoordinates>) {
    const next = { ...coords, ...patch }
    setCoords(next)
    onAutoSave(toRelative(next, imgW, imgH))
  }

  function handleReset() {
    setCoords(ensureViewBox(spot.coordinates, imgW, imgH))
  }

  return (
    <div className="bg-card space-y-4 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Spot #{spot.number}
          {spot.label && (
            <span className="text-muted-foreground ml-1 text-xs">
              {spot.label}
            </span>
          )}
        </p>
        <SaveIndicator status={saveStatus} />
      </div>

      {/* Geometry readout (viewBox coords) */}
      <div className="bg-muted/60 text-muted-foreground rounded px-2 py-1.5 font-mono text-xs">
        <div>
          x:{Math.round(coords.x)} y:{Math.round(coords.y)}
        </div>
        <div>
          w:{Math.round(coords.width)} h:{Math.round(coords.height)}
        </div>
      </div>

      <CoordControls value={coords} onChange={handleChange} />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5"
          onClick={handleReset}
          title="Revert to last saved state"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive flex-1 gap-1.5"
          onClick={onRemove}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const [imageError, setImageError] = useState(false)

  // Arrow key nudge for pending rect
  useEffect(() => {
    if (!pendingRect) return
    function onKeyDown(e: KeyboardEvent) {
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
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingRect])

  // Auto-save
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLoading = lotsLoading || spotsLoading
  const isMutating = patchCoords.isPending || createSpot.isPending

  const activeLotId = selectedLotId ?? lots[0]?.id ?? null
  const activeLot = lots.find((l) => l.id === activeLotId) ?? null
  // Reset image error state whenever the active lot (and thus image URL) changes
  const prevLotIdRef = useRef<string | null>(null)
  if (prevLotIdRef.current !== activeLotId) {
    prevLotIdRef.current = activeLotId
    if (imageError) setImageError(false)
  }

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

  // ── Auto-save debounce — receives relative coords ──────────────

  const scheduleAutoSave = useCallback(
    (id: string, relCoords: SpotCoordinates) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      setSaveStatus('saving')
      saveTimerRef.current = setTimeout(() => {
        patchCoords.mutate(
          { id, coordinates: relCoords },
          {
            onSuccess: () => {
              setSaveStatus('saved')
              setTimeout(() => setSaveStatus('idle'), 2000)
            },
            onError: (err) => {
              setSaveStatus('idle')
              notifications.show({
                message: err instanceof Error ? err.message : 'Save failed',
                color: 'red',
              })
            },
          },
        )
      }, 500)
    },
    [patchCoords],
  )

  // ── Mouse handlers ────────────────────────────────────────────

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
    if (rect.width > 5 && rect.height > 5) {
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

  function handleSpotRectClick(e: React.MouseEvent, spotId: string) {
    if (mode !== 'select') return
    e.stopPropagation()
    setSelectedSpotId(spotId)
    setPendingRect(null)
  }

  // ── Mutations — all receive relative coords ───────────────────

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

  // ── Render ────────────────────────────────────────────────────

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

      {isLoading ? (
        <div
          className="bg-muted animate-pulse rounded-lg border"
          style={{ aspectRatio: '13/10' }}
        />
      ) : !activeLot ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">
            No lots found. Add a parking lot via the Admin page first.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          {/* SVG canvas — flex-1 so it fills remaining width */}
          <div
            className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-white"
            style={{ aspectRatio: `${imgW}/${imgH}` }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${imgW} ${imgH}`}
              className={`h-full w-full select-none ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
              style={{ display: 'block' }}
              onMouseDown={handleSvgMouseDown}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={handleSvgMouseUp}
              onMouseLeave={() => {
                setDragStart(null)
                setDragCurrent(null)
              }}
            >
              {activeLot.image_filename && !imageError ? (
                <image
                  href={`/${activeLot.image_filename}`}
                  width={imgW}
                  height={imgH}
                  onError={() => setImageError(true)}
                />
              ) : (
                <>
                  <rect width={imgW} height={imgH} fill="#f1f5f9" />
                  <text
                    x={imgW / 2}
                    y={imgH / 2 - 16}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={32}
                    fill="#94a3b8"
                    className="pointer-events-none"
                  >
                    🗺
                  </text>
                  <text
                    x={imgW / 2}
                    y={imgH / 2 + 24}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={26}
                    fill="#94a3b8"
                    className="pointer-events-none"
                  >
                    No floor plan uploaded
                  </text>
                  <text
                    x={imgW / 2}
                    y={imgH / 2 + 52}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={20}
                    fill="#cbd5e1"
                    className="pointer-events-none"
                  >
                    Upload an image via the Admin page to get started
                  </text>
                </>
              )}

              {/* Mapped spots — DB coords are relative; convert to viewBox for rendering */}
              {mappedSpots.map((spot) => {
                const vb = ensureViewBox(spot.coordinates, imgW, imgH)
                const { x, y, width, height, rotation, labelRotation } = vb
                const cx = x + width / 2
                const cy = y + height / 2
                const isSelected = spot.id === selectedSpotId
                const fontSize = Math.max(10, Math.min(16, height * 0.45))
                const tp = labelTextPos(vb)
                const lr = labelRotation ?? 0

                return (
                  <g
                    key={spot.id}
                    transform={`rotate(${rotation}, ${cx}, ${cy})`}
                    onClick={(e) => handleSpotRectClick(e, spot.id)}
                    className={mode === 'select' ? 'cursor-pointer' : ''}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      fill={
                        isSelected
                          ? 'rgba(99,102,241,0.35)'
                          : 'rgba(59,130,246,0.25)'
                      }
                      stroke={isSelected ? '#6366f1' : '#3b82f6'}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                    />
                    <text
                      x={tp.x}
                      y={tp.y}
                      textAnchor={tp.anchor}
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fontWeight={700}
                      fill="white"
                      stroke="rgba(0,0,0,0.7)"
                      strokeWidth={2.5}
                      paintOrder="stroke"
                      transform={
                        lr ? `rotate(${lr}, ${tp.x}, ${tp.y})` : undefined
                      }
                      className="pointer-events-none"
                    >
                      {spot.number}
                    </text>
                    {isSelected &&
                      [
                        [x, y],
                        [x + width, y],
                        [x + width, y + height],
                        [x, y + height],
                      ].map(([hx, hy], i) => (
                        <rect
                          key={i}
                          x={(hx ?? 0) - 4}
                          y={(hy ?? 0) - 4}
                          width={8}
                          height={8}
                          fill="white"
                          stroke="#6366f1"
                          strokeWidth={1.5}
                          className="pointer-events-none"
                        />
                      ))}
                  </g>
                )
              })}

              {/* Pending rect — already in viewBox space */}
              {pendingRect && (
                <g
                  transform={`rotate(${pendingRect.rotation}, ${pendingRect.x + pendingRect.width / 2}, ${pendingRect.y + pendingRect.height / 2})`}
                >
                  <rect
                    x={pendingRect.x}
                    y={pendingRect.y}
                    width={pendingRect.width}
                    height={pendingRect.height}
                    fill="rgba(234,179,8,0.3)"
                    stroke="#eab308"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                  />
                  <text
                    x={pendingRect.x + pendingRect.width / 2}
                    y={pendingRect.y + pendingRect.height / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(
                      10,
                      Math.min(16, pendingRect.height * 0.45),
                    )}
                    fontWeight={700}
                    fill="#92400e"
                    className="pointer-events-none"
                  >
                    ?
                  </text>
                </g>
              )}

              {/* Draw preview */}
              {previewRect &&
                previewRect.width > 1 &&
                previewRect.height > 1 && (
                  <rect
                    x={previewRect.x}
                    y={previewRect.y}
                    width={previewRect.width}
                    height={previewRect.height}
                    fill="rgba(59,130,246,0.15)"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    strokeDasharray="6 3"
                    className="pointer-events-none"
                  />
                )}
            </svg>
          </div>

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
