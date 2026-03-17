import { MousePointer, Pencil } from 'lucide-react'

import type { ParkingLot } from '@/types'

import { LotTabs } from './LotTabs'
import type { Mode } from './types'

// — types —

interface EditorToolbarProps {
  readonly mode: Mode
  readonly onDrawMode: () => void
  readonly onSelectMode: () => void
  readonly isLoading: boolean
  readonly lots: ParkingLot[]
  readonly activeLotId: string | null
  readonly onLotSelect: (id: string) => void
  readonly mappedCount: number
  readonly totalCount: number
}

// — main component —

export function EditorToolbar({
  mode,
  onDrawMode,
  onSelectMode,
  isLoading,
  lots,
  activeLotId,
  onLotSelect,
  mappedCount,
  totalCount,
}: EditorToolbarProps) {
  return (
    <div className="bg-card flex items-center gap-3 rounded-lg border p-3">
      {/* Mode toggle */}
      <div className="flex items-center">
        <div className="flex rounded-md border">
          <button
            className={`flex cursor-pointer items-center gap-1.5 rounded-l-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'draw'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={onDrawMode}
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
            onClick={onSelectMode}
          >
            <MousePointer className="size-4" />
            Select
          </button>
        </div>
      </div>

      {/* Lot tabs */}
      <div className="flex flex-1 items-center justify-center">
        {!isLoading && (
          <LotTabs
            lots={lots}
            selectedId={activeLotId}
            onSelect={onLotSelect}
          />
        )}
      </div>

      {/* Mapped count */}
      <div className="text-muted-foreground text-xs">
        {mappedCount}/{totalCount} mapped
      </div>
    </div>
  )
}
