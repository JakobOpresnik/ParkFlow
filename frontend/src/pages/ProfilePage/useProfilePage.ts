import { useLots } from '@/hooks/useLots'
import { useAuthStore } from '@/store/authStore'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'

export function useProfilePage() {
  const user = useAuthStore((s) => s.user)
  const { data: lots = [] } = useLots()

  const preferredLotId = usePrefsStore((s) => s.preferredLotId)
  const arrivalTime = usePrefsStore((s) => s.arrivalTime)
  const reservationDuration = usePrefsStore((s) => s.reservationDuration)
  const setPreferredLotId = usePrefsStore((s) => s.setPreferredLotId)
  const setArrivalTime = usePrefsStore((s) => s.setArrivalTime)
  const setReservationDuration = usePrefsStore((s) => s.setReservationDuration)
  const setSelectedLotId = useParkingStore((s) => s.setSelectedLotId)

  function handlePreferredLotChange(id: string | null) {
    setPreferredLotId(id)
    setSelectedLotId(id)
  }

  return {
    user,
    lots,
    preferredLotId,
    arrivalTime,
    reservationDuration,
    setArrivalTime,
    setReservationDuration,
    handlePreferredLotChange,
  }
}
