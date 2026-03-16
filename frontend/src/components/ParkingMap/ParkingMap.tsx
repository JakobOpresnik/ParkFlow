import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

import { useAuthStore } from '@/store/authStore'
import type { ParkingLot, Spot, SpotCoordinates, SpotStatus } from '@/types'

// — types —

interface StatusConfigDetails {
  fill: string
  stroke: string
}

interface PanZoomViewState {
  zoom: number
  pan: { x: number; y: number }
}

interface TextPosition {
  x: number
  y: number
  anchor: 'middle' | 'start' | 'end'
}

export interface ParkingMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

interface ParkingMapProps {
  readonly lot: ParkingLot
  readonly spots: Spot[]
  readonly selectedSpotId: string | null
  readonly highlightedSpotId: string | null
  readonly onSpotClick: (spot: Spot) => void
  readonly invertFloorPlan?: boolean
}

interface SpotOverlayProps {
  readonly spot: Spot & { coordinates: SpotCoordinates }
  readonly imageWidth: number
  readonly imageHeight: number
  readonly isSelected: boolean
  readonly isHighlighted: boolean
  readonly onClick: () => void
}

interface SpotTypeIndicatorProps {
  readonly x: number
  readonly y: number
  readonly fontSize: number
  readonly type: 'ev' | 'handicap'
}

// — constants —

const STATUS_CONFIG: Record<SpotStatus, StatusConfigDetails> = {
  free: { fill: 'rgba(34,197,94,0.45)', stroke: 'rgba(34,197,94,0.9)' },
  occupied: { fill: 'rgba(239,68,68,0.45)', stroke: 'rgba(239,68,68,0.9)' },
  reserved: { fill: 'rgba(234,179,8,0.45)', stroke: 'rgba(234,179,8,0.9)' },
}

// — helpers —

function textPosition(coords: SpotCoordinates): TextPosition {
  const { x, y, width, height, labelPosition } = coords
  const cx = x + width / 2
  const cy = y + height / 2
  const fontSize = Math.max(10, Math.min(22, height * 0.45))
  switch (labelPosition) {
    case 'top':
      return { x: cx, y: y + fontSize, anchor: 'middle' }
    case 'bottom':
      return { x: cx, y: y + height - 4, anchor: 'middle' }
    case 'left':
      return { x: x + 4, y: cy, anchor: 'start' }
    case 'right':
      return { x: x + width - 4, y: cy, anchor: 'end' }
  }
}

function resolveCoords(
  c: SpotCoordinates,
  imageWidth: number,
  imageHeight: number,
): SpotCoordinates {
  // New format: relative (0–1), stored as relX = absX / lot.image_width.
  // Old format (back-compat): absolute viewBox pixels — detected by any value > 1.
  const isAbsolute = c.x > 1 || c.y > 1 || c.width > 1 || c.height > 1
  if (isAbsolute) return c
  return {
    ...c,
    x: c.x * imageWidth,
    y: c.y * imageHeight,
    width: c.width * imageWidth,
    height: c.height * imageHeight,
  }
}

// — hooks —

function usePanZoom() {
  const containerRef = useRef<HTMLDivElement>(null)
  // Combined view state — single setter prevents double-render and satisfies
  // the react-hooks/set-state-in-effect rule in the lot-change effect below.
  const [view, setView] = useState<PanZoomViewState>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  })

  // Synchronous zoom mirror — avoids stale closure in the pan updater.
  const zoomRef = useRef<number>(1)

  // Pointer tracking
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
  const lastPinchDistRef = useRef<number | null>(null)
  const isDraggingRef = useRef<boolean>(false)
  const wasDraggingRef = useRef<boolean>(false)

  /**
   * Apply a zoom step anchored at a specific point in container-local px.
   * Uses zoomRef so the pan updater sees the correct current scale.
   */
  function applyZoom(factor: number, zoomPoint: { x: number; y: number }) {
    const prevZoom = zoomRef.current
    const nextZoom = Math.min(4, Math.max(0.5, prevZoom * factor))

    if (nextZoom === prevZoom) return

    const ratio = nextZoom / prevZoom
    zoomRef.current = nextZoom
    setView((prev: PanZoomViewState) => ({
      zoom: nextZoom,
      pan: {
        x: zoomPoint.x - ratio * (zoomPoint.x - prev.pan.x),
        y: zoomPoint.y - ratio * (zoomPoint.y - prev.pan.y),
      },
    }))
  }

  function containerCenter() {
    const rect = containerRef.current?.getBoundingClientRect()
    return rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    applyZoom(e.deltaY < 0 ? 1.05 : 1 / 1.05, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  function handlePointerDown(e: React.PointerEvent) {
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointersRef.current.size === 1) {
      isDraggingRef.current = false
    }
    lastPinchDistRef.current = null
  }

  function handlePointerMove(e: React.PointerEvent) {
    const prev = pointersRef.current.get(e.pointerId)
    if (!prev) return
    const entries = [...pointersRef.current.entries()]

    if (entries.length === 1) {
      const dx = e.clientX - prev.x
      const dy = e.clientY - prev.y
      if (!isDraggingRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
        isDraggingRef.current = true
        wasDraggingRef.current = true
      }
      if (isDraggingRef.current) {
        setView((prev: PanZoomViewState) => ({
          ...prev,
          pan: { x: prev.pan.x + dx, y: prev.pan.y + dy },
        }))
      }
    } else if (entries.length === 2) {
      const other = entries.find(([id]) => id !== e.pointerId)
      if (!other) return
      const [, otherPos] = other
      const newDist = Math.hypot(e.clientX - otherPos.x, e.clientY - otherPos.y)
      if (lastPinchDistRef.current && lastPinchDistRef.current > 0) {
        const rawFactor = newDist / lastPinchDistRef.current
        // Attenuate pinch sensitivity by ~50%
        const factor = 1 + (rawFactor - 1) * 0.5
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          applyZoom(factor, {
            x: (e.clientX + otherPos.x) / 2 - rect.left,
            y: (e.clientY + otherPos.y) / 2 - rect.top,
          })
        }
      }
      lastPinchDistRef.current = newDist
      isDraggingRef.current = true
      wasDraggingRef.current = true
    }

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function handlePointerUp(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId)
    if (pointersRef.current.size === 0) {
      isDraggingRef.current = false
      lastPinchDistRef.current = null
      // Reset drag flag after click events have fired
      setTimeout(() => {
        wasDraggingRef.current = false
      }, 50)
    }
  }

  return {
    containerRef,
    view,
    wasDraggingRef,
    zoomIn: () => applyZoom(1.1, containerCenter()),
    zoomOut: () => applyZoom(1 / 1.1, containerCenter()),
    resetZoom: () => {
      zoomRef.current = 1
      setView({ zoom: 1, pan: { x: 0, y: 0 } })
    },
    handleWheel,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}

// — sub-components —

function SpotTypeIndicator({ x, y, fontSize, type }: SpotTypeIndicatorProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
      className="pointer-events-none select-none"
      fontSize={Math.max(8, fontSize * 0.7)}
      fill={type === 'ev' ? '#facc15' : '#60a5fa'}
      stroke="rgba(0,0,0,0.5)"
      strokeWidth={2}
      paintOrder="stroke"
    >
      {type === 'ev' ? '⚡' : '♿'}
    </text>
  )
}

function SpotOverlay({
  spot,
  imageWidth,
  imageHeight,
  isSelected,
  isHighlighted,
  onClick,
}: SpotOverlayProps) {
  const currentUsername = useAuthStore((s) => s.user?.username)
  const coords = resolveCoords(spot.coordinates, imageWidth, imageHeight)
  const { x, y, width, height, rotation } = coords
  const cx = x + width / 2
  const cy = y + height / 2

  const isMySpot = !!currentUsername && spot.owner_user_id === currentUsername
  const displayStatus: SpotStatus =
    isMySpot && spot.status === 'occupied' ? 'reserved' : spot.status

  const config = STATUS_CONFIG[displayStatus]
  const fill = config?.fill ?? 'rgba(100,100,100,0.3)'
  const stroke = isMySpot
    ? 'rgba(99,102,241,0.95)'
    : (config?.stroke ?? 'rgba(100,100,100,0.7)')

  const tp = textPosition(coords)
  const fontSize = Math.max(10, Math.min(22, height * 0.45))
  const labelRot = coords.labelRotation ?? 0

  return (
    <g
      transform={`rotate(${rotation}, ${cx}, ${cy})`}
      style={{ pointerEvents: 'all', cursor: 'pointer' }}
      onClick={onClick}
      aria-label={`Spot ${spot.number} — ${spot.status}`}
    >
      {isHighlighted && (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke="white"
          strokeWidth={8}
          className="spot-highlight-ring pointer-events-none"
        />
      )}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke={isSelected ? '#6366f1' : isHighlighted ? '#FFF' : stroke}
        strokeWidth={isSelected || isHighlighted ? 3 : isMySpot ? 2.5 : 1.5}
        className="transition-all duration-150 hover:brightness-110"
      />
      <text
        x={tp.x}
        y={tp.y}
        textAnchor={tp.anchor}
        dominantBaseline="middle"
        className="pointer-events-none select-none"
        fontSize={fontSize}
        fontWeight={700}
        fill="#FFF"
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={3}
        paintOrder="stroke"
        transform={
          labelRot ? `rotate(${labelRot}, ${tp.x}, ${tp.y})` : undefined
        }
      >
        {spot.number}
      </text>
      {(spot.type === 'ev' || spot.type === 'handicap') && (
        <SpotTypeIndicator
          x={x + width - fontSize * 0.4}
          y={y + fontSize * 0.7}
          fontSize={fontSize}
          type={spot.type}
        />
      )}
      {spot.owner_vehicle_plate && (
        <text
          x={cx}
          y={cy + fontSize * 0.9}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none select-none"
          fontSize={Math.max(8, fontSize * 0.6)}
          fill="#FFF"
          stroke="rgba(0,0,0,0.5)"
          strokeWidth={2}
          paintOrder="stroke"
        >
          {spot.owner_vehicle_plate}
        </text>
      )}
    </g>
  )
}

// — main component —

export const ParkingMap = forwardRef<ParkingMapHandle, ParkingMapProps>(
  function ParkingMap(
    {
      lot,
      spots,
      selectedSpotId,
      highlightedSpotId,
      onSpotClick,
      invertFloorPlan,
    },
    ref,
  ) {
    const {
      containerRef,
      view,
      wasDraggingRef,
      zoomIn,
      zoomOut,
      resetZoom,
      handleWheel,
      handlePointerDown,
      handlePointerMove,
      handlePointerUp,
    } = usePanZoom()

    useImperativeHandle(ref, () => ({ zoomIn, zoomOut, resetZoom }))

    const vb = `0 0 ${lot.image_width} ${lot.image_height}`
    const imageSrc = `/${lot.image_filename}`

    const spotsWithCoords = spots.filter(
      (s): s is Spot & { coordinates: SpotCoordinates } =>
        s.coordinates !== null && typeof s.coordinates.x === 'number',
    )

    return (
      <div
        ref={containerRef}
        className="relative h-full w-full overflow-hidden"
        style={{ touchAction: 'none' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Zoomable/pannable layer */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${view.pan.x}px, ${view.pan.y}px) scale(${view.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/*
           * Single SVG containing both the floor plan image and spot rectangles.
           * This guarantees they share the same coordinate space and remain
           * perfectly aligned on any resize — no separate <img> + overlay drift.
           */}
          <svg
            viewBox={vb}
            className="absolute inset-0 h-full w-full"
            aria-label={`${lot.name} parking map`}
            style={{ pointerEvents: 'none' }}
          >
            <image
              key={imageSrc}
              href={imageSrc}
              width={lot.image_width}
              height={lot.image_height}
              preserveAspectRatio="xMidYMid meet"
              style={invertFloorPlan ? { filter: 'invert(1)' } : undefined}
              onError={(e) => {
                ;(e.currentTarget as SVGImageElement).style.opacity = '0'
              }}
            />
            {spotsWithCoords.map((spot) => (
              <SpotOverlay
                key={spot.id}
                spot={spot}
                imageWidth={lot.image_width}
                imageHeight={lot.image_height}
                isSelected={spot.id === selectedSpotId}
                isHighlighted={spot.id === highlightedSpotId}
                onClick={() => {
                  if (!wasDraggingRef.current) onSpotClick(spot)
                }}
              />
            ))}
          </svg>
        </div>

        {/* Unmapped spots notice */}
        {spotsWithCoords.length < spots.length && (
          <div className="absolute bottom-3 left-3 rounded px-2 py-1 text-xs text-amber-300 backdrop-blur-sm">
            {spots.length - spotsWithCoords.length} spot(s) unmapped
          </div>
        )}
      </div>
    )
  },
)
