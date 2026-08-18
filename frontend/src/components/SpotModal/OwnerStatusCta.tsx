import { CircleSlash, DoorOpen, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useOwnerOverrides } from '@/hooks/useOwnerParking'
import { usePresence } from '@/hooks/usePresence'
import { DurationMenu } from '@/pages/OwnerParkingPage/DurationMenu'
import { useOwnerParkingActions } from '@/pages/OwnerParkingPage/useOwnerParkingActions'
import {
  findOverrideForDay,
  isNonWorkDay,
  isPastBookingCutoff,
} from '@/pages/OwnerParkingPage/utils'
import type { Spot } from '@/types'

// — types —

interface OwnerStatusCtaProps {
  readonly spot: Spot
  readonly selectedDate: string
}

// — main component —

// The owner's availability controls, mirroring /my-parking's SpotCard actions.
export function OwnerStatusCta({ spot, selectedDate }: OwnerStatusCtaProps) {
  const { t } = useTranslation()
  const presence = usePresence(selectedDate)
  const overrides = useOwnerOverrides(selectedDate, selectedDate)
  const { handleSetDayStatus, handleClearOverride, isToggling } =
    useOwnerParkingActions(selectedDate)

  // A real booking for this day governs the spot — cancel flows handle that.
  if (spot.active_booking_id && spot.active_booking_date === selectedDate) {
    return null
  }

  const today = new Date().toISOString().slice(0, 10)
  const workFreeDays = presence.data?.work_free_days ?? []
  const canModify =
    !isToggling &&
    !isNonWorkDay(selectedDate, today, workFreeDays) &&
    !isPastBookingCutoff(selectedDate, today)

  const override = findOverrideForDay(
    spot.id,
    selectedDate,
    overrides.data ?? [],
  )
  // An 'occupied' override surfaces as effective 'reserved', so read the
  // override first and only fall back to the effective status without one.
  const isUnavailable = override
    ? override.status === 'occupied'
    : spot.status === 'occupied'

  return (
    <div className="flex gap-2">
      <DurationMenu
        onSelect={(duration) =>
          handleSetDayStatus(
            spot,
            isUnavailable ? 'free' : 'occupied',
            duration,
          )
        }
        target={
          <Button
            variant="outline"
            disabled={!canModify}
            className="h-11 flex-1 gap-2 text-[15px] font-semibold"
            style={{ display: 'flex' }}
          >
            {isUnavailable ? (
              <DoorOpen className="size-5" />
            ) : (
              <CircleSlash className="size-5" />
            )}
            {t(
              isUnavailable
                ? 'ownerParking.freeSpot'
                : 'ownerParking.occupySpot',
            )}
          </Button>
        }
      />
      {override && (
        <Button
          variant="ghost"
          disabled={!canModify}
          onClick={() => handleClearOverride(spot, override.date === null)}
          className="text-muted-foreground h-11 shrink-0 gap-2 px-4 text-sm"
          style={{ display: 'flex' }}
        >
          <RotateCcw className="size-4" />
          {t('ownerParking.resetStatus')}
        </Button>
      )}
    </div>
  )
}
