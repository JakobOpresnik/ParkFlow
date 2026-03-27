import { MousePointer, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div className="bg-card space-y-2 rounded-lg border p-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0 sm:p-3">
      {/* Top row: mode toggle + mapped count */}
      <div className="flex items-center justify-between gap-2">
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
            {t('mapEditor.draw')}
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
            {t('mapEditor.select')}
          </button>
        </div>
        <div className="text-muted-foreground text-xs sm:hidden">
          {t('mapEditor.mapped', { count: mappedCount, total: totalCount })}
        </div>
      </div>

      {/* Lot tabs */}
      <div className="flex flex-1 items-center sm:justify-center">
        {!isLoading && (
          <LotTabs
            lots={lots}
            selectedId={activeLotId}
            onSelect={onLotSelect}
          />
        )}
      </div>

      {/* Mapped count — desktop only */}
      <div className="text-muted-foreground hidden text-xs sm:block">
        {t('mapEditor.mapped', { count: mappedCount, total: totalCount })}
      </div>
    </div>
  )
}
