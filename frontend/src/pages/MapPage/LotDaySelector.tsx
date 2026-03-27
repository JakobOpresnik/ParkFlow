import { CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { ParkingLot, Spot } from '@/types'

import { DayDropdown } from './DayDropdown'
import { getTheme } from './lotDaySelectorTheme'
import { formatDayLabel, getTodayDotClass, StatusDotClass } from './utils'

// — types —

interface LotStatusDotProps {
  readonly lot: ParkingLot
  readonly allSpots: Spot[]
  readonly activeLot: ParkingLot | null
}

interface LotDaySelectorProps {
  readonly lots: ParkingLot[]
  readonly allSpots: Spot[]
  readonly isLoading: boolean
  readonly activeLot: ParkingLot | null
  readonly selectedDate: string
  readonly weekDays: string[]
  readonly today: string
  readonly isMapMode: boolean
  readonly keyNavRow: number
  readonly onLotSelect: (lot: ParkingLot) => void
  readonly onDateSelect: (date: string) => void
}

// — sub-components —

function LotStatusDot({ lot, allSpots, activeLot }: LotStatusDotProps) {
  const { t } = useTranslation()
  const lotSpots = allSpots.filter((s) => s.lot_id === lot.id)
  const free = lotSpots.filter((s) => s.status === 'free').length
  if (lotSpots.length === 0) return null
  return (
    <span
      className={`ml-3 size-1.5 cursor-pointer rounded-full ${
        free === 0 ? StatusDotClass['occupied'] : StatusDotClass['free']
      } ${activeLot?.id === lot.id ? 'opacity-100' : 'opacity-70'}`}
      title={
        free === 0 ? t('map.noFreeSpots') : t('map.freeCount', { count: free })
      }
    />
  )
}

// — helpers —

function lotButtonClass(
  theme: ReturnType<typeof getTheme>,
  isActive: boolean,
): string {
  return `flex min-h-6 items-center justify-center rounded-lg px-1.5 py-0.5 text-[9px] font-medium transition-colors sm:min-h-7 sm:px-2 sm:text-[10px] md:min-h-9 md:px-3 md:py-1 md:text-xs ${
    isActive ? theme.lotActive : theme.lotInactive
  }`
}

// — main component —

export function LotDaySelector({
  lots,
  allSpots,
  isLoading,
  activeLot,
  selectedDate,
  weekDays,
  today,
  isMapMode,
  keyNavRow,
  onLotSelect,
  onDateSelect,
}: LotDaySelectorProps) {
  const { t, i18n } = useTranslation()
  const theme = getTheme(isMapMode)

  return (
    <div className="absolute top-3 left-3 z-20 max-w-[calc(100%-88px)] sm:max-w-[calc(100%-216px)]">
      <div className={`flex flex-col gap-1 rounded-xl p-1.5 ${theme.container}`}>
        {/* Row 1: lot tabs */}
        <div
          className={`flex flex-col gap-1 rounded-lg transition-shadow ${
            keyNavRow === 0 ? theme.keyNavRing : ''
          }`}
        >
          {isLoading ? (
            <>
              <div
                className={`h-7 w-full animate-pulse rounded-lg sm:h-9 ${theme.skeletonBg}`}
              />
              <div className="flex gap-1">
                <div
                  className={`h-7 flex-1 animate-pulse rounded-lg sm:h-9 ${theme.skeletonBg}`}
                />
                <div
                  className={`h-7 flex-1 animate-pulse rounded-lg sm:h-9 ${theme.skeletonBg}`}
                />
              </div>
            </>
          ) : (
            <>
              {lots[0] && (
                <button
                  onClick={() => onLotSelect(lots[0]!)}
                  className={`w-full ${lotButtonClass(theme, activeLot?.id === lots[0].id)}`}
                >
                  {lots[0].name}
                  <LotStatusDot
                    lot={lots[0]}
                    allSpots={allSpots}
                    activeLot={activeLot}
                  />
                </button>
              )}
              {lots.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {lots.slice(1).map((lot) => (
                    <button
                      key={lot.id}
                      onClick={() => onLotSelect(lot)}
                      className={`min-w-9 flex-1 ${lotButtonClass(theme, activeLot?.id === lot.id)}`}
                    >
                      {lot.name}
                      <LotStatusDot
                        lot={lot}
                        allSpots={allSpots}
                        activeLot={activeLot}
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Divider */}
        <div className={`-mx-0.5 h-px ${theme.divider}`} />

        {/* Row 2: day selection */}
        <div
          className={`rounded-lg transition-shadow ${
            keyNavRow === 1 ? theme.keyNavRing : ''
          }`}
        >
          {/* Mobile: compact dropdown */}
          <div className="sm:hidden">
            <DayDropdown
              weekDays={weekDays}
              selectedDate={selectedDate}
              today={today}
              isMapMode={isMapMode}
              onDateSelect={onDateSelect}
            />
          </div>

          {/* sm+: full day strip */}
          <div className="hidden gap-0.5 sm:flex">
            {weekDays.map((date) => {
              const { short, num } = formatDayLabel(date, i18n.language)
              const isToday = date === today
              const isSelected = date === selectedDate
              return (
                <button
                  key={date}
                  onClick={() => onDateSelect(date)}
                  title={date}
                  className={`flex flex-1 flex-col items-center rounded-lg px-2 py-1.5 transition-colors ${
                    isSelected ? theme.daySelected : theme.dayUnselected
                  }`}
                >
                  <span className="text-[10px] leading-none font-medium tracking-wide uppercase">
                    {short}
                  </span>
                  <span className="mt-0.5 text-sm leading-none font-bold tabular-nums">
                    {num}
                  </span>
                  <span
                    className={`mt-1 size-1 rounded-full transition-colors ${getTodayDotClass(isToday, isSelected, isMapMode)}`}
                  />
                </button>
              )
            })}
          </div>
        </div>

        {/* Row 3: projection note */}
        {selectedDate !== today && (
          <div
            className={`flex items-center gap-1.5 px-1 text-[10px] ${theme.projectionNote}`}
          >
            <CalendarDays className="size-3 shrink-0" />
            {selectedDate < today ? t('map.historical') : t('map.projected')}
          </div>
        )}
      </div>
    </div>
  )
}
