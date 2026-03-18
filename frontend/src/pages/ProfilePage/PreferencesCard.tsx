import { Bell, BellOff, Clock, ParkingCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PreferenceRow } from '@/components/PreferenceRow/PreferenceRow'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

// — types —

interface PreferencesCardProps {
  readonly lots: Array<{ readonly id: string; readonly name: string }>
  readonly preferredLotId: string | null
  readonly arrivalTime: string
  readonly reservationDuration: number
  readonly notifyOnBooking: boolean
  readonly notifyOnAvailability: boolean
  readonly onPreferredLotChange: (id: string | null) => void
  readonly onNotifyOnBookingChange: (v: boolean) => void
  readonly onNotifyOnAvailabilityChange: (v: boolean) => void
  readonly onArrivalTimeChange: (v: string) => void
  readonly onReservationDurationChange: (v: number) => void
}

// — main component —

export function PreferencesCard({
  lots,
  preferredLotId,
  arrivalTime,
  reservationDuration,
  notifyOnBooking,
  notifyOnAvailability,
  onPreferredLotChange,
  onNotifyOnBookingChange,
  onNotifyOnAvailabilityChange,
  onArrivalTimeChange,
  onReservationDurationChange,
}: PreferencesCardProps) {
  const { t } = useTranslation()

  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="border-b px-5 py-3">
        <h3 className="text-sm font-semibold">{t('profile.preferences')}</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t('profile.prefsSavedLocally')}
        </p>
      </div>
      <div className="divide-y px-5">
        <div className="py-4">
          <PreferenceRow
            icon={Bell}
            title={t('profile.notifyOnBooking')}
            description={t('profile.notifyOnBookingDesc')}
          >
            <Switch
              checked={notifyOnBooking}
              onCheckedChange={onNotifyOnBookingChange}
            />
          </PreferenceRow>
        </div>
        <div className="py-4">
          <PreferenceRow
            icon={BellOff}
            title={t('profile.notifyOnAvailability')}
            description={t('profile.notifyOnAvailabilityDesc')}
          >
            <Switch
              checked={notifyOnAvailability}
              onCheckedChange={onNotifyOnAvailabilityChange}
            />
          </PreferenceRow>
        </div>
        {lots.length > 0 && (
          <div className="py-4">
            <PreferenceRow
              icon={ParkingCircle}
              title={t('profile.preferredLot')}
              description={t('profile.preferredLotDesc')}
            >
              <Select
                value={preferredLotId ?? ''}
                onChange={(v) => onPreferredLotChange(v ?? null)}
                clearable
                placeholder={t('profile.anyLot')}
                className="w-36 text-xs"
                data={lots.map((lot) => ({ value: lot.id, label: lot.name }))}
              />
            </PreferenceRow>
          </div>
        )}
        <div className="py-4">
          <PreferenceRow
            icon={Clock}
            title={t('profile.arrivalTime')}
            description={t('profile.arrivalTimeDesc')}
          >
            <input
              type="time"
              value={arrivalTime}
              onChange={(e) => onArrivalTimeChange(e.target.value)}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            />
          </PreferenceRow>
        </div>
        <div className="py-4">
          <PreferenceRow
            icon={Clock}
            title={t('profile.reservationDuration')}
            description={t('profile.reservationDurationDesc')}
          >
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0.5}
                max={24}
                step={0.5}
                value={reservationDuration}
                onChange={(e) =>
                  onReservationDurationChange(
                    Number.parseFloat(e.target.value) || 8,
                  )
                }
                className="border-input bg-background h-9 w-16 rounded-md border px-3 text-sm"
              />
              <span className="text-muted-foreground text-sm">h</span>
            </div>
          </PreferenceRow>
        </div>
      </div>
    </div>
  )
}
