import { notifications } from '@mantine/notifications'
import {
  ArrowRightLeft,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Lock,
  MapPin,
  Minus,
  Pencil,
  Plus,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  useCancelBooking,
  useCreateBooking,
  useUpdateBookingTimes,
} from '@/hooks/useBookings'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useCreateOwner, useOwners } from '@/hooks/useOwners'
import { useAssignOwner, useUpdateStatus } from '@/hooks/useSpots'
import { useAuthStore } from '@/store/authStore'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'
import { useUIStore } from '@/store/uiStore'
import type { SpotStatus, SpotType } from '@/types'

import { ReservationTimer } from '../ReservationTimer'

const SPOT_TYPE_INFO: Partial<
  Record<SpotType, { icon: string; label: string }>
> = {
  ev: { icon: '⚡', label: 'EV Charging' },
  handicap: { icon: '♿', label: 'Handicap Accessible' },
  compact: { icon: '🅿', label: 'Compact' },
}

// ─── Booking time helpers ──────────────────────────────────────────────────────

function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Computes expires_at from the user's arrival time + chosen duration for a specific date. */
function computeExpiresAt(
  arrivalTime: string,
  durationHours: number,
  targetDate: string,
): Date {
  const [hh, mm] = arrivalTime.split(':').map(Number)
  const arrival = new Date(targetDate + 'T12:00:00')
  arrival.setHours(hh ?? 9, mm ?? 0, 0, 0)
  return new Date(arrival.getTime() + durationHours * 3_600_000)
}

function fmtTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_LABELS: Record<SpotStatus, string> = {
  free: 'Available',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

const STATUS_COLOR: Record<SpotStatus, string> = {
  free: 'green',
  occupied: 'red',
  reserved: 'yellow',
}

const ALL_STATUSES: SpotStatus[] = ['free', 'occupied', 'reserved']

const STATUS_BANNER: Record<
  SpotStatus,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  free: {
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle2 className="size-4 shrink-0" />,
  },
  occupied: {
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    icon: <XCircle className="size-4 shrink-0" />,
  },
  reserved: {
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    icon: <Clock className="size-4 shrink-0" />,
  },
}

export function SpotModal() {
  const open = useUIStore((s) => s.spotModalOpen)
  const setOpen = useUIStore((s) => s.setSpotModalOpen)
  const selectedSpot = useParkingStore((s) => s.selectedSpot)
  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)

  const selectedDate = useUIStore((s) => s.selectedDate)
  const today = new Date().toISOString().slice(0, 10)
  const isBookableDate = selectedDate >= today
  const { data: allSpots = [] } = useEffectiveSpots(selectedDate)
  const spot = allSpots.find((s) => s.id === selectedSpot?.id) ?? selectedSpot

  const { data: owners = [] } = useOwners()
  const assignOwner = useAssignOwner()
  const updateStatus = useUpdateStatus()
  const createOwner = useCreateOwner()
  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const updateBookingTimes = useUpdateBookingTimes()
  const user = useAuthStore((s) => s.user)

  const arrivalTime = usePrefsStore((s) => s.arrivalTime)
  const reservationDuration = usePrefsStore((s) => s.reservationDuration)
  const [bookingDuration, setBookingDuration] = useState(reservationDuration)

  // Interval editing state for active reservations
  const [editingInterval, setEditingInterval] = useState(false)
  const [editStart, setEditStart] = useState('09:00')
  const [editEnd, setEditEnd] = useState('17:00')

  const bookingInFlight = useRef(false)

  const [managementExpanded, setManagementExpanded] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null)
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPlate, setNewPlate] = useState('')

  function resetLocal() {
    setManagementExpanded(false)
    setAssignOpen(false)
    setSelectedOwnerId(null)
    setCreateFormOpen(false)
    setNewName('')
    setNewPlate('')
    setBookingDuration(reservationDuration)
    setEditingInterval(false)
  }

  function handleClose() {
    setOpen(false)
    setSelectedSpot(null)
    resetLocal()
  }

  // Spot the current user has reserved elsewhere ON THE SAME DAY (for auto-cancel on new reserve).
  // Reservations on other days are independent and must not be affected.
  const myReservedElsewhere = user
    ? allSpots.find(
        (s) =>
          s.active_booking_user_id === user.id &&
          s.active_booking_id !== null &&
          s.id !== spot?.id &&
          s.active_booking_expires_at?.slice(0, 10) === selectedDate,
      )
    : undefined

  // Whether the logged-in user (or admin) can cancel this spot's active booking
  const canCancelThisBooking =
    !!spot?.active_booking_id &&
    !!user &&
    (spot.active_booking_user_id === user.id || user.role === 'admin')

  function handleStatusChange(status: SpotStatus) {
    if (!spot) return
    updateStatus.mutate(
      { id: spot.id, status },
      {
        onSuccess: () =>
          notifications.show({
            message: `Spot #${spot.number} marked as ${STATUS_LABELS[status]}`,
            color: 'green',
          }),
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to update status',
            color: 'red',
          }),
      },
    )
  }

  function handleAssignConfirm() {
    if (!spot || !selectedOwnerId) return
    const ownerId = selectedOwnerId === '__unassign__' ? null : selectedOwnerId
    assignOwner.mutate(
      { id: spot.id, owner_id: ownerId },
      {
        onSuccess: () => {
          notifications.show({
            message: ownerId
              ? `Owner assigned to spot #${spot.number}`
              : `Spot #${spot.number} unassigned`,
            color: 'green',
          })
          setAssignOpen(false)
          setSelectedOwnerId(null)
          setCreateFormOpen(false)
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to assign owner',
            color: 'red',
          }),
      },
    )
  }

  function handleCreateAndAssign() {
    if (!spot || !newName.trim()) return
    createOwner.mutate(
      {
        name: newName.trim(),
        email: null,
        phone: null,
        vehicle_plate: newPlate.trim() || null,
        notes: null,
        user_id: null,
      },
      {
        onSuccess: (owner) => {
          assignOwner.mutate(
            { id: spot.id, owner_id: owner.id },
            {
              onSuccess: () => {
                notifications.show({
                  message: `Owner "${owner.name}" created and assigned to spot #${spot.number}`,
                  color: 'green',
                })
                resetLocal()
              },
              onError: (err) =>
                notifications.show({
                  message:
                    err instanceof Error ? err.message : 'Failed to assign',
                  color: 'red',
                }),
            },
          )
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to create owner',
            color: 'red',
          }),
      },
    )
  }

  async function handleBook() {
    if (!spot || bookingInFlight.current) return
    bookingInFlight.current = true
    const expiresAt = computeExpiresAt(
      arrivalTime,
      bookingDuration,
      selectedDate,
    )
    const expiryStr = fmtTime(expiresAt)

    // Auto-cancel any reservation the user holds elsewhere before booking
    if (myReservedElsewhere?.active_booking_id) {
      try {
        await cancelBooking.mutateAsync(myReservedElsewhere.active_booking_id)
      } catch (err) {
        notifications.show({
          message:
            err instanceof Error
              ? err.message
              : 'Could not cancel existing reservation',
          color: 'red',
        })
        return
      }
    }

    try {
      const [hh, mm] = arrivalTime.split(':').map(Number)
      const startsAtDate = new Date(selectedDate + 'T12:00:00')
      startsAtDate.setHours(hh ?? 9, mm ?? 0, 0, 0)
      await createBooking.mutateAsync({
        spot_id: spot.id,
        starts_at: startsAtDate.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      notifications.show({
        message: myReservedElsewhere
          ? `Moved to spot #${spot.number} — spot #${myReservedElsewhere.number} reservation cancelled.`
          : `Spot #${spot.number} reserved until ${expiryStr}!`,
        color: 'green',
      })
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Booking failed',
        color: 'red',
      })
    } finally {
      bookingInFlight.current = false
    }
  }

  function handleOpenIntervalEdit() {
    if (!spot?.active_booking_expires_at) return
    const expiry = new Date(spot.active_booking_expires_at)
    // Use stored starts_at if available, otherwise derive from arrival pref
    const start = spot.active_booking_starts_at
      ? new Date(spot.active_booking_starts_at)
      : null
    const startHH = start
      ? String(start.getHours()).padStart(2, '0')
      : arrivalTime.split(':')[0]
    const startMM = start
      ? String(start.getMinutes()).padStart(2, '0')
      : arrivalTime.split(':')[1]
    setEditStart(`${startHH}:${startMM}`)
    setEditEnd(
      `${String(expiry.getHours()).padStart(2, '0')}:${String(expiry.getMinutes()).padStart(2, '0')}`,
    )
    setEditingInterval(true)
  }

  function handleSaveInterval() {
    if (!spot?.active_booking_id || !spot.active_booking_expires_at) return
    const bookingDate = spot.active_booking_expires_at.slice(0, 10)
    const [sh, sm] = editStart.split(':').map(Number)
    const [eh, em] = editEnd.split(':').map(Number)
    const newStart = new Date(bookingDate + 'T12:00:00')
    newStart.setHours(sh ?? 9, sm ?? 0, 0, 0)
    const newEnd = new Date(bookingDate + 'T12:00:00')
    newEnd.setHours(eh ?? 17, em ?? 0, 0, 0)

    if (newEnd <= newStart) {
      notifications.show({ message: 'End must be after start', color: 'red' })
      return
    }

    updateBookingTimes.mutate(
      {
        id: spot.active_booking_id,
        starts_at: newStart.toISOString(),
        expires_at: newEnd.toISOString(),
      },
      {
        onSuccess: () => {
          setEditingInterval(false)
          notifications.show({
            message: `Reservation updated: ${editStart} – ${editEnd}`,
            color: 'green',
          })
        },
        onError: (err) =>
          notifications.show({
            message:
              err instanceof Error ? err.message : 'Failed to update times',
            color: 'red',
          }),
      },
    )
  }

  function handleCancelBooking() {
    if (!spot?.active_booking_id) return
    cancelBooking.mutate(spot.active_booking_id, {
      onSuccess: () =>
        notifications.show({
          message: `Reservation for spot #${spot.number} cancelled.`,
          color: 'green',
        }),
      onError: (err) =>
        notifications.show({
          message:
            err instanceof Error ? err.message : 'Failed to cancel reservation',
          color: 'red',
        }),
    })
  }

  if (!spot) return null

  const isPending =
    assignOwner.isPending || updateStatus.isPending || createOwner.isPending
  const bookingPending = createBooking.isPending || cancelBooking.isPending

  const computedExpiry = computeExpiresAt(
    arrivalTime,
    bookingDuration,
    selectedDate,
  )
  const computedExpiryStr = fmtTime(computedExpiry)
  // True when viewing today and the arrival+duration window has already closed
  const isToday = selectedDate === today
  const arrivalWindowPassed = isToday && computedExpiry <= new Date()

  // Used in the "unavailable" CTA to avoid nested ternaries
  const unavailableMsg =
    spot?.status === 'occupied'
      ? 'Spot unavailable — currently occupied'
      : 'Spot unavailable — already reserved'

  const ownerSelectData = owners.map((o) => ({
    value: o.id,
    label: o.name + (o.vehicle_plate ? ` (${o.vehicle_plate})` : ''),
  }))

  const banner = STATUS_BANNER[spot.status]

  // Status banner subtext — contextual based on current user's relationship to this spot
  const bannerSubtext =
    spot.status === 'free'
      ? myReservedElsewhere
        ? `You have spot #${myReservedElsewhere.number} reserved. Moving here will cancel it.`
        : 'This spot is open and ready to reserve.'
      : spot.status === 'reserved'
        ? canCancelThisBooking
          ? 'You have reserved this spot.'
          : 'This spot has already been reserved.'
        : spot.owner_name
          ? 'This spot is currently in use by the owner.'
          : 'This spot is currently in use.'

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md sm:p-0">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-6 pt-6 pr-14 pb-5">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            Parking Spot
          </p>
          <div className="min-w-0">
            <h2 className="text-3xl font-bold tracking-tight">
              #{spot.number}
            </h2>
            {spot.label && (
              <p className="text-muted-foreground mt-0.5 truncate text-sm">
                {spot.label}
              </p>
            )}
          </div>
        </div>

        <div className="bg-border h-px" />

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          {/* Status banner */}
          <div
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${banner.bg}`}
          >
            <span className={banner.text}>{banner.icon}</span>
            <div>
              <p
                className={`text-sm leading-snug font-semibold ${banner.text}`}
              >
                {STATUS_LABELS[spot.status]}
              </p>
              <p className="text-muted-foreground text-xs">{bannerSubtext}</p>
            </div>
          </div>

          {/* Details card */}
          <div className="divide-y rounded-lg border">
            <div className="flex items-center gap-3 px-4 py-3">
              <MapPin className="text-muted-foreground size-4 shrink-0" />
              <span className="text-muted-foreground width-14 w-14 shrink-0 text-sm">
                Floor
              </span>
              <span className="text-sm font-medium">{spot.floor}</span>
            </div>
            {spot.type && SPOT_TYPE_INFO[spot.type] && (
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="size-4 shrink-0 text-center text-sm">
                  {SPOT_TYPE_INFO[spot.type]!.icon}
                </span>
                <span className="text-muted-foreground w-14 shrink-0 text-sm">
                  Type
                </span>
                <span className="text-sm font-medium">
                  {SPOT_TYPE_INFO[spot.type]!.label}
                </span>
              </div>
            )}
            <div className="flex items-start gap-3 px-4 py-3">
              <User className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span className="text-muted-foreground w-14 shrink-0 text-sm">
                {spot.owner_name?.includes('/') ? 'Owners' : 'Owner'}
              </span>
              {spot.owner_name ? (
                <div className="min-w-0">
                  {spot.owner_name.split('/').map((name) => {
                    const isInOffice =
                      spot.in_office_owner?.toLowerCase() ===
                      name.trim().toLowerCase()
                    return (
                      <p
                        key={name}
                        className="flex items-center gap-1.5 text-sm leading-snug font-medium"
                      >
                        {name.trim()}
                        {isInOffice && (
                          <span className="text-spot-occupied bg-spot-occupied/10 rounded-full px-1.5 py-0.5 text-xs font-medium">
                            in office
                          </span>
                        )}
                      </p>
                    )
                  })}
                  {spot.owner_vehicle_plate && (
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                      <Car className="size-3" />
                      {spot.owner_vehicle_plate}
                    </p>
                  )}
                  {spot.status === 'reserved' &&
                    spot.active_booking_reserved_by &&
                    spot.active_booking_reserved_by !== spot.owner_name && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <Clock className="size-3 shrink-0" />
                        Reserved by {spot.active_booking_reserved_by}
                      </p>
                    )}
                </div>
              ) : (
                <div className="min-w-0">
                  <span className="text-muted-foreground text-sm italic">
                    Unassigned
                  </span>
                  {spot.status === 'reserved' &&
                    spot.active_booking_reserved_by && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <Clock className="size-3 shrink-0" />
                        Reserved by {spot.active_booking_reserved_by}
                      </p>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Management accordion (logged-in users) */}
          {user && (
            <div className="rounded-lg border">
              <button
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                onClick={() => setManagementExpanded((v) => !v)}
              >
                <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  Manage spot
                </span>
                {managementExpanded ? (
                  <ChevronUp className="text-muted-foreground size-4" />
                ) : (
                  <ChevronDown className="text-muted-foreground size-4" />
                )}
              </button>

              {managementExpanded && (
                <div className="space-y-5 border-t px-4 pt-4 pb-4">
                  {/* Change status */}
                  <div>
                    <p className="text-muted-foreground mb-2.5 text-xs font-medium tracking-widest uppercase">
                      Status
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_STATUSES.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant="outline"
                          color={STATUS_COLOR[s]}
                          disabled={s === spot.status || isPending}
                          onClick={() => handleStatusChange(s)}
                          className={
                            s === spot.status ? 'cursor-default opacity-40' : ''
                          }
                        >
                          {STATUS_LABELS[s]}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Assign owner */}
                  <div>
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                        {spot.owner_name?.includes('/') ? 'Owners' : 'Owner'}
                      </p>
                      <div className="flex gap-1">
                        {spot.owner_id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive h-7 gap-1.5 text-xs"
                            disabled={isPending}
                            onClick={() => {
                              assignOwner.mutate(
                                { id: spot.id, owner_id: null },
                                {
                                  onSuccess: () =>
                                    notifications.show({
                                      message: `Spot #${spot.number} unassigned`,
                                      color: 'green',
                                    }),
                                  onError: (err) =>
                                    notifications.show({
                                      message:
                                        err instanceof Error
                                          ? err.message
                                          : 'Failed',
                                      color: 'red',
                                    }),
                                },
                              )
                            }}
                          >
                            <X className="size-3" />
                            Unassign
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAssignOpen((v) => !v)
                            setCreateFormOpen(false)
                          }}
                        >
                          {spot.owner_id ? 'Change' : 'Assign'}
                        </Button>
                      </div>
                    </div>

                    {assignOpen && (
                      <div className="space-y-3 rounded-lg border p-3">
                        {!createFormOpen ? (
                          <>
                            <Select
                              data={ownerSelectData}
                              value={selectedOwnerId}
                              onChange={setSelectedOwnerId}
                              placeholder={
                                owners.length === 0
                                  ? 'No owners yet'
                                  : 'Select owner…'
                              }
                              disabled={owners.length === 0}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                disabled={!selectedOwnerId || isPending}
                                onClick={handleAssignConfirm}
                              >
                                Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5"
                                onClick={() => setCreateFormOpen(true)}
                              >
                                <Plus className="size-3" />
                                New owner
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium">New owner</p>
                            <Input
                              placeholder="Name *"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                            />
                            <Input
                              placeholder="Vehicle plate (optional)"
                              value={newPlate}
                              onChange={(e) => setNewPlate(e.target.value)}
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={!newName.trim() || isPending}
                                onClick={handleCreateAndAssign}
                              >
                                Create & Assign
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setCreateFormOpen(false)}
                              >
                                Back
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-border -mx-6 h-px" />

          {/* ── CTA ─────────────────────────────────────────────── */}

          {/* Free spot: reserve (or move reservation here) — today or future only */}
          {spot.status === 'free' &&
            user &&
            isBookableDate &&
            !arrivalWindowPassed && (
              <div className="space-y-3">
                {/* Duration + expiry picker */}
                <div className="bg-muted/50 space-y-2 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Clock className="size-3.5" />
                      From {arrivalTime}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setBookingDuration((d) => Math.max(0.5, d - 0.5))
                        }
                        className="hover:bg-background flex size-6 items-center justify-center rounded border transition-colors"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="w-14 text-center text-sm font-medium">
                        {formatDuration(bookingDuration)}
                      </span>
                      <button
                        onClick={() =>
                          setBookingDuration((d) => Math.min(24, d + 0.5))
                        }
                        className="hover:bg-background flex size-6 items-center justify-center rounded border transition-colors"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-right text-xs">
                    Until {computedExpiryStr}
                  </p>
                </div>

                <Button
                  className="h-11 w-full gap-2 text-[15px] font-semibold"
                  style={{ display: 'flex', justifySelf: 'stretch' }}
                  disabled={bookingPending}
                  onClick={handleBook}
                >
                  {myReservedElsewhere ? (
                    <>
                      <ArrowRightLeft className="size-5" />
                      Move to This Spot
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="size-5" />
                      Reserve Parking Spot
                    </>
                  )}
                </Button>
                {myReservedElsewhere && (
                  <p className="text-muted-foreground text-center text-xs">
                    Spot #{myReservedElsewhere.number} reservation will be
                    cancelled
                  </p>
                )}
              </div>
            )}

          {/* Free spot: arrival window passed for today */}
          {spot.status === 'free' &&
            user &&
            isBookableDate &&
            arrivalWindowPassed && (
              <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
                <Lock className="text-muted-foreground size-4 shrink-0" />
                <p className="text-muted-foreground text-sm">
                  Today&apos;s reservation window has ended — arrival at{' '}
                  {arrivalTime}, until {computedExpiryStr}
                </p>
              </div>
            )}

          {/* Free spot, not logged in or past date */}
          {spot.status === 'free' && (!user || !isBookableDate) && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
              <Lock className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-sm">
                {!isBookableDate
                  ? 'Cannot reserve spots for past dates'
                  : 'Sign in to reserve this spot'}
              </p>
            </div>
          )}

          {/* Reserved — user can cancel or edit interval */}
          {spot.status === 'reserved' && canCancelThisBooking && (
            <div className="space-y-3">
              {spot.active_booking_expires_at && !editingInterval && (
                <button
                  onClick={handleOpenIntervalEdit}
                  className="text-muted-foreground hover:bg-muted/50 group justify-space-between flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-2 text-sm transition-colors"
                >
                  <>
                    <Clock className="mr-0.5 size-3.5 shrink-0" />
                    <ReservationTimer
                      expiresAt={spot.active_booking_expires_at}
                      arrivalTime={
                        spot.active_booking_starts_at
                          ? fmtTime(new Date(spot.active_booking_starts_at))
                          : arrivalTime
                      }
                    />
                  </>
                  <Pencil className="ml-auto size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              )}

              {editingInterval && (
                <div className="bg-muted/50 space-y-3 rounded-lg px-4 py-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                    Adjust interval
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-muted-foreground mb-1 block text-xs">
                        From
                      </label>
                      <input
                        type="time"
                        value={editStart}
                        onChange={(e) => setEditStart(e.target.value)}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      />
                    </div>
                    <span className="text-muted-foreground mt-5">–</span>
                    <div className="flex-1">
                      <label className="text-muted-foreground mb-1 block text-xs">
                        To
                      </label>
                      <input
                        type="time"
                        value={editEnd}
                        onChange={(e) => setEditEnd(e.target.value)}
                        className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                      />
                    </div>
                  </div>
                  {(() => {
                    const [sh, sm] = editStart.split(':').map(Number)
                    const [eh, em] = editEnd.split(':').map(Number)
                    const mins =
                      (eh ?? 0) * 60 + (em ?? 0) - (sh ?? 0) * 60 - (sm ?? 0)
                    if (mins <= 0) return null
                    const dh = Math.floor(mins / 60)
                    const dm = mins % 60
                    return (
                      <p className="text-muted-foreground text-right text-xs">
                        Duration: {dh > 0 ? `${dh}h` : ''}
                        {dm > 0 ? ` ${dm}m` : ''}
                      </p>
                    )
                  })()}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={updateBookingTimes.isPending}
                      onClick={handleSaveInterval}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingInterval(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="text-destructive border-destructive/25 hover:bg-destructive/5 hover:text-destructive h-11 w-full gap-2 text-[15px] font-semibold"
                style={{ display: 'flex', justifySelf: 'stretch' }}
                disabled={bookingPending || updateBookingTimes.isPending}
                onClick={handleCancelBooking}
              >
                <X className="size-5" />
                Cancel Reservation
              </Button>
            </div>
          )}

          {/* Occupied, or reserved by someone else */}
          {(spot.status === 'occupied' ||
            (spot.status === 'reserved' && !canCancelThisBooking)) && (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-3 text-sm">
              {spot.status === 'reserved' && spot.active_booking_expires_at ? (
                <>
                  <Clock className="size-4" />
                  <ReservationTimer
                    expiresAt={spot.active_booking_expires_at}
                    arrivalTime={
                      spot.active_booking_starts_at
                        ? fmtTime(new Date(spot.active_booking_starts_at))
                        : arrivalTime
                    }
                  />
                </>
              ) : (
                <span>{unavailableMsg}</span>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
