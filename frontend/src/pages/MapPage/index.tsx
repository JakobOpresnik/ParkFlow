import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ParkingMapHandle } from '@/components/ParkingMap/ParkingMap'
import { SpotGrid } from '@/components/SpotGrid/SpotGrid'
import { SpotModal } from '@/components/SpotModal'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useLots } from '@/hooks/useLots'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'
import { useUIStore } from '@/store/uiStore'
import type { ParkingLot, Spot } from '@/types'

import { LotDaySelector } from './LotDaySelector'
import { MapControls } from './MapControls'
import { MapOverlays } from './MapOverlays'
import { MapSidebar } from './MapSidebar'
import { MapView } from './MapView'
import { MapViewToggle } from './MapViewToggle'
import { NextWeekPrompt } from './NextWeekPrompt'
import { useKeyboardNav } from './useKeyboardNav'
import { useNextWeekPrompt } from './useNextWeekPrompt'
import { getWeekDays } from './utils'

// — types —

interface GridContentProps {
  readonly isLoading: boolean
  readonly lotSpots: Spot[]
}

// — constants —

const BlueprintStyle: React.CSSProperties = {
  backgroundColor: '#1e3a5f',
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
    'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
  backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px',
}

const SKELETON_SPOT_IDS = [
  's0',
  's1',
  's2',
  's3',
  's4',
  's5',
  's6',
  's7',
  's8',
  's9',
]

// — sub-components —

function GridContent({ isLoading, lotSpots }: GridContentProps) {
  const { t } = useTranslation()
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {SKELETON_SPOT_IDS.map((id) => (
          <div key={id} className="bg-muted h-20 animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }
  if (lotSpots.length === 0) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center">
        <p className="text-sm">{t('map.noSpotsInLot')}</p>
      </div>
    )
  }
  return <SpotGrid spots={lotSpots} />
}

// — main component —

export function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<ParkingMapHandle>(null)

  const today = new Date().toISOString().slice(0, 10)
  const selectedDate = useUIStore((s) => s.selectedDate)
  const setSelectedDate = useUIStore((s) => s.setSelectedDate)
  const weekDays = getWeekDays(selectedDate)

  const {
    data: allSpots = [],
    isLoading: spotsLoading,
    isError,
    isWorkFreeDay,
    isLoadingPresence,
  } = useEffectiveSpots(selectedDate)
  const { data: lots = [], isLoading: lotsLoading } = useLots()

  const selectedLotId = useParkingStore((s) => s.selectedLotId)
  const setSelectedLotId = useParkingStore((s) => s.setSelectedLotId)
  const selectedSpot = useParkingStore((s) => s.selectedSpot)
  const setSelectedSpot = useParkingStore((s) => s.setSelectedSpot)
  const highlightedSpotId = useParkingStore((s) => s.highlightedSpotId)
  const setSpotModalOpen = useUIStore((s) => s.setSpotModalOpen)
  const mapViewMode = useUIStore((s) => s.mapViewMode)
  const setMapViewMode = useUIStore((s) => s.setMapViewMode)
  const preferredLotId = usePrefsStore((s) => s.preferredLotId)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { keyNavRow } = useKeyboardNav({
    lots,
    selectedLotId,
    setSelectedLotId,
    weekDays,
    selectedDate,
    setSelectedDate,
  })

  const { showNextWeekPrompt, handleGoToNextWeek, handleDismiss } =
    useNextWeekPrompt()

  // Auto-select preferred lot (or first lot as fallback) when arriving at map
  useEffect(() => {
    if (lots.length > 0 && selectedLotId === null) {
      const preferred =
        preferredLotId !== null
          ? lots.find((l) => l.id === preferredLotId)
          : null
      setSelectedLotId(preferred ? preferred.id : (lots[0]?.id ?? null))
    }
  }, [lots, selectedLotId, preferredLotId, setSelectedLotId])

  // Sync fullscreen state with browser API
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const isLoading = spotsLoading || lotsLoading
  const activeLot = lots.find((l) => l.id === selectedLotId) ?? lots[0] ?? null
  const lotSpots = activeLot
    ? allSpots.filter((s) => s.lot_id === activeLot.id)
    : []

  const isMapMode = mapViewMode === 'map'
  const shouldBlurMap = isWorkFreeDay || isLoadingPresence

  function handleSpotClick(spot: Spot) {
    setSelectedSpot(spot)
    setSpotModalOpen(true)
  }

  function handleLotSelect(lot: ParkingLot) {
    setSelectedLotId(lot.id)
  }

  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${isMapMode ? '' : 'bg-muted/40'}`}
      style={isMapMode ? BlueprintStyle : undefined}
    >
      {isMapMode && (
        <MapView
          activeLot={activeLot}
          isLoading={isLoading}
          isError={isError}
          lotSpots={lotSpots}
          selectedSpotId={selectedSpot?.id ?? null}
          highlightedSpotId={highlightedSpotId}
          shouldBlurMap={shouldBlurMap}
          onSpotClick={handleSpotClick}
          mapRef={mapRef}
        />
      )}

      {!isMapMode && (
        <div
          className={`absolute inset-0 overflow-y-auto p-4 pt-44 transition-[filter] duration-300 sm:pt-40 ${shouldBlurMap ? 'blur-[3px]' : ''}`}
        >
          <GridContent isLoading={isLoading} lotSpots={lotSpots} />
        </div>
      )}

      <LotDaySelector
        lots={lots}
        allSpots={allSpots}
        isLoading={isLoading}
        activeLot={activeLot}
        selectedDate={selectedDate}
        weekDays={weekDays}
        today={today}
        isMapMode={isMapMode}
        keyNavRow={keyNavRow}
        onLotSelect={handleLotSelect}
        onDateSelect={setSelectedDate}
      />

      <MapViewToggle
        isMapMode={isMapMode}
        onSelectMap={() => setMapViewMode('map')}
        onSelectGrid={() => setMapViewMode('grid')}
      />

      {isMapMode && (
        <MapControls
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen((v) => !v)}
          mapRef={mapRef}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      <MapSidebar
        isOpen={sidebarOpen}
        activeLot={activeLot}
        lotSpots={lotSpots}
        isLoading={isLoading}
        onClose={() => setSidebarOpen(false)}
      />

      <NextWeekPrompt
        isOpen={showNextWeekPrompt}
        onGoToNextWeek={handleGoToNextWeek}
        onDismiss={handleDismiss}
      />

      <MapOverlays
        isLoadingPresence={isLoadingPresence}
        isLoadingData={isLoading}
        isWorkFreeDay={isWorkFreeDay}
        selectedDate={selectedDate}
      />

      <SpotModal />
    </div>
  )
}
