import { Tooltip } from '@mantine/core'
import { Car, Check, Clock, MapPin, User, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useLotName } from '@/hooks/useLotName'
import type { Spot, SpotType } from '@/types'

// — types —

interface DetailsCardProps {
  readonly spot: Spot
  readonly currentUserDisplayName?: string
  readonly isGuest?: boolean
}

// — constants —

const SPOT_TYPE_ICONS: Partial<Record<SpotType, string>> = {
  ev: '⚡',
  handicap: '♿',
  compact: '🅿',
}

const SPOT_TYPE_LABEL_KEYS: Partial<Record<SpotType, string>> = {
  ev: 'spotModal.evCharging',
  handicap: 'spotModal.handicapAccessible',
  compact: 'spotModal.compact',
}

// — main component —

export function DetailsCard({
  spot,
  currentUserDisplayName,
  isGuest = false,
}: DetailsCardProps) {
  const { t } = useTranslation()
  const tLot = useLotName()

  const icon = spot.type ? SPOT_TYPE_ICONS[spot.type] : undefined
  const labelKey = spot.type ? SPOT_TYPE_LABEL_KEYS[spot.type] : undefined
  const typeInfo = icon && labelKey ? { icon, label: t(labelKey) } : undefined
  const reservedByDisplay =
    isGuest && spot.active_booking_reserved_by
      ? t('spotModal.anonymizedReserver')
      : spot.active_booking_reserved_by
  const isReservedByOther =
    spot.status === 'reserved' &&
    spot.active_booking_reserved_by &&
    spot.active_booking_reserved_by !== spot.owner_name

  return (
    <div className="divide-y rounded-lg border">
      <div className="flex items-center gap-3 px-4 py-3">
        <MapPin className="text-muted-foreground size-4 shrink-0" />
        <span className="text-muted-foreground w-20 shrink-0 text-sm">
          {t('spotModal.floor')}
        </span>
        <span className="text-sm font-medium">{tLot(spot.floor)}</span>
      </div>

      {typeInfo && (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="size-4 shrink-0 text-center text-sm">
            {typeInfo.icon}
          </span>
          <span className="text-muted-foreground w-20 shrink-0 text-sm">
            {t('spotModal.type')}
          </span>
          <span className="text-sm font-medium">{typeInfo.label}</span>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3">
        <User className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <span className="text-muted-foreground w-20 shrink-0 text-sm whitespace-nowrap">
          {t('spotModal.owner')}
        </span>
        {spot.owner_name ? (
          <div className="min-w-0">
            {(() => {
              const ownerName = spot.owner_name.trim()
              const lower = ownerName.toLowerCase()
              const isInOffice = isGuest
                ? spot.in_office_owner_index === 0
                : spot.in_office_owner?.toLowerCase() === lower
              const isAway = isGuest
                ? (spot.away_owner_indices ?? []).includes(0)
                : (spot.away_owners ?? []).some(
                    (n) => n.toLowerCase() === lower,
                  )
              const isCurrentUser =
                !isGuest &&
                !!currentUserDisplayName &&
                currentUserDisplayName.toLowerCase() === lower
              let displayName = ownerName
              if (isCurrentUser) displayName = t('spotModal.you')
              else if (isGuest) displayName = t('spotModal.anonymizedOwner')

              return (
                <p className="flex items-center gap-1.5 text-sm leading-snug font-medium">
                  {displayName}
                  {isInOffice && (
                    <Tooltip
                      label={t('spotModal.inOfficeTooltip')}
                      position="top"
                      withArrow
                      events={{ hover: true, focus: true, touch: true }}
                    >
                      <span className="text-spot-occupied bg-spot-occupied/10 inline-flex h-5 cursor-default items-center gap-1 rounded-full px-2 pt-px text-xs leading-none font-medium">
                        <Check className="size-3 shrink-0" />
                        {t('spotModal.inOffice')}
                      </span>
                    </Tooltip>
                  )}
                  {isAway && (
                    <Tooltip
                      label={t('spotModal.notInOfficeTooltip')}
                      position="top"
                      withArrow
                      events={{ hover: true, focus: true, touch: true }}
                    >
                      <span className="text-destructive bg-destructive/10 inline-flex h-5 cursor-default items-center gap-1 rounded-full px-2 pt-px text-xs leading-none font-medium">
                        <X className="size-3 shrink-0" />
                        {t('spotModal.notInOffice')}
                      </span>
                    </Tooltip>
                  )}
                </p>
              )
            })()}
            {spot.owner_vehicle_plate && !isGuest && (
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                <Car className="size-3" />
                {spot.owner_vehicle_plate}
              </p>
            )}
            {isReservedByOther && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="size-3 shrink-0" />
                {t('spotModal.reservedBy', { name: reservedByDisplay })}
              </p>
            )}
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-muted-foreground text-sm leading-snug italic">
              {t('spotModal.unassigned')}
            </p>
            {spot.status === 'reserved' && spot.active_booking_reserved_by && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="size-3 shrink-0" />
                {t('spotModal.reservedBy', { name: reservedByDisplay })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
