import { ArrowRightLeft, Loader2, ParkingCircle } from 'lucide-react'
import { useState } from 'react'

import type { OwnerSpot } from '@/types'

import { BookingHistory } from './BookingHistory'
import { Legend } from './Legend'
import { SpotCard } from './SpotCard'
import { useOwnerParkingActions } from './useOwnerParkingActions'
import { useOwnerParkingData } from './useOwnerParkingData'
import {
  computeDayStatus,
  getNext7Days,
  hasOverrideForDay,
  isNonWorkDay,
  isPastBookingCutoff,
} from './utils'
import { WeekStrip } from './WeekStrip'

// — main component —

export function OwnerParkingPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [historySpotId, setHistorySpotId] = useState<string | null>(null)

  const days = getNext7Days(today)

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
  } = useOwnerParkingData(selectedDate, today)

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
  ).toLocaleDateString('sl-SI', {
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
        <h1 className="mb-4 text-2xl font-semibold">Moj Parking</h1>
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <ParkingCircle className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">
            Vaš račun ni povezan z nobenim lastnikom parkirnega mesta.
            Kontaktirajte administratorja.
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
        <h1 className="text-2xl font-semibold">Moj Parking</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {owner?.name} — upravljanje parkirnih mest
        </p>
      </div>

      <WeekStrip
        days={days}
        today={today}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
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
              Rezervacijo ste premaknili na parkirno mesto #
              {myBookingElsewhere.spot_number}
            </p>
            <p className="text-indigo-600/80 dark:text-indigo-400/80">
              Vaše lastniško parkirno mesto je za ta dan označeno kot prosto in
              dostopno ostalim.
            </p>
          </div>
        </div>
      )}

      {/* Spots */}
      {spots.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <ParkingCircle className="text-muted-foreground mx-auto mb-3 size-8" />
          <p className="text-muted-foreground text-sm">
            Nimate dodeljenih parkirnih mest.
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
                switchedToSpotNumber={
                  isSwitchedFree ? myBookingElsewhere.spot_number : undefined
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
          spotNumber={historySpot.number}
          onClose={() => setHistorySpotId(null)}
        />
      )}
    </div>
  )
}
