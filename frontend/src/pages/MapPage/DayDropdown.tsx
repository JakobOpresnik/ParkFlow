import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerUpLeft,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getTheme } from './lotDaySelectorTheme'
import { formatDayLabel, getAdjacentWeekDay, getWeekLabel } from './utils'

// — types —

interface DayDropdownProps {
  readonly weekDays: string[]
  readonly selectedDate: string
  readonly today: string
  readonly isMapMode: boolean
  readonly onDateSelect: (date: string) => void
}

// — main component —

export function DayDropdown({
  weekDays,
  selectedDate,
  today,
  isMapMode,
  onDateSelect,
}: DayDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { i18n, t } = useTranslation()
  const theme = getTheme(isMapMode)

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
        className={`flex min-h-7 w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${theme.dayToggleActive}`}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-9 tracking-wide uppercase">{selected.short}</span>
          <span className="font-bold tabular-nums">{selected.num}</span>
          {isToday && (
            <span className={`size-1 rounded-full ${theme.todayDot}`} />
          )}
        </span>
        <ChevronDown
          className={`size-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 z-30 mt-1 min-w-[130px] rounded-lg p-1 shadow-lg ${theme.dayDropdownMenu}`}
        >
          {/* Week navigation header */}
          <div
            className={`mb-0.5 flex items-center justify-between gap-1 px-1 py-0.5 ${theme.projectionNote}`}
          >
            <button
              onClick={() => onDateSelect(getAdjacentWeekDay(weekDays, 'prev'))}
              title={t('map.prevWeek')}
              className={`flex size-5 items-center justify-center rounded-md transition-colors ${theme.dayUnselected}`}
            >
              <ChevronLeft className="size-3" />
            </button>
            <span className="min-w-0 truncate text-center text-[9px] font-medium tabular-nums">
              {getWeekLabel(weekDays, i18n.language)}
            </span>
            <button
              onClick={() => onDateSelect(getAdjacentWeekDay(weekDays, 'next'))}
              title={t('map.nextWeek')}
              className={`flex size-5 items-center justify-center rounded-md transition-colors ${theme.dayUnselected}`}
            >
              <ChevronRight className="size-3" />
            </button>
          </div>
          {!weekDays.includes(today) && (
            <button
              onClick={() => {
                onDateSelect(today)
                setOpen(false)
              }}
              className={`mb-0.5 flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] transition-colors ${theme.todayBtn}`}
            >
              <CornerUpLeft className="size-3" />
              {t('map.today')}
            </button>
          )}
          <div
            className={`-mx-0.5 mb-0.5 h-px ${theme.projectionNote} opacity-30`}
          />
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
                  isSelected ? theme.daySelected : theme.dayUnselected
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-9 tracking-wide uppercase">{short}</span>
                  <span className="font-bold tabular-nums">{num}</span>
                </span>
                {isDayToday && (
                  <span
                    className={`ml-auto size-1.5 rounded-full ${
                      isSelected ? theme.daySelectedDot : theme.dayUnselectedDot
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
