import { useCallback, useEffect, useRef, useState } from 'react'

// — types —

interface PanZoomViewState {
  zoom: number
  pan: { x: number; y: number }
}

// — hooks —

export function usePanZoom() {
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
   * Stable (useCallback) so the native wheel-listener effect below never re-runs.
   */
  const applyZoom = useCallback(
    (factor: number, zoomPoint: { x: number; y: number }) => {
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
    },
    [],
  )

  function containerCenter() {
    const rect = containerRef.current?.getBoundingClientRect()
    return rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 }
  }

  // Wheel zoom must be a NATIVE non-passive listener: browsers treat wheel
  // listeners on React's delegated root as passive, so preventDefault() from a
  // React onWheel prop is ignored (and warns) — the page would scroll while
  // zooming. Attaching directly to the container with passive: false lets us
  // actually consume the gesture.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (!el) return
      const rect = el.getBoundingClientRect()
      applyZoom(e.deltaY < 0 ? 1.05 : 1 / 1.05, {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [applyZoom])

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
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}
