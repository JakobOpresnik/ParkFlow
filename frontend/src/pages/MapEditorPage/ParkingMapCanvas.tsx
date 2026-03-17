import { useState } from 'react'

import type { ParkingMapCanvasProps } from './types'
import { ensureViewBox, LABEL_FONT_SCALE, labelTextPos } from './utils'

// — sub-components —

export function ParkingMapCanvas({
  svgRef,
  imgW,
  imgH,
  activeLot,
  mode,
  mappedSpots,
  selectedSpotId,
  selectedSpotLiveCoords,
  pendingRect,
  previewRect,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onSpotClick,
}: ParkingMapCanvasProps) {
  // Owned internally so it resets naturally when this component remounts (key changes)
  const [hasImageError, setHasImageError] = useState(false)
  return (
    <div
      className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-white"
      style={{ aspectRatio: `${imgW}/${imgH}` }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${imgW} ${imgH}`}
        className={`h-full w-full select-none ${mode === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{ display: 'block' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {activeLot.image_filename && !hasImageError ? (
          <image
            href={`/${activeLot.image_filename}`}
            width={imgW}
            height={imgH}
            onError={() => setHasImageError(true)}
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

        {/* Mapped spots — DB coords are relative; convert to viewBox for rendering.
            If this is the currently selected spot, use the live (unsaved) coords
            so the rectangle moves immediately without waiting for the save debounce. */}
        {mappedSpots.map((spot) => {
          const vb =
            spot.id === selectedSpotId && selectedSpotLiveCoords
              ? selectedSpotLiveCoords
              : ensureViewBox(spot.coordinates, imgW, imgH)
          const { x, y, width, height, rotation, labelRotation } = vb
          const cx = x + width / 2
          const cy = y + height / 2
          const isSelected = spot.id === selectedSpotId
          const fontSize = Math.max(10, Math.min(16, height * LABEL_FONT_SCALE))
          const tp = labelTextPos(vb)
          const lr = labelRotation

          return (
            <g
              key={spot.id}
              transform={`rotate(${rotation}, ${cx}, ${cy})`}
              onClick={(e) => onSpotClick(e, spot.id)}
              className={mode === 'select' ? 'cursor-pointer' : ''}
            >
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={
                  isSelected ? 'rgba(99,102,241,0.35)' : 'rgba(59,130,246,0.25)'
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
                transform={lr ? `rotate(${lr}, ${tp.x}, ${tp.y})` : undefined}
                className="pointer-events-none"
              >
                {spot.number}
              </text>
              {isSelected &&
                (
                  [
                    { key: 'tl', hx: x, hy: y },
                    { key: 'tr', hx: x + width, hy: y },
                    { key: 'br', hx: x + width, hy: y + height },
                    { key: 'bl', hx: x, hy: y + height },
                  ] as { key: string; hx: number; hy: number }[]
                ).map(({ key, hx, hy }) => (
                  <rect
                    key={key}
                    x={hx - 4}
                    y={hy - 4}
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
                Math.min(16, pendingRect.height * LABEL_FONT_SCALE),
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
        {previewRect && previewRect.width > 1 && previewRect.height > 1 && (
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
  )
}
