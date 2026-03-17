import { Select } from '@mantine/core'
import { Save, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SpotCoordinates } from '@/types'

import { CoordControls } from './CoordControls'
import type { PendingPanelProps } from './types'
import { toRelative } from './utils'

// — sub-components —

export function PendingPanel({
  pending,
  unmappedSpots,
  imgW,
  imgH,
  onSaveToSpot,
  onCreateSpot,
  onDiscard,
  onPendingChange,
  isSaving,
}: PendingPanelProps) {
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

  const isSaveDisabled =
    isSaving ||
    (tab === 'assign' && (!assignId || unmappedSpots.length === 0)) ||
    (tab === 'create' && (!newNumber || newNumber < 1))

  return (
    <div className="bg-card space-y-4 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">New location</p>
        <Button
          size="icon"
          variant="ghost"
          className="size-6"
          onClick={onDiscard}
          aria-label="Discard new location"
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
                const val = Number.parseInt(e.target.value, 10)
                if (!Number.isNaN(val)) onPendingChange({ [key]: val })
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
            onChange={(e) =>
              setNewNumber(Number.parseInt(e.target.value, 10) || '')
            }
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
        disabled={isSaveDisabled}
      >
        <Save className="size-3.5" />
        {isSaving ? 'Saving…' : 'Save coordinates'}
      </Button>
    </div>
  )
}
