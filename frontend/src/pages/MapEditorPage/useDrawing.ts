import type React from 'react'
import { useEffect, useState } from 'react'

import type { Mode, PendingRect } from './types'
import { getSvgPoint, MIN_RECT_SIZE, normalizeRect } from './utils'

// — types —

interface UseDrawingOptions {
  readonly svgRef: React.RefObject<SVGSVGElement | null>
  readonly mode: Mode
  readonly setMode: (mode: Mode) => void
  readonly onClearSelection: () => void
}

interface UseDrawingReturn {
  readonly dragStart: { readonly x: number; readonly y: number } | null
  readonly dragCurrent: { readonly x: number; readonly y: number } | null
  readonly pendingRect: PendingRect | null
  readonly previewRect: {
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  } | null
  readonly setPendingRect: React.Dispatch<
    React.SetStateAction<PendingRect | null>
  >
  readonly handleSvgMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void
  readonly handleSvgMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void
  readonly handleSvgMouseUp: () => void
  readonly handleMouseLeave: () => void
  readonly handleDiscard: () => void
  readonly handlePendingChange: (patch: Partial<PendingRect>) => void
}

// — hook —

export function useDrawing({
  svgRef,
  mode,
  setMode,
  onClearSelection,
}: UseDrawingOptions): UseDrawingReturn {
  const [dragStart, setDragStart] = useState<{
    x: number
    y: number
  } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{
    x: number
    y: number
  } | null>(null)
  const [pendingRect, setPendingRect] = useState<PendingRect | null>(null)

  // Arrow key nudge for pending rect
  useEffect(() => {
    if (!pendingRect) return
    function handleKeyDown(e: KeyboardEvent) {
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

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || mode !== 'draw') return
    e.preventDefault()
    const pt = getSvgPoint(svgRef.current, e)
    setDragStart(pt)
    setDragCurrent(pt)
    onClearSelection()
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

  function handleMouseLeave() {
    setDragStart(null)
    setDragCurrent(null)
  }

  function handleDiscard() {
    setPendingRect(null)
  }

  function handlePendingChange(patch: Partial<PendingRect>) {
    setPendingRect((p) => (p ? { ...p, ...patch } : p))
  }

  const previewRect =
    dragStart && dragCurrent && mode === 'draw'
      ? normalizeRect(dragStart.x, dragStart.y, dragCurrent.x, dragCurrent.y)
      : null

  return {
    dragStart,
    dragCurrent,
    pendingRect,
    previewRect,
    setPendingRect,
    handleSvgMouseDown,
    handleSvgMouseMove,
    handleSvgMouseUp,
    handleMouseLeave,
    handleDiscard,
    handlePendingChange,
  }
}
