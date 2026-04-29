import { useTranslation } from 'react-i18next'

import type { FloorStats } from './utils'

interface FloorBreakdownProps {
  readonly floors: readonly FloorStats[]
}

export function FloorBreakdown({ floors }: FloorBreakdownProps) {
  const { t } = useTranslation()

  if (floors.length === 0) return null

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm sm:p-6">
      <p className="text-muted-foreground mb-4 text-sm font-medium">
        {t('stats.byFloor')}
      </p>
      <div className="-mx-4 overflow-x-auto sm:-mx-6">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th className="w-px px-4 pb-2 font-medium whitespace-nowrap sm:px-6">
                {t('stats.floor')}
              </th>
              <th className="px-2 pb-2 text-right font-medium tabular-nums">
                {t('stats.free')}
              </th>
              <th className="px-2 pb-2 text-right font-medium tabular-nums">
                {t('stats.occupied')}
              </th>
              <th className="px-2 pb-2 text-right font-medium tabular-nums">
                {t('stats.total')}
              </th>
              <th className="w-1/2 px-4 pb-2 font-medium sm:px-6">
                {t('stats.utilization')}
              </th>
            </tr>
          </thead>
          <tbody>
            {floors.map((f) => (
              <tr key={f.lotId} className="border-t">
                <td className="px-4 py-3 font-medium whitespace-nowrap sm:px-6">
                  {f.name}
                </td>
                <td className="px-2 py-3 text-right tabular-nums">{f.free}</td>
                <td className="px-2 py-3 text-right tabular-nums">
                  {f.occupied}
                </td>
                <td className="text-muted-foreground px-2 py-3 text-right tabular-nums">
                  {f.total}
                </td>
                <td className="px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-2">
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${f.occupancyPct}%`,
                          background: 'var(--color-spot-occupied)',
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground w-10 text-right text-xs tabular-nums">
                      {f.occupancyPct}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
