import {
  ArrowRightLeft,
  ChevronUp,
  Clock,
  DoorOpen,
  History,
  RotateCcw,
  ShieldX,
  User,
  UserCheck,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

import type { SpotCardProps } from './types'
import { formatDateTime, StatusConfig } from './utils'

export function SpotCard({
  spot,
  status,
  isOverridden,
  isNonWorkDay,
  isPastCutoff,
  switchedToSpotNumber,
  onSetDayStatus,
  onClearOverride,
  onCancelBooking,
  onToggleHistory,
  isHistoryOpen,
  isToggling,
  isCancelling,
}: SpotCardProps) {
  const { color, label, border } = StatusConfig[status]
  const canModifyStatus = !isToggling && !isNonWorkDay && !isPastCutoff

  return (
    <div className={`bg-card overflow-hidden rounded-2xl border ${border}`}>
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
            <Badge color={color} variant="secondary">
              {label}
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
          aria-label={isHistoryOpen ? 'Zapri zgodovino' : 'Prikaži zgodovino'}
          className="text-muted-foreground hover:bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
        >
          {isHistoryOpen ? (
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

      {/* Actions */}
      <div className="flex gap-2 border-t p-3">
        {status === 'occupied' && (
          <Button
            onClick={() => onSetDayStatus('free')}
            disabled={!canModifyStatus}
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
            disabled={!canModifyStatus}
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
            disabled={!canModifyStatus}
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
