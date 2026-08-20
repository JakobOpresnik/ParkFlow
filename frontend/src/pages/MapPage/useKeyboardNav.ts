import { useEffect, useState } from 'react'

import type { ParkingLot } from '@/types'

import { getAdjacentWeekDay } from './utils'

// — types —

interface UseKeyboardNavOptions {
  readonly lots: ParkingLot[]
  readonly selectedLotId: string | null
  readonly setSelectedLotId: (id: string | null) => void
  readonly weekDays: string[]
  readonly selectedDate: string
  readonly setSelectedDate: (date: string) => void
}

// — main hook —

export function useKeyboardNav({
  lots,
  selectedLotId,
  setSelectedLotId,
  weekDays,
  selectedDate,
  setSelectedDate,
}: UseKeyboardNavOptions): { keyNavRow: number } {
  const [keyNavRow, setKeyNavRow] = useState(0)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setKeyNavRow(0)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setKeyNavRow(1)
        return
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

      if (keyNavRow === 0) {
        if (lots.length < 2) return
        const idx = lots.findIndex((l) => l.id === selectedLotId)
        const next =
          e.key === 'ArrowRight'
            ? lots[(idx + 1) % lots.length]
            : lots[(idx - 1 + lots.length) % lots.length]
        if (next) setSelectedLotId(next.id)
      } else {
        const idx = weekDays.indexOf(selectedDate)
        const dir = e.key === 'ArrowRight' ? 'next' : 'prev'
        const next =
          weekDays[idx + (dir === 'next' ? 1 : -1)] ??
          getAdjacentWeekDay(weekDays, dir)
        // Past days aren't selectable anywhere else either.
        if (next >= new Date().toISOString().slice(0, 10)) setSelectedDate(next)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [
    keyNavRow,
    lots,
    selectedLotId,
    setSelectedLotId,
    weekDays,
    selectedDate,
    setSelectedDate,
  ])

  return { keyNavRow }
}
