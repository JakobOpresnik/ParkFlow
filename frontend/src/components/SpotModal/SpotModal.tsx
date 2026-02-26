import { useState } from 'react'
import {
  Car,
  User,
  MapPin,
  CalendarCheck,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useUIStore } from '@/store/uiStore'
import { useParkingStore } from '@/store/parkingStore'
import { useSpots, useAssignOwner, useUpdateStatus } from '@/hooks/useSpots'
import { useOwners, useCreateOwner } from '@/hooks/useOwners'
import { useCreateBooking, useCancelBooking } from '@/hooks/useBookings'
import { useAuthStore } from '@/store/authStore'
import { notifications } from '@mantine/notifications'
import type { SpotStatus } from '@/types'

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

  const { data: allSpots = [] } = useSpots()
  const spot = allSpots.find((s) => s.id === selectedSpot?.id) ?? selectedSpot

  const { data: owners = [] } = useOwners()
  const assignOwner = useAssignOwner()
  const updateStatus = useUpdateStatus()
  const createOwner = useCreateOwner()
  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const user = useAuthStore((s) => s.user)

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
  }

  function handleClose() {
    setOpen(false)
    setSelectedSpot(null)
    resetLocal()
  }

  // Spot the current user has reserved elsewhere (for auto-cancel on new reserve)
  const myReservedElsewhere =
    user
      ? allSpots.find(
          (s) =>
            s.active_booking_user_id === user.id &&
            s.active_booking_id !== null &&
            s.id !== spot?.id,
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
    if (!spot) return

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
      await createBooking.mutateAsync(spot.id)
      notifications.show({
        message: myReservedElsewhere
          ? `Moved to spot #${spot.number} — spot #${myReservedElsewhere.number} reservation cancelled.`
          : `Spot #${spot.number} reserved! Valid for 8 hours.`,
        color: 'green',
      })
    } catch (err) {
      notifications.show({
        message: err instanceof Error ? err.message : 'Booking failed',
        color: 'red',
      })
    }
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
        <div className="px-6 pt-6 pb-5 pr-14">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            Parking Spot
          </p>
          <div className="flex items-start justify-between gap-4">
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
            <Badge color={STATUS_COLOR[spot.status]} className="mt-1 shrink-0">
              {STATUS_LABELS[spot.status]}
            </Badge>
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
                className={`text-sm font-semibold leading-snug ${banner.text}`}
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
              <span className="text-muted-foreground w-10 shrink-0 text-sm">
                Floor
              </span>
              <span className="text-sm font-medium">{spot.floor}</span>
            </div>
            <div className="flex items-start gap-3 px-4 py-3">
              <User className="text-muted-foreground mt-0.5 size-4 shrink-0" />
              <span className="text-muted-foreground w-10 shrink-0 text-sm">
                Owner
              </span>
              {spot.owner_name ? (
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {spot.owner_name}
                  </p>
                  {spot.owner_vehicle_plate && (
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                      <Car className="size-3" />
                      {spot.owner_vehicle_plate}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground text-sm italic">
                  Unassigned
                </span>
              )}
            </div>
          </div>

          {/* ── CTA section ─────────────────────────────────────── */}

          {/* Free spot: reserve (or move reservation here) */}
          {spot.status === 'free' && user && (
            <div className="space-y-2">
              <Button
                className="h-11 w-full gap-2 text-[15px] font-semibold"
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

          {/* Free spot, not logged in */}
          {spot.status === 'free' && !user && (
            <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
              <Lock className="text-muted-foreground size-4 shrink-0" />
              <p className="text-muted-foreground text-sm">
                Sign in to reserve this spot
              </p>
            </div>
          )}

          {/* Reserved — user can cancel (their own booking, or admin cancelling any) */}
          {spot.status === 'reserved' && canCancelThisBooking && (
            <Button
              variant="outline"
              className="text-destructive border-destructive/25 hover:bg-destructive/5 hover:text-destructive h-11 w-full gap-2 text-[15px] font-semibold"
              disabled={bookingPending}
              onClick={handleCancelBooking}
            >
              <X className="size-5" />
              Cancel Reservation
            </Button>
          )}

          {/* Occupied, or reserved by someone else */}
          {(spot.status === 'occupied' ||
            (spot.status === 'reserved' && !canCancelThisBooking)) && (
            <div className="text-muted-foreground flex items-center justify-center rounded-lg border border-dashed py-3 text-sm">
              {spot.status === 'occupied'
                ? 'Spot unavailable — currently occupied'
                : 'Spot unavailable — already reserved'}
            </div>
          )}

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
                <div className="space-y-5 border-t px-4 pb-4 pt-4">
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
                            s === spot.status
                              ? 'cursor-default opacity-40'
                              : ''
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
                        Owner
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
