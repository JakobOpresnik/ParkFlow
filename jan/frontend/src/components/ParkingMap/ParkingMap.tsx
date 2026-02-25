import { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import type { ParkingLot, Spot, SpotCoordinates } from '@/types'

const STATUS_FILL: Record<string, string> = {
  free: 'rgba(34,197,94,0.45)',
  occupied: 'rgba(239,68,68,0.45)',
  reserved: 'rgba(234,179,8,0.45)',
}

const STATUS_STROKE: Record<string, string> = {
  free: 'rgba(34,197,94,0.9)',
  occupied: 'rgba(239,68,68,0.9)',
  reserved: 'rgba(234,179,8,0.9)',
}

function textPosition(coords: SpotCoordinates): {
  x: number
  y: number
  anchor: 'middle' | 'start' | 'end'
} {
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

export interface ParkingMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
}

interface ParkingMapProps {
  lot: ParkingLot
  spots: Spot[]
  selectedSpotId: string | null
  highlightedSpotId: string | null
  onSpotClick: (spot: Spot) => void
  invertFloorPlan?: boolean
}

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
    const containerRef = useRef<HTMLDivElement>(null)
    // Combined view state — single setter prevents double-render and satisfies
    // the react-hooks/set-state-in-effect rule in the lot-change effect below.
    const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } })

    // Synchronous zoom mirror — avoids stale closure in the pan updater.
    const zoomRef = useRef(1)

    // Pointer tracking
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map())
    const lastPinchDistRef = useRef<number | null>(null)
    const isDraggingRef = useRef(false)
    const wasDraggingRef = useRef(false)

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
      setView((prev) => ({
        zoom: nextZoom,
        pan: {
          x: zoomPoint.x - ratio * (zoomPoint.x - prev.pan.x),
          y: zoomPoint.y - ratio * (zoomPoint.y - prev.pan.y),
        },
      }))
    }

    function containerCenter(): { x: number; y: number } {
      const rect = containerRef.current?.getBoundingClientRect()
      return rect
        ? { x: rect.width / 2, y: rect.height / 2 }
        : { x: 0, y: 0 }
    }

    useImperativeHandle(ref, () => ({
      zoomIn: () => applyZoom(1.1, containerCenter()),
      zoomOut: () => applyZoom(1 / 1.1, containerCenter()),
      resetZoom: () => {
        zoomRef.current = 1
        setView({ zoom: 1, pan: { x: 0, y: 0 } })
      },
    }))

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
          setView((prev) => ({
            ...prev,
            pan: { x: prev.pan.x + dx, y: prev.pan.y + dy },
          }))
        }
      } else if (entries.length === 2) {
        const other = entries.find(([id]) => id !== e.pointerId)
        if (!other) return
        const [, otherPos] = other
        const newDist = Math.hypot(
          e.clientX - otherPos.x,
          e.clientY - otherPos.y,
        )
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

    const vb = `0 0 ${lot.image_width} ${lot.image_height}`
    const imageSrc = `/${lot.image_filename}`

    const spotsWithCoords = spots.filter(
      (s): s is Spot & { coordinates: SpotCoordinates } =>
        s.coordinates !== null && typeof s.coordinates.x === 'number',
    )

    // Resolve DB coords to viewBox space.
    // New format: relative (0–1), stored as relX = absX / lot.image_width.
    // Old format (back-compat): absolute viewBox pixels — detected by any value > 1.
    function resolveCoords(c: SpotCoordinates): SpotCoordinates {
      const isAbsolute = c.x > 1 || c.y > 1 || c.width > 1 || c.height > 1
      if (isAbsolute) return c
      return {
        ...c,
        x: c.x * lot.image_width,
        y: c.y * lot.image_height,
        width: c.width * lot.image_width,
        height: c.height * lot.image_height,
      }
    }

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
           * key={imageSrc} forces a fresh DOM <img> element when the lot
           * changes, preventing the onError opacity:0 mutation from persisting
           * across lot switches.
           */}
          <img
            key={imageSrc}
            src={imageSrc}
            alt={`${lot.name} floor plan`}
            className="absolute inset-0 h-full w-full object-contain"
            draggable={false}
            style={invertFloorPlan ? { filter: 'invert(1)' } : undefined}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.opacity = '0'
            }}
          />

          <svg
            viewBox={vb}
            className="absolute inset-0 h-full w-full"
            aria-label={`${lot.name} parking map`}
            style={{ pointerEvents: 'none' }}
          >
            {spotsWithCoords.map((spot) => {
              const coords = resolveCoords(spot.coordinates)
              const { x, y, width, height, rotation } = coords
              const cx = x + width / 2
              const cy = y + height / 2
              const isSelected = spot.id === selectedSpotId
              const isHighlighted = spot.id === highlightedSpotId
              const fill = STATUS_FILL[spot.status] ?? 'rgba(100,100,100,0.3)'
              const stroke =
                STATUS_STROKE[spot.status] ?? 'rgba(100,100,100,0.7)'
              const tp = textPosition(coords)
              const fontSize = Math.max(10, Math.min(22, height * 0.45))
              const labelRot = coords.labelRotation ?? 0

              return (
                <g
                  key={spot.id}
                  transform={`rotate(${rotation}, ${cx}, ${cy})`}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={() => {
                    if (!wasDraggingRef.current) onSpotClick(spot)
                  }}
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
                    stroke={
                      isSelected ? '#6366f1' : isHighlighted ? 'white' : stroke
                    }
                    strokeWidth={isSelected || isHighlighted ? 3 : 1.5}
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
                    fill="white"
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={3}
                    paintOrder="stroke"
                    transform={
                      labelRot
                        ? `rotate(${labelRot}, ${tp.x}, ${tp.y})`
                        : undefined
                    }
                  >
                    {spot.number}
                  </text>
                  {spot.owner_vehicle_plate && (
                    <text
                      x={cx}
                      y={cy + fontSize * 0.9}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="pointer-events-none select-none"
                      fontSize={Math.max(8, fontSize * 0.6)}
                      fill="white"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth={2}
                      paintOrder="stroke"
                    >
                      {spot.owner_vehicle_plate}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Unmapped spots notice */}
        {spotsWithCoords.length < spots.length && (
          <div className="absolute right-3 bottom-16 rounded px-2 py-1 text-xs text-amber-300 backdrop-blur-sm">
            {spots.length - spotsWithCoords.length} spot(s) unmapped
          </div>
        )}
      </div>
    )
  },
)
