import { Bell, BellOff, Clock, ParkingCircle } from 'lucide-react'

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
  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="border-b px-5 py-3">
        <h3 className="text-sm font-semibold">Preferences</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Saved locally on this device
        </p>
      </div>
      <div className="divide-y px-5">
        <div className="py-4">
          <PreferenceRow
            icon={Bell}
            title="Reservation confirmations"
            description="Get notified when you book or cancel a spot"
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
            title="Availability alerts"
            description="Get notified when preferred spots become available"
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
              title="Preferred parking lot"
              description="Default lot shown when browsing the map"
            >
              <Select
                value={preferredLotId ?? ''}
                onChange={(v) => onPreferredLotChange(v ?? null)}
                clearable
                placeholder="Any lot"
                className="w-36 text-xs"
                data={lots.map((lot) => ({ value: lot.id, label: lot.name }))}
              />
            </PreferenceRow>
          </div>
        )}
        <div className="py-4">
          <PreferenceRow
            icon={Clock}
            title="Typical arrival time"
            description="Reservations default to starting at this time"
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
            title="Default reservation duration"
            description="How many hours your spot is held by default"
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
