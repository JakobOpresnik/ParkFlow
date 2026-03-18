import { Car, Clock, MapPin, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { Spot, SpotType } from '@/types'

// — types —

interface DetailsCardProps {
  readonly spot: Spot
  readonly isCurrentUserOwner?: boolean
}

// — main component —

export function DetailsCard({ spot, isCurrentUserOwner }: DetailsCardProps) {
  const { t } = useTranslation()

  const SPOT_TYPE_INFO: Partial<
    Record<SpotType, { icon: string; label: string }>
  > = {
    ev: { icon: '⚡', label: t('spotModal.evCharging') },
    handicap: { icon: '♿', label: t('spotModal.handicapAccessible') },
    compact: { icon: '🅿', label: t('spotModal.compact') },
  }

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
          {t('spotModal.floor')}
        </span>
        <span className="text-sm font-medium">{spot.floor}</span>
      </div>

      {typeInfo && (
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="size-4 shrink-0 text-center text-sm">
            {typeInfo.icon}
          </span>
          <span className="text-muted-foreground w-14 shrink-0 text-sm">
            {t('spotModal.type')}
          </span>
          <span className="text-sm font-medium">{typeInfo.label}</span>
        </div>
      )}

      <div className="flex items-start gap-3 px-4 py-3">
        <User className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <span className="text-muted-foreground w-14 shrink-0 text-sm">
          {spot.owner_name?.includes('/')
            ? t('spotModal.owners')
            : t('spotModal.owner')}
        </span>
        {spot.owner_name ? (
          <div className="min-w-0">
            {isCurrentUserOwner ? (
              <p className="text-sm leading-snug font-medium">
                {t('spotModal.you')}
              </p>
            ) : (
              spot.owner_name.split('/').map((name) => {
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
                        {t('spotModal.inOffice')}
                      </span>
                    )}
                  </p>
                )
              })
            )}
            {spot.owner_vehicle_plate && (
              <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                <Car className="size-3" />
                {spot.owner_vehicle_plate}
              </p>
            )}
            {isReservedByOther && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="size-3 shrink-0" />
                {t('spotModal.reservedBy', {
                  name: spot.active_booking_reserved_by,
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="min-w-0">
            <span className="text-muted-foreground text-sm italic">
              {t('spotModal.unassigned')}
            </span>
            {spot.status === 'reserved' && spot.active_booking_reserved_by && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="size-3 shrink-0" />
                {t('spotModal.reservedBy', {
                  name: spot.active_booking_reserved_by,
                })}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
