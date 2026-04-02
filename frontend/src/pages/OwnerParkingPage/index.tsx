import { ArrowRightLeft, Loader2, ParkingCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthStore } from '@/store/authStore'
import type { OwnerSpot } from '@/types'

import { BookingHistory } from './BookingHistory'
import { Legend } from './Legend'
import { SpotCard } from './SpotCard'
import { useOwnerParkingActions } from './useOwnerParkingActions'
import { useOwnerParkingData } from './useOwnerParkingData'
import {
  computeDayStatus,
  getAdjacentWeek,
  getFirstWorkday,
  getWeekDays7,
  hasOverrideForDay,
  isNonWorkDay,
  isPastBookingCutoff,
} from './utils'
import { WeekStrip } from './WeekStrip'

// — main component —

export function OwnerParkingPage() {
  const { t, i18n } = useTranslation()
  const currentUserId = useAuthStore((s) => s.user?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [weekRef, setWeekRef] = useState(today)
  const [historySpotId, setHistorySpotId] = useState<string | null>(null)

  const days = getWeekDays7(weekRef)

  const {
    owner,
    isOwnerLoading,
    ownerError,
    spots,
    isSpotsLoading,
    workFreeDays,
    weekBookings,
    overrides,
    presenceMap,
    myBookingElsewhere,
  } = useOwnerParkingData(selectedDate, today, days[6] ?? today)

  function handlePrevWeek() {
    const newMonday = getAdjacentWeek(days, 'prev')
    const newDays = getWeekDays7(newMonday)
    setWeekRef(newMonday)
    setSelectedDate(getFirstWorkday(newDays, today, workFreeDays))
  }

  function handleNextWeek() {
    const newMonday = getAdjacentWeek(days, 'next')
    const newDays = getWeekDays7(newMonday)
    setWeekRef(newMonday)
    setSelectedDate(getFirstWorkday(newDays, today, workFreeDays))
  }

  function handleGoToToday() {
    setWeekRef(today)
    setSelectedDate(today)
  }

  // Reactively correct the selected date once workFreeDays loads for the new
  // week — workFreeDays for next week aren't available at navigation time, so
  // we correct here once the presence fetch for the new week returns.

  useEffect(() => {
    if (
      selectedDate >= today &&
      isNonWorkDay(selectedDate, today, workFreeDays)
    ) {
      const corrected = getFirstWorkday(days, today, workFreeDays)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (corrected !== selectedDate) setSelectedDate(corrected)
    }
  }, [workFreeDays, selectedDate, today, days])

  const {
    handleSetDayStatus,
    handleClearOverride,
    handleCancelBooking,
    isToggling,
    isCancelling,
  } = useOwnerParkingActions(selectedDate, myBookingElsewhere)

  function getStatus(spot: OwnerSpot) {
    return computeDayStatus(
      spot,
      selectedDate,
      presenceMap,
      weekBookings,
      overrides,
    )
  }

  function handleToggleHistory(spotId: string) {
    setHistorySpotId((current) => (current === spotId ? null : spotId))
  }

  const selectedDateLabel = new Date(
    selectedDate + 'T00:00:00',
  ).toLocaleDateString(i18n.language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const historySpot = spots.find((s) => s.id === historySpotId)

  if (isOwnerLoading || isSpotsLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
  }

  if (ownerError) {
    return (
      <div className="pt-8">
        <h1 className="mb-4 text-2xl font-semibold">
          {t('ownerParking.title')}
        </h1>
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <ParkingCircle className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">
            {t('ownerParking.notAnOwner')}
          </p>
        </div>
      </div>
    )
  }

  const hasSwitchedSpotVisible =
    myBookingElsewhere !== undefined &&
    spots.some(
      (spot) =>
        hasOverrideForDay(spot.id, selectedDate, overrides) &&
        getStatus(spot) === 'free',
    )

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{t('ownerParking.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('ownerParking.subtitle', { name: owner?.name })}
        </p>
      </div>

      <WeekStrip
        days={days}
        today={today}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onGoToToday={handleGoToToday}
        workFreeDays={workFreeDays}
      />

      {/* Selected date label + legend */}
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-medium capitalize">
          {selectedDateLabel}
        </p>
        <div className="shrink-0">
          <Legend />
        </div>
      </div>

      {/* Switched-spot banner — only when an owned spot is still freed-up */}
      {hasSwitchedSpotVisible && (
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/30">
          <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-indigo-500" />
          <div className="text-sm">
            <p className="font-medium text-indigo-700 dark:text-indigo-300">
              {t('ownerParking.movedToSpotBanner', {
                label:
                  myBookingElsewhere.spot_label ??
                  `#${myBookingElsewhere.spot_number}`,
              })}
            </p>
            <p className="text-indigo-600/80 dark:text-indigo-400/80">
              {t('ownerParking.movedToSpotDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Spots */}
      {spots.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <ParkingCircle className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">
            {t('ownerParking.noSpotsAssigned')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {spots.map((spot) => {
            const status = getStatus(spot)
            const isOverridden = hasOverrideForDay(
              spot.id,
              selectedDate,
              overrides,
            )
            const isSwitchedFree =
              isOverridden &&
              status === 'free' &&
              myBookingElsewhere !== undefined
            return (
              <SpotCard
                key={spot.id}
                spot={spot}
                status={status}
                isOverridden={isOverridden}
                isNonWorkDay={isNonWorkDay(selectedDate, today, workFreeDays)}
                isPastCutoff={isPastBookingCutoff(selectedDate, today)}
                currentUserId={currentUserId}
                switchedToSpotLabel={
                  isSwitchedFree
                    ? (myBookingElsewhere.spot_label ??
                      `#${myBookingElsewhere.spot_number}`)
                    : undefined
                }
                onSetDayStatus={(s) => handleSetDayStatus(spot, s)}
                onClearOverride={() => handleClearOverride(spot)}
                onCancelBooking={() => handleCancelBooking(spot)}
                onToggleHistory={() => handleToggleHistory(spot.id)}
                isHistoryOpen={historySpotId === spot.id}
                isToggling={isToggling}
                isCancelling={isCancelling}
              />
            )
          })}
        </div>
      )}

      {/* History panel */}
      {historySpotId && historySpot && (
        <BookingHistory
          spotId={historySpotId}
          spotLabel={historySpot.label ?? `#${historySpot.number}`}
          onClose={() => setHistorySpotId(null)}
        />
      )}
    </div>
  )
}
