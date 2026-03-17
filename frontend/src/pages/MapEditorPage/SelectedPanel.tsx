import { Select } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useOwners } from '@/hooks/useOwners'
import { useAssignOwner } from '@/hooks/useSpots'
import type { SpotCoordinates } from '@/types'

import { CoordControls } from './CoordControls'
import { SaveIndicator } from './SaveIndicator'
import type { SelectedPanelProps } from './types'
import { ensureViewBox, toRelative } from './utils'

// — sub-components —

export function SelectedPanel({
  spot,
  imgW,
  imgH,
  onAutoSave,
  onCoordsChange,
  onRemove,
  saveStatus,
}: SelectedPanelProps) {
  // Internal state in viewBox space for human-readable display and SVG editing
  const [coords, setCoords] = useState<SpotCoordinates>(() =>
    ensureViewBox(spot.coordinates, imgW, imgH),
  )

  const { data: owners = [] } = useOwners()
  const assignOwner = useAssignOwner()

  function handleChange(patch: Partial<SpotCoordinates>) {
    const next = { ...coords, ...patch }
    setCoords(next)
    onCoordsChange(next)
    onAutoSave(toRelative(next, imgW, imgH))
  }

  function handleReset() {
    const reset = ensureViewBox(spot.coordinates, imgW, imgH)
    setCoords(reset)
    onCoordsChange(reset)
  }

  // Arrow key nudge — skip when the user is typing in an input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return
      const step = e.shiftKey ? 5 : 1
      const delta: Partial<SpotCoordinates> = {}
      if (e.key === 'ArrowLeft') delta.x = coords.x - step
      else if (e.key === 'ArrowRight') delta.x = coords.x + step
      else if (e.key === 'ArrowUp') delta.y = coords.y - step
      else if (e.key === 'ArrowDown') delta.y = coords.y + step
      else return
      e.preventDefault()
      const next = { ...coords, ...delta }
      setCoords(next)
      onCoordsChange(next)
      onAutoSave(toRelative(next, imgW, imgH))
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [coords, imgW, imgH, onAutoSave, onCoordsChange])

  function handleOwnerChange(ownerId: string | null) {
    assignOwner.mutate(
      { id: spot.id, owner_id: ownerId },
      {
        onSuccess: () =>
          notifications.show({ message: 'Owner updated', color: 'green' }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to update owner',
            color: 'red',
          }),
      },
    )
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

      {/* Owner */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Owner
        </p>
        <Select
          value={spot.owner_id}
          onChange={handleOwnerChange}
          data={owners.map((o) => ({ value: o.id, label: o.name }))}
          placeholder="No owner"
          size="sm"
          clearable
          disabled={assignOwner.isPending}
          w="100%"
        />
      </div>

      {/* Position & size inputs (viewBox coords, auto-saved on change) */}
      <div className="space-y-1.5">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Position &amp; size
        </p>
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
              <span className="text-muted-foreground w-3 shrink-0">
                {label}
              </span>
              <input
                type="number"
                value={Math.round(coords[key])}
                onChange={(e) => {
                  const val = Number.parseInt(e.target.value, 10)
                  if (!Number.isNaN(val)) handleChange({ [key]: val })
                }}
                className="border-input bg-background w-full rounded border px-1.5 py-0.5 text-xs"
              />
            </label>
          ))}
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
