import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Stack, Title, Text, Group, SegmentedControl } from '@mantine/core'
import { useParkingStore } from '@/store/parkingStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useSpotHeatmap } from '@/hooks/useParkingData'
import ParkingMap from '@/components/ParkingMap'
import FloorSelector from '@/components/FloorSelector'
import SpotDetailModal from '@/components/SpotDetailModal'
import type { ParkingSpot } from '@/types'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/parking',
  component: ParkingSpaces,
})

function ParkingSpaces() {
  const {
    currentFloor,
    currentUserId,
    spots,
    setFloor,
    getFloorStats,
    reserveSpot,
    cancelReservation,
  } = useParkingStore()
  const addNotification = useNotificationStore((s) => s.addNotification)
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null)
  const [viewMode, setViewMode] = useState<'live' | 'heatmap'>('live')
  const { data: heatmapData } = useSpotHeatmap()

  const stats = getFloorStats(currentFloor)

  const handleReserve = () => {
    if (!selectedSpot) return
    reserveSpot(selectedSpot.id)
    addNotification({
      type: 'success',
      title: 'Spot Reserved!',
      message: `You reserved spot ${selectedSpot.label} on floor ${currentFloor}.`,
    })
    setSelectedSpot(null)
  }

  const handleCancel = () => {
    if (!selectedSpot) return
    cancelReservation(selectedSpot.id)
    addNotification({
      type: 'info',
      title: 'Reservation Cancelled',
      message: `Reservation for spot ${selectedSpot.label} has been cancelled.`,
    })
    setSelectedSpot(null)
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Stack gap={2}>
          <Title order={2} fw={700}>
            Parking Spaces
          </Title>
          <Text size="sm" c="dimmed">
            {viewMode === 'heatmap'
              ? 'Historical occupancy intensity per spot'
              : 'View and reserve parking spots'}
          </Text>
        </Stack>
        <SegmentedControl
          value={viewMode}
          onChange={(val) => setViewMode(val as 'live' | 'heatmap')}
          data={[
            { label: 'Live View', value: 'live' },
            { label: 'Heatmap', value: 'heatmap' },
          ]}
          size="sm"
          radius="xl"
        />
      </Group>

      <FloorSelector
        currentFloor={currentFloor}
        onSelectFloor={setFloor}
        stats={stats}
      />

      <ParkingMap
        spots={spots}
        currentUserId={currentUserId}
        onSelectSpot={setSelectedSpot}
        viewMode={viewMode}
        heatmapData={heatmapData}
      />

      {/* Mobile stats */}
      {viewMode === 'live' && (
        <div className="flex gap-3 overflow-x-auto sm:hidden">
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-spot-occupied" />
            <Text size="xs">Filled {stats.filled}</Text>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-spot-available" />
            <Text size="xs">Available {stats.available}</Text>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
            <div className="h-2.5 w-2.5 rounded-full bg-spot-reserved" />
            <Text size="xs">Reserved {stats.reserved}</Text>
          </div>
        </div>
      )}

      {viewMode === 'live' && (
        <SpotDetailModal
          spot={selectedSpot}
          isCurrentUser={selectedSpot?.reservedById === currentUserId}
          onClose={() => setSelectedSpot(null)}
          onReserve={handleReserve}
          onCancel={handleCancel}
        />
      )}
    </Stack>
  )
}
