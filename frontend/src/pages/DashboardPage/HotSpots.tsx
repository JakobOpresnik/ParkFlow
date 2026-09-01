import { Flame } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useLotName } from '@/hooks/useLotName'
import type { Spot, SpotChange } from '@/types'

interface HotSpotsProps {
  readonly changes: readonly SpotChange[]
  readonly spots: readonly Spot[]
  readonly isLoading: boolean
}

interface HotSpot {
  readonly spotId: string
  readonly label: string
  readonly lotName: string | null
  readonly churn: number
  readonly currentStatus: Spot['status'] | null
}

const TOP_N = 5

function rankHotSpots(
  changes: readonly SpotChange[],
  spots: readonly Spot[],
): HotSpot[] {
  const spotById = new Map(spots.map((s) => [s.id, s]))
  const counts = new Map<
    string,
    { churn: number; label: string; lotName: string | null }
  >()

  for (const c of changes) {
    const prev = counts.get(c.spot_id)
    if (prev) {
      prev.churn += 1
    } else {
      counts.set(c.spot_id, {
        churn: 1,
        label: c.spot_label ?? `#${c.spot_number}`,
        lotName: c.lot_name,
      })
    }
  }

  return [...counts.entries()]
    .map(([spotId, v]) => ({
      spotId,
      label: v.label,
      lotName: v.lotName,
      churn: v.churn,
      currentStatus: spotById.get(spotId)?.status ?? null,
    }))
    .sort((a, b) => b.churn - a.churn)
    .slice(0, TOP_N)
}

export function HotSpots({ changes, spots, isLoading }: HotSpotsProps) {
  const { t } = useTranslation()
  const tLot = useLotName()
  const top = useMemo(() => rankHotSpots(changes, spots), [changes, spots])

  return (
    <div className="bg-card rounded-xl border shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Flame className="size-4 text-orange-500" />
        <h2 className="text-sm font-semibold">{t('dashboard.hotSpots')}</h2>
        <span className="text-muted-foreground ml-auto text-[11px]">
          {t('dashboard.hotSpotsSub')}
        </span>
      </div>
      <div className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-muted h-9 animate-pulse rounded-md" />
            ))}
          </div>
        ) : top.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            {t('dashboard.hotSpotsEmpty')}
          </p>
        ) : (
          <ol className="space-y-2">
            {top.map((s, i) => (
              <li
                key={s.spotId}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-muted-foreground w-4 text-xs font-semibold tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.label}</p>
                    {s.lotName && (
                      <p className="text-muted-foreground truncate text-[11px]">
                        {tLot(s.lotName)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.currentStatus && (
                    <span
                      className="size-2 rounded-full"
                      style={{
                        background: `var(--color-spot-${
                          s.currentStatus === 'reserved'
                            ? 'occupied'
                            : s.currentStatus
                        })`,
                      }}
                      title={s.currentStatus}
                    />
                  )}
                  <span className="bg-muted rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums">
                    {t('dashboard.changesCount', { n: s.churn })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
