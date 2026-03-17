import type { LabelPosition, SpotCoordinates } from '@/types'

// — constants —

export const MIN_RECT_SIZE = 5
export const AUTOSAVE_DEBOUNCE_MS = 5_000
export const SAVE_FEEDBACK_DURATION_MS = 2_000
export const LABEL_FONT_SCALE = 0.45
export const LABEL_POSITIONS: LabelPosition[] = [
  'top',
  'bottom',
  'left',
  'right',
]
export const LABEL_ROTATIONS = [0, 90, 180, 270]

// — helpers —

// Coordinates in DB are stored as relative values (0–1), normalized by the
// lot's image_width / image_height.  The SVG editor works internally in
// "viewBox space" (0..imgW × 0..imgH).  Conversion happens only at the
// save/load boundary.

export function toRelative(
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

export function toViewBox(
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
export function ensureViewBox(
  c: SpotCoordinates,
  imgW: number,
  imgH: number,
): SpotCoordinates {
  const isAbsolute = c.x > 1 || c.y > 1 || c.width > 1 || c.height > 1
  return isAbsolute ? c : toViewBox(c, imgW, imgH)
}

export function getSvgPoint(
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

export function normalizeRect(
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
export function labelTextPos(coords: SpotCoordinates): {
  x: number
  y: number
  anchor: 'middle' | 'start' | 'end'
} {
  const { x, y, width, height, labelPosition } = coords
  const cx = x + width / 2
  const cy = y + height / 2
  const fs = Math.max(10, Math.min(22, height * LABEL_FONT_SCALE))
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
