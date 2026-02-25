import { useState } from 'react'
import { Car, User, MapPin, CalendarPlus, Plus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUIStore } from '@/store/uiStore'
import { useParkingStore } from '@/store/parkingStore'
import { useSpots, useAssignOwner, useUpdateStatus } from '@/hooks/useSpots'
import { useOwners, useCreateOwner } from '@/hooks/useOwners'
import { useCreateBooking } from '@/hooks/useBookings'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import type { SpotStatus } from '@/types'

const STATUS_LABELS: Record<SpotStatus, string> = {
  free: 'Free',
  occupied: 'Occupied',
  reserved: 'Reserved',
}

const STATUS_BADGE: Record<SpotStatus, string> = {
  free: 'bg-spot-free text-white border-transparent',
  occupied: 'bg-spot-occupied text-white border-transparent',
  reserved: 'bg-spot-reserved text-white border-transparent',
}

const STATUS_BTN: Record<SpotStatus, string> = {
  free: 'border-spot-free text-spot-free hover:bg-spot-free/10',
  occupied: 'border-spot-occupied text-spot-occupied hover:bg-spot-occupied/10',
  reserved: 'border-spot-reserved text-spot-reserved hover:bg-spot-reserved/10',
}

const ALL_STATUSES: SpotStatus[] = ['free', 'occupied', 'reserved']

export function SpotModal() {
  const open = useUIStore((s) => s.spotModalOpen)
  const setOpen = useUIStore((s) => s.setSpotModalOpen)
  const selectedSpot = useParkingStore((s) => s.selectedSpot)
  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)

  // Always read fresh data by id
  const { data: allSpots = [] } = useSpots()
  const spot = allSpots.find((s) => s.id === selectedSpot?.id) ?? selectedSpot

  const { data: owners = [] } = useOwners()
  const assignOwner = useAssignOwner()
  const updateStatus = useUpdateStatus()
  const createOwner = useCreateOwner()
  const createBooking = useCreateBooking()
  const user = useAuthStore((s) => s.user)

  // Assign section state
  const [assignOpen, setAssignOpen] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPlate, setNewPlate] = useState('')

  function resetLocal() {
    setAssignOpen(false)
    setSelectedOwnerId('')
    setCreateFormOpen(false)
    setNewName('')
    setNewPlate('')
  }

  function handleClose() {
    setOpen(false)
    setSelectedSpot(null)
    resetLocal()
  }

  function handleStatusChange(status: SpotStatus) {
    if (!spot) return
    updateStatus.mutate(
      { id: spot.id, status },
      {
        onSuccess: () =>
          toast.success(
            `Spot #${spot.number} marked as ${STATUS_LABELS[status]}`,
          ),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to update status',
          ),
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
          toast.success(
            ownerId
              ? `Owner assigned to spot #${spot.number}`
              : `Spot #${spot.number} unassigned`,
          )
          resetLocal()
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to assign owner',
          ),
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
                toast.success(
                  `Owner "${owner.name}" created and assigned to spot #${spot.number}`,
                )
                resetLocal()
              },
              onError: (err) =>
                toast.error(
                  err instanceof Error ? err.message : 'Failed to assign',
                ),
            },
          )
        },
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : 'Failed to create owner',
          ),
      },
    )
  }

  function handleBook() {
    if (!spot) return
    createBooking.mutate(spot.id, {
      onSuccess: () =>
        toast.success(`Spot #${spot.number} booked! Reserved for 8 hours.`),
      onError: (err) =>
        toast.error(err instanceof Error ? err.message : 'Booking failed'),
    })
  }

  if (!spot) return null

  const isPending =
    assignOwner.isPending || updateStatus.isPending || createOwner.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl font-bold">#{spot.number}</span>
            {spot.label && (
              <span className="text-muted-foreground text-base font-normal">
                {spot.label}
              </span>
            )}
            <Badge className={`ml-auto ${STATUS_BADGE[spot.status]}`}>
              {STATUS_LABELS[spot.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Floor */}
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <MapPin className="size-3.5" />
            <span>{spot.floor}</span>
          </div>

          {/* Owner info */}
          <div className="rounded-lg border p-3">
            {spot.owner_name ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="size-3.5" />
                  <span>{spot.owner_name}</span>
                </div>
                {spot.owner_vehicle_plate && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <Car className="size-3.5" />
                    <span>{spot.owner_vehicle_plate}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No owner assigned
              </p>
            )}
          </div>

          {/* Status buttons */}
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
              Change status
            </p>
            <div className="flex gap-2">
              {ALL_STATUSES.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  disabled={s === spot.status || isPending}
                  onClick={() => handleStatusChange(s)}
                  className={
                    s !== spot.status
                      ? STATUS_BTN[s]
                      : 'cursor-default opacity-40'
                  }
                >
                  {STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
          </div>

          {/* Assign owner section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Owner
              </p>
              <div className="flex gap-2">
                {spot.owner_id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 text-xs"
                    disabled={isPending}
                    onClick={() => {
                      assignOwner.mutate(
                        { id: spot.id, owner_id: null },
                        {
                          onSuccess: () =>
                            toast.success(`Spot #${spot.number} unassigned`),
                          onError: (err) =>
                            toast.error(
                              err instanceof Error ? err.message : 'Failed',
                            ),
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
                  {spot.owner_id ? 'Change owner' : 'Assign owner'}
                </Button>
              </div>
            </div>

            {assignOpen && (
              <div className="space-y-3 rounded-lg border p-3">
                {!createFormOpen ? (
                  <>
                    <Select
                      value={selectedOwnerId}
                      onValueChange={setSelectedOwnerId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select owner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {owners.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                            {o.vehicle_plate && (
                              <span className="text-muted-foreground ml-1.5">
                                ({o.vehicle_plate})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                        {owners.length === 0 && (
                          <SelectItem value="__empty__" disabled>
                            No owners yet
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
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
                        Create new owner
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
                    <div className="flex gap-2">
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

          {/* Book spot */}
          {user && spot.status === 'free' && (
            <Button
              className="w-full gap-2"
              disabled={createBooking.isPending}
              onClick={handleBook}
            >
              <CalendarPlus className="size-4" />
              Book this spot
            </Button>
          )}
          {!user && spot.status === 'free' && (
            <p className="text-muted-foreground text-center text-xs">
              Sign in to book this spot
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
