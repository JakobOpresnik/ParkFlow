import { useTranslation } from 'react-i18next'

import type { Spot } from '@/types'

// ─── types ────────────────────────────────────────────────────────────────────

interface StatCardsProps {
  readonly spots: Spot[]
}

// ─── component ────────────────────────────────────────────────────────────────

export function StatCards({ spots }: StatCardsProps) {
  const { t } = useTranslation()
  const total = spots.length
  const free = spots.filter((s) => s.status === 'free').length
  const occupied = spots.filter((s) => s.status === 'occupied').length
  const reserved = spots.filter((s) => s.status === 'reserved').length

  const cards = [
    { label: t('map.total'), value: total, dot: 'bg-muted-foreground' },
    { label: t('map.free'), value: free, dot: 'bg-spot-free' },
    { label: t('map.occupied'), value: occupied, dot: 'bg-spot-occupied' },
    { label: t('map.reserved'), value: reserved, dot: 'bg-spot-reserved' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2">
      {cards.map((s) => (
        <div
          key={s.label}
          className="bg-card flex items-center gap-2 rounded-lg border p-2.5 shadow-sm"
        >
          <span className={`${s.dot} size-2 shrink-0 rounded-full`} />
          <div>
            <p className="text-muted-foreground text-xs">{s.label}</p>
            <p className="text-base leading-none font-semibold">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
