import type { LotTabsProps } from './types'

// — sub-components —

export function LotTabs({ lots, selectedId, onSelect }: LotTabsProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {lots.map((lot) => (
        <button
          key={lot.id}
          onClick={() => onSelect(lot.id)}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            selectedId === lot.id
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {lot.name}
        </button>
      ))}
    </div>
  )
}
