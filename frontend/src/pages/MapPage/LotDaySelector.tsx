import { CalendarDays, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ParkingLot, Spot } from '@/types'

import { formatDayLabel, getTodayDotClass, StatusDotClass } from './utils'

// ─── types ────────────────────────────────────────────────────────────────────

interface LotStatusDotProps {
  readonly lot: ParkingLot
  readonly allSpots: Spot[]
  readonly activeLot: ParkingLot | null
}

interface DayDropdownProps {
  readonly weekDays: string[]
  readonly selectedDate: string
  readonly today: string
  readonly isMapMode: boolean
  readonly onDateSelect: (date: string) => void
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

// ─── sub-components ───────────────────────────────────────────────────────────

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

function DayDropdown({
  weekDays,
  selectedDate,
  today,
  isMapMode,
  onDateSelect,
}: DayDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { i18n } = useTranslation()

  const selected = formatDayLabel(selectedDate, i18n.language)
  const isToday = selectedDate === today

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-7 w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
          isMapMode ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-9 tracking-wide uppercase">{selected.short}</span>
          <span className="font-bold tabular-nums">{selected.num}</span>
          {isToday && (
            <span
              className={`size-1 rounded-full ${isMapMode ? 'bg-white' : 'bg-primary'}`}
            />
          )}
        </span>
        <ChevronDown
          className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 z-30 mt-1 min-w-[110px] rounded-lg p-1 shadow-lg ${
            isMapMode
              ? 'bg-black/80 backdrop-blur-sm'
              : 'bg-card border shadow-md'
          }`}
        >
          {weekDays.map((date) => {
            const { short, num } = formatDayLabel(date, i18n.language)
            const isSelected = date === selectedDate
            const isDayToday = date === today
            return (
              <button
                key={date}
                onClick={() => {
                  onDateSelect(date)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors ${
                  isSelected
                    ? isMapMode
                      ? 'bg-white/20 text-white'
                      : 'bg-primary text-primary-foreground'
                    : isMapMode
                      ? 'text-white/70 hover:bg-white/10 hover:text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-9 tracking-wide uppercase">{short}</span>
                  <span className="font-bold tabular-nums">{num}</span>
                </span>
                {isDayToday && (
                  <span
                    className={`ml-auto size-1.5 rounded-full ${
                      isSelected
                        ? isMapMode
                          ? 'bg-white'
                          : 'bg-primary-foreground'
                        : isMapMode
                          ? 'bg-white/50'
                          : 'bg-primary'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

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
  return (
    <div className="absolute top-3 left-3 z-20 max-w-[calc(100%-88px)] sm:max-w-[calc(100%-216px)]">
      <div
        className={`flex flex-col gap-1 rounded-xl p-1.5 ${
          isMapMode
            ? 'bg-black/40 backdrop-blur-sm'
            : 'bg-card border shadow-sm'
        }`}
      >
        {/* Row 1: lot tabs — first lot full-width, rest share a fixed row below */}
        <div
          className={`flex flex-col gap-1 rounded-lg transition-shadow ${
            keyNavRow === 0
              ? isMapMode
                ? 'ring-1 ring-white/40'
                : 'ring-primary/50 ring-1'
              : ''
          }`}
        >
          {isLoading ? (
            <>
              <div
                className={`h-7 w-full animate-pulse rounded-lg sm:h-9 ${isMapMode ? 'bg-white/10' : 'bg-muted'}`}
              />
              <div className="flex gap-1">
                <div
                  className={`h-7 flex-1 animate-pulse rounded-lg sm:h-9 ${isMapMode ? 'bg-white/10' : 'bg-muted'}`}
                />
                <div
                  className={`h-7 flex-1 animate-pulse rounded-lg sm:h-9 ${isMapMode ? 'bg-white/10' : 'bg-muted'}`}
                />
              </div>
            </>
          ) : (
            <>
              {/* First lot: full-width row */}
              {lots[0] && (
                <button
                  onClick={() => onLotSelect(lots[0]!)}
                  className={`flex min-h-6 w-full items-center justify-center rounded-lg px-1.5 py-0.5 text-[9px] font-medium transition-colors sm:min-h-7 sm:px-2 sm:text-[10px] md:min-h-9 md:px-3 md:py-1 md:text-xs ${
                    isMapMode
                      ? activeLot?.id === lots[0].id
                        ? 'bg-white text-blue-950'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      : activeLot?.id === lots[0].id
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {lots[0].name}
                  <LotStatusDot
                    lot={lots[0]}
                    allSpots={allSpots}
                    activeLot={activeLot}
                  />
                </button>
              )}
              {/* Remaining lots: always same row, each flex-1 */}
              {lots.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {lots.slice(1).map((lot) => (
                    <button
                      key={lot.id}
                      onClick={() => onLotSelect(lot)}
                      className={`flex min-h-6 min-w-9 flex-1 items-center justify-center rounded-lg px-1.5 py-0.5 text-[9px] font-medium transition-colors sm:min-h-7 sm:px-2 sm:text-[10px] md:min-h-9 md:px-3 md:py-1 md:text-xs ${
                        isMapMode
                          ? activeLot?.id === lot.id
                            ? 'bg-white text-blue-950'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                          : activeLot?.id === lot.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
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
        <div
          className={`-mx-0.5 h-px ${isMapMode ? 'bg-white/15' : 'bg-border'}`}
        />

        {/* Row 2: day selection — dropdown on mobile, strip on sm+ */}
        <div
          className={`rounded-lg transition-shadow ${
            keyNavRow === 1
              ? isMapMode
                ? 'ring-1 ring-white/40'
                : 'ring-primary/50 ring-1'
              : ''
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
                    isMapMode
                      ? isSelected
                        ? 'bg-white/20 text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                      : isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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

        {/* Row 3: projection note (non-today only) */}
        {selectedDate !== today && (
          <div
            className={`flex items-center gap-1.5 px-1 text-[10px] ${
              isMapMode ? 'text-white/50' : 'text-muted-foreground'
            }`}
          >
            <CalendarDays className="size-3 shrink-0" />
            {selectedDate < today ? t('map.historical') : t('map.projected')}
          </div>
        )}
      </div>
    </div>
  )
}
