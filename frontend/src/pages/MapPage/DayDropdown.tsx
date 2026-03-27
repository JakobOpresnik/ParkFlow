import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getTheme } from './lotDaySelectorTheme'
import { formatDayLabel } from './utils'

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
  const { i18n } = useTranslation()
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
          className={`absolute top-full left-0 z-30 mt-1 min-w-[110px] rounded-lg p-1 shadow-lg ${theme.dayDropdownMenu}`}
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
                      isSelected
                        ? theme.daySelectedDot
                        : theme.dayUnselectedDot
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
