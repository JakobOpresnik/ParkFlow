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

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useAuthStore } from '@/store/authStore'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'
import { useUIStore } from '@/store/uiStore'
import type { Spot, SpotStatus, SpotType } from '@/types'

import { ReservationTimer } from '../ReservationTimer'
import { fmtTime, useBookingCta } from './useBookingCta'
import { useManagementAccordion } from './useManagementAccordion'

// — types —

interface StatusConfigDetails {
  readonly label: string
  readonly color: string
  readonly bg: string
  readonly text: string
  readonly icon: React.ReactNode
}

interface StatusBannerProps {
  readonly status: SpotStatus
  readonly subtext: string
}

interface DetailsCardProps {
  readonly spot: Spot
}

interface DurationPickerProps {
  readonly duration: number
  readonly onChange: (d: number) => void
  readonly arrivalTime: string
  readonly expiryStr: string
}

interface IntervalEditorProps {
  readonly editStart: string
  readonly editEnd: string
  readonly onChangeStart: (v: string) => void
  readonly onChangeEnd: (v: string) => void
  readonly onSave: () => void
  readonly onCancel: () => void
  readonly isPending: boolean
}

interface BookingCtaProps {
  readonly spot: Spot
  readonly user: { id: string; role: string } | null
  readonly selectedDate: string
  readonly arrivalTime: string
  readonly reservationDuration: number
  readonly myReservedElsewhere: Spot | undefined
  readonly canCancelThisBooking: boolean
}

interface ManagementAccordionProps {
  readonly spot: Spot
}

// — constants —

const SPOT_TYPE_INFO: Partial<
  Record<SpotType, { icon: string; label: string }>
> = {
  ev: { icon: '⚡', label: 'EV Charging' },
  handicap: { icon: '♿', label: 'Handicap Accessible' },
  compact: { icon: '🅿', label: 'Compact' },
}

const STATUS_CONFIG: Record<SpotStatus, StatusConfigDetails> = {
  free: {
    label: 'Available',
    color: 'green',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle2 className="size-4 shrink-0" />,
  },
  occupied: {
    label: 'Occupied',
    color: 'red',
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    icon: <XCircle className="size-4 shrink-0" />,
  },
  reserved: {
    label: 'Reserved',
    color: 'yellow',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    icon: <Clock className="size-4 shrink-0" />,
  },
}

const ALL_STATUSES: SpotStatus[] = ['free', 'occupied', 'reserved']

// — helpers —

function formatDuration(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Returns a formatted duration string from two HH:MM strings, or null if end <= start. */
function formatIntervalDuration(start: string, end: string): string | null {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const mins = (eh ?? 0) * 60 + (em ?? 0) - (sh ?? 0) * 60 - (sm ?? 0)
  if (mins <= 0) return null
  const dh = Math.floor(mins / 60)
  const dm = mins % 60
  return `${dh > 0 ? `${dh}h` : ''}${dm > 0 ? ` ${dm}m` : ''}`.trim()
}

function buildBannerSubtext(
  spot: Spot,
  myReservedElsewhere: Spot | undefined,
  canCancelThisBooking: boolean,
): string {
  if (spot.status === 'free') {
    return myReservedElsewhere
      ? `You have spot #${myReservedElsewhere.number} reserved. Moving here will cancel it.`
      : 'This spot is open and ready to reserve.'
  }
  if (spot.status === 'reserved') {
    return canCancelThisBooking
      ? 'You have reserved this spot.'
      : 'This spot has already been reserved.'
  }
  return spot.owner_name
    ? 'This spot is currently in use by the owner.'
    : 'This spot is currently in use.'
}

// — sub-components —

function StatusBanner({ status, subtext }: StatusBannerProps) {
  const config = STATUS_CONFIG[status]
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${config.bg}`}
    >
      <span className={config.text}>{config.icon}</span>
      <div>
        <p className={`text-sm leading-snug font-semibold ${config.text}`}>
          {config.label}
        </p>
        <p className="text-muted-foreground text-xs">{subtext}</p>
      </div>
    </div>
  )
}

function DetailsCard({ spot }: DetailsCardProps) {
  const typeInfo = spot.type ? SPOT_TYPE_INFO[spot.type] : undefined
  const isReservedByOther =
    spot.status === 'reserved' &&
    spot.active_booking_reserved_by &&
    spot.active_booking_reserved_by !== spot.owner_name

  return (
    <div className="divide-y rounded-lg border">
      <div className="flex items-center gap-3 px-4 py-3">
        <MapPin className="text-muted-foreground size-4 shrink-0" />
        <span className="text-muted-foreground width-14 w-14 shrink-0 text-sm">
          Floor
        </span>
        <span className="text-sm font-medium">{spot.floor}</span>
      </div>

      {typeInfo && (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="size-4 shrink-0 text-center text-sm">
            {typeInfo.icon}
          </span>
          <span className="text-muted-foreground w-14 shrink-0 text-sm">
            Type
          </span>
          <span className="text-sm font-medium">{typeInfo.label}</span>
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
            {isReservedByOther && (
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
            {spot.status === 'reserved' && spot.active_booking_reserved_by && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="size-3 shrink-0" />
                Reserved by {spot.active_booking_reserved_by}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DurationPicker({
  duration,
  onChange,
  arrivalTime,
  expiryStr,
}: DurationPickerProps) {
  return (
    <div className="bg-muted/50 space-y-2 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock className="size-3.5" />
          From {arrivalTime}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange(Math.max(0.5, duration - 0.5))}
            className="hover:bg-background flex size-6 items-center justify-center rounded border transition-colors"
          >
            <Minus className="size-3" />
          </button>
          <span className="w-14 text-center text-sm font-medium">
            {formatDuration(duration)}
          </span>
          <button
            onClick={() => onChange(Math.min(24, duration + 0.5))}
            className="hover:bg-background flex size-6 items-center justify-center rounded border transition-colors"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>
      <p className="text-muted-foreground text-right text-xs">
        Until {expiryStr}
      </p>
    </div>
  )
}

function IntervalEditor({
  editStart,
  editEnd,
  onChangeStart,
  onChangeEnd,
  onSave,
  onCancel,
  isPending,
}: IntervalEditorProps) {
  const durationLabel = formatIntervalDuration(editStart, editEnd)
  return (
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
            onChange={(e) => onChangeStart(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          />
        </div>
        <span className="text-muted-foreground mt-5">–</span>
        <div className="flex-1">
          <label className="text-muted-foreground mb-1 block text-xs">To</label>
          <input
            type="time"
            value={editEnd}
            onChange={(e) => onChangeEnd(e.target.value)}
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          />
        </div>
      </div>
      {durationLabel && (
        <p className="text-muted-foreground text-right text-xs">
          Duration: {durationLabel}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          disabled={isPending}
          onClick={onSave}
        >
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function BookingCta({
  spot,
  user,
  selectedDate,
  arrivalTime,
  reservationDuration,
  myReservedElsewhere,
  canCancelThisBooking,
}: BookingCtaProps) {
  const {
    bookingDuration,
    setBookingDuration,
    editingInterval,
    setEditingInterval,
    editStart,
    setEditStart,
    editEnd,
    setEditEnd,
    isBookableDate,
    computedExpiryStr,
    arrivalWindowPassed,
    bookingPending,
    updateBookingTimesPending,
    unavailableMsg,
    handleBook,
    handleOpenIntervalEdit,
    handleSaveInterval,
    handleCancelBooking,
  } = useBookingCta(spot, {
    selectedDate,
    arrivalTime,
    reservationDuration,
    myReservedElsewhere,
  })

  const canReserveNow =
    spot.status === 'free' && !!user && isBookableDate && !arrivalWindowPassed
  const freeWindowExpired =
    spot.status === 'free' && !!user && isBookableDate && arrivalWindowPassed
  const freeButUnavailable =
    spot.status === 'free' && (!user || !isBookableDate)
  const isUnavailableSpot =
    spot.status === 'occupied' ||
    (spot.status === 'reserved' && !canCancelThisBooking)

  return (
    <>
      {/* Free spot: reserve (or move reservation here) — today or future only */}
      {canReserveNow && (
        <div className="space-y-3">
          <DurationPicker
            duration={bookingDuration}
            onChange={setBookingDuration}
            arrivalTime={arrivalTime}
            expiryStr={computedExpiryStr}
          />
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
              Spot #{myReservedElsewhere.number} reservation will be cancelled
            </p>
          )}
        </div>
      )}

      {/* Free spot: arrival window passed for today */}
      {freeWindowExpired && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-3">
          <Lock className="text-muted-foreground size-4 shrink-0" />
          <p className="text-muted-foreground text-sm">
            Today&apos;s reservation window has ended — arrival at {arrivalTime}
            , until {computedExpiryStr}
          </p>
        </div>
      )}

      {/* Free spot, not logged in or past date */}
      {freeButUnavailable && (
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
            <IntervalEditor
              editStart={editStart}
              editEnd={editEnd}
              onChangeStart={setEditStart}
              onChangeEnd={setEditEnd}
              onSave={handleSaveInterval}
              onCancel={() => setEditingInterval(false)}
              isPending={updateBookingTimesPending}
            />
          )}

          <Button
            variant="outline"
            className="text-destructive border-destructive/25 hover:bg-destructive/5 hover:text-destructive h-11 w-full gap-2 text-[15px] font-semibold"
            style={{ display: 'flex', justifySelf: 'stretch' }}
            disabled={bookingPending || updateBookingTimesPending}
            onClick={handleCancelBooking}
          >
            <X className="size-5" />
            Cancel Reservation
          </Button>
        </div>
      )}

      {/* Occupied, or reserved by someone else */}
      {isUnavailableSpot && (
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
    </>
  )
}

function ManagementAccordion({ spot }: ManagementAccordionProps) {
  const {
    expanded,
    setExpanded,
    assignOpen,
    setAssignOpen,
    selectedOwnerId,
    setSelectedOwnerId,
    createFormOpen,
    setCreateFormOpen,
    newName,
    setNewName,
    newPlate,
    setNewPlate,
    owners,
    ownerSelectData,
    isPending,
    handleStatusChange,
    handleUnassign,
    handleAssignConfirm,
    handleCreateAndAssign,
  } = useManagementAccordion(spot)

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Manage spot
        </span>
        {expanded ? (
          <ChevronUp className="text-muted-foreground size-4" />
        ) : (
          <ChevronDown className="text-muted-foreground size-4" />
        )}
      </button>

      {expanded && (
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
                  color={STATUS_CONFIG[s].color}
                  disabled={s === spot.status || isPending}
                  onClick={() => handleStatusChange(s)}
                  className={
                    s === spot.status ? 'cursor-default opacity-40' : ''
                  }
                >
                  {STATUS_CONFIG[s].label}
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
                    onClick={handleUnassign}
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
                        owners.length === 0 ? 'No owners yet' : 'Select owner…'
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
  )
}

// — main component —

export function SpotModal() {
  const open = useUIStore((s) => s.spotModalOpen)
  const setOpen = useUIStore((s) => s.setSpotModalOpen)
  const selectedSpot = useParkingStore((s) => s.selectedSpot)
  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)
  const selectedDate = useUIStore((s) => s.selectedDate)

  const { data: allSpots = [] } = useEffectiveSpots(selectedDate)
  const spot = allSpots.find((s) => s.id === selectedSpot?.id) ?? selectedSpot

  const user = useAuthStore((s) => s.user)
  const arrivalTime = usePrefsStore((s) => s.arrivalTime)
  const reservationDuration = usePrefsStore((s) => s.reservationDuration)

  function handleClose() {
    setOpen(false)
    setSelectedSpot(null)
  }

  if (!spot) return null

  // Spot the current user has reserved elsewhere ON THE SAME DAY (for auto-cancel on new reserve).
  // Reservations on other days are independent and must not be affected.
  const myReservedElsewhere = user
    ? allSpots.find(
        (s) =>
          s.active_booking_user_id === user.id &&
          s.active_booking_id !== null &&
          s.id !== spot.id &&
          s.active_booking_expires_at?.slice(0, 10) === selectedDate,
      )
    : undefined

  // Whether the logged-in user (or admin) can cancel this spot's active booking
  const canCancelThisBooking =
    !!spot.active_booking_id &&
    !!user &&
    (spot.active_booking_user_id === user.id || user.role === 'admin')

  const bannerSubtext = buildBannerSubtext(
    spot,
    myReservedElsewhere,
    canCancelThisBooking,
  )

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
          <StatusBanner status={spot.status} subtext={bannerSubtext} />
          <DetailsCard spot={spot} />

          {/* Management accordion (logged-in users) */}
          {user && <ManagementAccordion spot={spot} />}

          <div className="bg-border -mx-6 h-px" />

          {/* ── CTA ─────────────────────────────────────────────── */}
          <BookingCta
            spot={spot}
            user={user}
            selectedDate={selectedDate}
            arrivalTime={arrivalTime}
            reservationDuration={reservationDuration}
            myReservedElsewhere={myReservedElsewhere}
            canCancelThisBooking={canCancelThisBooking}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
