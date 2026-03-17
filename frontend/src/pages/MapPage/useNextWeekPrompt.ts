import { useEffect, useState } from 'react'

import { usePrefsStore } from '@/store/prefsStore'
import { useUIStore } from '@/store/uiStore'

import { computeFridayWindowPassed, getWeekDays } from './utils'

// ─── types ────────────────────────────────────────────────────────────────────

interface UseNextWeekPromptResult {
  showNextWeekPrompt: boolean
  handleGoToNextWeek: () => void
  handleDismiss: () => void
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useNextWeekPrompt(): UseNextWeekPromptResult {
  const arrivalTime = usePrefsStore((s) => s.arrivalTime)
  const reservationDuration = usePrefsStore((s) => s.reservationDuration)
  const selectedDate = useUIStore((s) => s.selectedDate)
  const setSelectedDate = useUIStore((s) => s.setSelectedDate)

  const [dismissed, setDismissed] = useState(false)

  // Re-show the prompt after 1 hour if the user clicked "Stay"
  useEffect(() => {
    if (!dismissed) return
    const id = setTimeout(() => setDismissed(false), 3_600_000)
    return () => clearTimeout(id)
  }, [dismissed])

  const today = new Date().toISOString().slice(0, 10)
  const currentWeekDays = getWeekDays(today)
  const isFriday = new Date().getDay() === 5
  const fridayWindowPassed = computeFridayWindowPassed(
    arrivalTime,
    reservationDuration,
  )
  const viewingCurrentWeek = currentWeekDays.includes(selectedDate)
  const showNextWeekPrompt =
    isFriday && fridayWindowPassed && viewingCurrentWeek && !dismissed

  function handleGoToNextWeek() {
    // Friday + 3 days = next Monday
    const nextMonday = new Date()
    nextMonday.setDate(nextMonday.getDate() + 3)
    setSelectedDate(nextMonday.toISOString().slice(0, 10))
  }

  return {
    showNextWeekPrompt,
    handleGoToNextWeek,
    handleDismiss: () => setDismissed(true),
  }
}
