import { notifications } from '@mantine/notifications'
import {
  ArrowRightLeft,
  ChevronUp,
  Clock,
  DoorOpen,
  History,
  Loader2,
  ParkingCircle,
  RotateCcw,
  ShieldX,
  Star,
  Sun,
  User,
  UserCheck,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCancelBooking, useMyBookings } from '@/hooks/useBookings'
import {
  useOwnerMe,
  useOwnerOverrides,
  useOwnerSpots,
  useOwnerWeek,
  useSetSpotDayStatus,
  useSpotBookings,
} from '@/hooks/useOwnerParking'
import { usePresence } from '@/hooks/usePresence'
import type {
  OwnerSpot,
  OwnerWeekBooking,
  SpotBooking,
  SpotDayOverride,
} from '@/types'

/* ── helpers ── */

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('sl-SI', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getNext7Days(today: string): string[] {
  const days: string[] = []
  const base = new Date(today + 'T00:00:00')
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    days.push(d.toISOString().slice(0, 10))
  }
  return days
}

function isNonWorkDay(
  date: string,
  today: string,
  workFreeDays: string[],
): boolean {
  if (date < today) return true
  const dow = new Date(date + 'T00:00:00').getDay()
  if (dow === 0 || dow === 6) return true
  return workFreeDays.includes(date)
}

type DayStatus = 'free' | 'occupied' | 'reserved'

const STATUS_DOT: Record<DayStatus, string> = {
  free: 'bg-green-500',
  occupied: 'bg-orange-400',
  reserved: 'bg-blue-500',
}

const STATUS_LABEL: Record<DayStatus, string> = {
  free: 'Prosto',
  occupied: 'Zasedeno',
  reserved: 'Rezervirano',
}

const STATUS_COLOR: Record<DayStatus, string> = {
  free: 'green',
  occupied: 'orange',
  reserved: 'blue',
}

const STATUS_BORDER: Record<DayStatus, string> = {
  free: 'border-l-4 border-l-green-500',
  occupied: 'border-l-4 border-l-orange-400',
  reserved: 'border-l-4 border-l-blue-500',
}

function computeDayStatus(
  spot: OwnerSpot,
  date: string,
  presenceMap: Map<string, string>,
  weekBookings: OwnerWeekBooking[],
  overrides: SpotDayOverride[],
): DayStatus {
  const hasBooking = weekBookings.some(
    (b) =>
      b.spot_id === spot.id &&
      b.status === 'active' &&
      b.expires_at.slice(0, 10) >= date &&
      (b.starts_at ?? b.booked_at).slice(0, 10) <= date,
  )
  if (hasBooking) return 'reserved'

  const override = overrides.find(
    (o) => o.spot_id === spot.id && o.date.slice(0, 10) === date,
  )
  if (override) return override.status

  if (spot.owner_name) {
    const status = presenceMap.get(spot.owner_name.toLowerCase())
    if (status && status !== 'in_office') return 'free'
    if (status === 'in_office') return 'occupied'
  }

  return spot.status === 'reserved' ? 'free' : spot.status
}

function hasOverrideForDay(
  spotId: string,
  date: string,
  overrides: SpotDayOverride[],
): boolean {
  return overrides.some(
    (o) => o.spot_id === spotId && o.date.slice(0, 10) === date,
  )
}

/* ── Shared Week Strip ── */

function WeekStrip({
  days,
  today,
  selectedDate,
  onSelect,
  workFreeDays,
}: {
  days: string[]
  today: string
  selectedDate: string
  onSelect: (date: string) => void
  workFreeDays: string[]
}) {
  return (
    <div className="bg-card rounded-2xl border p-1.5">
      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const d = new Date(date + 'T00:00:00')
          const isSelected = date === selectedDate
          const isToday = date === today
          const isWeekend = [0, 6].includes(d.getDay())
          const isHoliday = !isWeekend && workFreeDays.includes(date)
          const isNonWork = isWeekend || isHoliday
          const weekday = d.toLocaleDateString('sl-SI', { weekday: 'short' })
          const dayNum = d.getDate()

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl py-2.5 transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isNonWork
                    ? 'text-muted-foreground/60 hover:bg-muted'
                    : 'hover:bg-muted'
              }`}
            >
              <span
                className={`text-[11px] leading-none capitalize ${
                  isSelected
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                }`}
              >
                {weekday}
              </span>
              <span className="text-lg leading-tight font-bold">{dayNum}</span>
              {isToday && !isNonWork && (
                <div
                  className={`size-1 rounded-full ${
                    isSelected ? 'bg-primary-foreground' : 'bg-primary'
                  }`}
                />
              )}
              {isWeekend && (
                <Sun
                  className={`size-2.5 ${isSelected ? 'opacity-70' : 'opacity-50'}`}
                />
              )}
              {isHoliday && (
                <Star
                  className={`size-2.5 ${isSelected ? 'opacity-70' : 'opacity-50'}`}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── Spot Card ── */

function SpotCard({
  spot,
  status,
  isOverridden,
  isNonWorkDay,
  switchedToSpotNumber,
  onSetDayStatus,
  onClearOverride,
  onCancelBooking,
  onToggleHistory,
  historyOpen,
  isToggling,
  isCancelling,
}: {
  spot: OwnerSpot
  status: DayStatus
  isOverridden: boolean
  isNonWorkDay: boolean
  switchedToSpotNumber?: number
  onSetDayStatus: (s: 'free' | 'occupied') => void
  onClearOverride: () => void
  onCancelBooking: () => void
  onToggleHistory: () => void
  historyOpen: boolean
  isToggling: boolean
  isCancelling: boolean
}) {
  return (
    <div
      className={`bg-card overflow-hidden rounded-2xl border ${STATUS_BORDER[status]}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold">#{spot.number}</span>
            {spot.label && (
              <span className="text-muted-foreground text-sm">
                {spot.label}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Badge color={STATUS_COLOR[status]} variant="secondary">
              {STATUS_LABEL[status]}
            </Badge>
            {isOverridden && (
              <span className="text-muted-foreground text-xs">(override)</span>
            )}
          </div>
          {switchedToSpotNumber && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400">
              <ArrowRightLeft className="size-3 shrink-0" />
              Preklop na mesto #{switchedToSpotNumber} — dostopno ostalim
            </div>
          )}
        </div>
        <button
          onClick={onToggleHistory}
          className="text-muted-foreground hover:bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
        >
          {historyOpen ? (
            <ChevronUp className="size-4" />
          ) : (
            <History className="size-4" />
          )}
        </button>
      </div>

      {/* Reservation info */}
      {status === 'reserved' && spot.active_booking_reserved_by && (
        <div className="mx-4 mb-3 rounded-xl bg-blue-50 px-3.5 py-2.5 dark:bg-blue-950/30">
          <div className="flex items-center gap-2 text-sm">
            <User className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="truncate">
              Rezerviral:{' '}
              <span className="font-medium">
                {spot.active_booking_reserved_by}
              </span>
            </span>
          </div>
          {spot.active_booking_expires_at && (
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <Clock className="size-3 shrink-0" />
              Do: {formatDateTime(spot.active_booking_expires_at)}
            </div>
          )}
        </div>
      )}

      {/* Actions — big, clear buttons */}
      <div className="flex gap-2 border-t p-3">
        {status === 'occupied' && (
          <Button
            onClick={() => onSetDayStatus('free')}
            disabled={isToggling || isNonWorkDay}
            color="orange"
            className="h-11 flex-1 gap-2 text-sm font-semibold"
          >
            <DoorOpen className="size-4" />
            Sprosti mesto
          </Button>
        )}
        {status === 'free' && (
          <Button
            onClick={() => onSetDayStatus('occupied')}
            disabled={isToggling || isNonWorkDay}
            color="green"
            className="h-11 flex-1 gap-2 text-sm font-semibold"
          >
            <UserCheck className="size-4" />
            Zasedi mesto
          </Button>
        )}
        {status === 'reserved' && spot.active_booking_id && (
          <Button
            onClick={onCancelBooking}
            disabled={isCancelling}
            variant="destructive"
            className="h-11 flex-1 gap-2 text-sm font-semibold"
          >
            <ShieldX className="size-4" />
            Prekliči rezervacijo
          </Button>
        )}
        {isOverridden && status !== 'reserved' && (
          <Button
            onClick={onClearOverride}
            disabled={isToggling || isNonWorkDay}
            variant="ghost"
            className="text-muted-foreground h-11 gap-2 px-3 text-sm"
          >
            <RotateCcw className="size-4" />
            <span className="hidden sm:inline">Ponastavi</span>
          </Button>
        )}
      </div>
    </div>
  )
}

/* ── Booking History Panel ── */

function BookingHistory({
  spotId,
  spotNumber,
  onClose,
}: {
  spotId: string
  spotNumber: number
  onClose: () => void
}) {
  const { data: bookings = [], isLoading } = useSpotBookings(spotId)

  const statusBadge: Record<string, string> = {
    active:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="bg-card overflow-hidden rounded-2xl border">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">Zgodovina — #{spotNumber}</h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-7">
          Zapri
        </Button>
      </div>

      {isLoading ? (
        <div className="bg-muted/50 h-20 animate-pulse" />
      ) : bookings.length === 0 ? (
        <div className="border-t px-4 py-8 text-center">
          <History className="text-muted-foreground mx-auto mb-2 size-5" />
          <p className="text-muted-foreground text-sm">
            Ni preteklih rezervacij.
          </p>
        </div>
      ) : (
        <div className="divide-y border-t">
          {bookings.map((b: SpotBooking) => (
            <div key={b.id} className="flex items-start gap-3 px-4 py-3">
              <div className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full">
                <User className="text-muted-foreground size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {b.reserved_by ?? 'Unknown'}
                  </span>
                  <Badge
                    className={`shrink-0 border-transparent text-[10px] ${statusBadge[b.status] ?? ''}`}
                  >
                    {b.status}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatDateTime(b.booked_at)} — {formatDateTime(b.expires_at)}
                </p>
                {b.cancelled_by && (
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                    Preklical: {b.cancelled_by}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Legend ── */

function Legend() {
  return (
    <div className="flex items-center gap-3 text-[11px]">
      {(['free', 'occupied', 'reserved'] as const).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <div className={`size-2 rounded-full ${STATUS_DOT[s]}`} />
          <span className="text-muted-foreground">{STATUS_LABEL[s]}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Page ── */

export function OwnerParkingPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const [historySpotId, setHistorySpotId] = useState<string | null>(null)

  const days = useMemo(() => getNext7Days(today), [today])
  const weekEnd = days[6] ?? today

  const {
    data: owner,
    isLoading: ownerLoading,
    error: ownerError,
  } = useOwnerMe()
  const { data: spots = [], isLoading: spotsLoading } = useOwnerSpots()
  const { data: presenceData } = usePresence(selectedDate)
  const { data: weekBookings = [] } = useOwnerWeek(today, weekEnd)
  const { data: overrides = [] } = useOwnerOverrides(today, weekEnd)
  const { data: myBookings = [] } = useMyBookings()

  const setDayStatus = useSetSpotDayStatus()
  const cancelBooking = useCancelBooking()

  const ownedSpotIds = useMemo(() => new Set(spots.map((s) => s.id)), [spots])

  const myBookingElsewhere = useMemo(
    () =>
      myBookings.find(
        (b) =>
          b.status === 'active' &&
          !ownedSpotIds.has(b.spot_id) &&
          b.booked_at.slice(0, 10) <= selectedDate &&
          b.expires_at.slice(0, 10) >= selectedDate,
      ),
    [myBookings, ownedSpotIds, selectedDate],
  )

  const workFreeDays = presenceData?.work_free_days ?? []

  const presenceMap = useMemo(() => {
    const map = new Map<string, string>()
    const employees = presenceData?.employees ?? []
    for (const emp of employees) {
      const dayEntry = emp.week.find((d) => d.date === selectedDate)
      if (dayEntry) {
        map.set(emp.name.toLowerCase(), dayEntry.status)
      }
    }
    return map
  }, [presenceData, selectedDate])

  function getStatus(spot: OwnerSpot): DayStatus {
    return computeDayStatus(
      spot,
      selectedDate,
      presenceMap,
      weekBookings,
      overrides,
    )
  }

  function handleSetDayStatus(spot: OwnerSpot, status: 'free' | 'occupied') {
    // Capture at call time so the closure stays consistent even if selectedDate changes
    const bookingToCancel =
      status === 'occupied' ? myBookingElsewhere : undefined

    setDayStatus.mutate(
      { spotId: spot.id, date: selectedDate, status },
      {
        onSuccess: () => {
          if (bookingToCancel) {
            // Re-occupying own spot — also cancel the switched-to booking so
            // the other spot is freed on the map immediately.
            cancelBooking.mutate(bookingToCancel.id, {
              onSuccess: () =>
                notifications.show({
                  message: `Mesto #${spot.number} zasedeno za ${selectedDate}`,
                  color: 'green',
                }),
              onError: (err) =>
                notifications.show({
                  message:
                    err instanceof Error ? err.message : 'Napaka pri preklicu',
                  color: 'red',
                }),
            })
          } else {
            notifications.show({
              message:
                status === 'free'
                  ? `Mesto #${spot.number} sproščeno za ${selectedDate}`
                  : `Mesto #${spot.number} zasedeno za ${selectedDate}`,
              color: 'green',
            })
          }
        },
        onError: (err) =>
          notifications.show({
            message: err instanceof Error ? err.message : 'Napaka',
            color: 'red',
          }),
      },
    )
  }

  function handleClearOverride(spot: OwnerSpot) {
    setDayStatus.mutate(
      { spotId: spot.id, date: selectedDate, status: null },
      {
        onSuccess: () =>
          notifications.show({
            message: `Mesto #${spot.number} ponastavljeno na timesheet`,
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message: err instanceof Error ? err.message : 'Napaka',
            color: 'red',
          }),
      },
    )
  }

  function handleCancelBooking(spot: OwnerSpot) {
    if (!spot.active_booking_id) return
    cancelBooking.mutate(spot.active_booking_id, {
      onSuccess: () =>
        notifications.show({
          message: `Rezervacija na mestu #${spot.number} preklicana`,
          color: 'green',
        }),
      onError: (err) =>
        notifications.show({
          message: err instanceof Error ? err.message : 'Preklic ni uspel',
          color: 'red',
        }),
    })
  }

  const selectedDateLabel = new Date(
    selectedDate + 'T00:00:00',
  ).toLocaleDateString('sl-SI', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const historySpot = spots.find((s) => s.id === historySpotId)

  if (ownerLoading || spotsLoading) {
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

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Moj Parking</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {owner?.name} — upravljanje parkirnih mest
        </p>
      </div>

      {/* Week calendar — full width */}
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
      {myBookingElsewhere &&
        spots.some((spot) => {
          const s = getStatus(spot)
          return (
            hasOverrideForDay(spot.id, selectedDate, overrides) && s === 'free'
          )
        }) && (
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-950/30">
            <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-indigo-500" />
            <div className="text-sm">
              <p className="font-medium text-indigo-700 dark:text-indigo-300">
                Rezervacijo ste premaknili na parkirno mesto #
                {myBookingElsewhere.spot_number}
              </p>
              <p className="text-indigo-600/80 dark:text-indigo-400/80">
                Vaše lastniško parkirno mesto je za ta dan označeno kot prosto
                in dostopno ostalim.
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
                switchedToSpotNumber={
                  isSwitchedFree ? myBookingElsewhere.spot_number : undefined
                }
                onSetDayStatus={(s) => handleSetDayStatus(spot, s)}
                onClearOverride={() => handleClearOverride(spot)}
                onCancelBooking={() => handleCancelBooking(spot)}
                onToggleHistory={() =>
                  setHistorySpotId(historySpotId === spot.id ? null : spot.id)
                }
                historyOpen={historySpotId === spot.id}
                isToggling={setDayStatus.isPending}
                isCancelling={cancelBooking.isPending}
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
