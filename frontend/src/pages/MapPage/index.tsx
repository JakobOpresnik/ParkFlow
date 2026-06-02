import { useComputedColorScheme } from '@mantine/core'
import { useSearch } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ParkingMapHandle } from '@/components/ParkingMap/ParkingMap'
import { SpotGrid } from '@/components/SpotGrid/SpotGrid'
import { SpotModal } from '@/components/SpotModal'
import { DialogPortalTargetCtx } from '@/components/ui/dialog'
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

// Mirrors routeTree.gen.tsx; kept local to avoid a circular import.
const DEEP_LINK_SPOT_KEY = 'parkflow:deepLinkSpot'
const DEEP_LINK_DATE_KEY = 'parkflow:deepLinkDate'

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

const BLUEPRINT_DARK: React.CSSProperties = {
  backgroundColor: 'oklch(0.245 0 0)',
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
    'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
  backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px',
}

const BLUEPRINT_LIGHT: React.CSSProperties = {
  backgroundColor: '#fafafa',
  backgroundImage: [
    'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
    'linear-gradient(rgba(0,0,0,0.025) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(0,0,0,0.025) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '100px 100px, 100px 100px, 20px 20px, 20px 20px',
  backgroundPosition: '-1px -1px, -1px -1px, -1px -1px, -1px -1px',
}

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
  const colorScheme = useComputedColorScheme('light')
  const isDark = colorScheme === 'dark'

  const blueprintStyle = isDark ? BLUEPRINT_DARK : BLUEPRINT_LIGHT

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
  const setHighlightedSpotId = useParkingStore((s) => s.setHighlightedSpotId)
  const setSpotModalOpen = useUIStore((s) => s.setSpotModalOpen)
  const mapViewMode = useUIStore((s) => s.mapViewMode)
  const setMapViewMode = useUIStore((s) => s.setMapViewMode)
  const preferredLotId = usePrefsStore((s) => s.preferredLotId)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [containerEl, setContainerEl] = useState<HTMLElement | null>(null)

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

  // Deep-link spot id from a shared link (?spot=<id>), with a sessionStorage
  // fallback for the case where login redirected and dropped the query param.
  const search = useSearch({ strict: false })
  const deepLinkSpotId =
    search.spot ?? sessionStorage.getItem(DEEP_LINK_SPOT_KEY) ?? undefined
  const deepLinkDate =
    search.date ?? sessionStorage.getItem(DEEP_LINK_DATE_KEY) ?? undefined

  // Deep-link day (?date=YYYY-MM-DD, e.g. from a "reserve … tomorrow" chat
  // link): open the map on that day, but only if it's in the current
  // selectable Mon–Fri week — the day picker can't represent dates outside it.
  useEffect(() => {
    if (!deepLinkDate) return
    const today = new Date().toISOString().slice(0, 10)
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(deepLinkDate) &&
      getWeekDays(today).includes(deepLinkDate) &&
      deepLinkDate !== selectedDate
    ) {
      setSelectedDate(deepLinkDate)
    }
    sessionStorage.removeItem(DEEP_LINK_DATE_KEY)
    // Run once on mount with the resolved deep-link date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkDate])

  // Auto-select preferred lot (or first lot as fallback) when arriving at map.
  // Skipped while a deep-link is pending so it doesn't fight the spot's lot.
  useEffect(() => {
    if (lots.length > 0 && selectedLotId === null && !deepLinkSpotId) {
      const preferred =
        preferredLotId !== null
          ? lots.find((l) => l.id === preferredLotId)
          : null
      setSelectedLotId(preferred ? preferred.id : (lots[0]?.id ?? null))
    }
  }, [lots, selectedLotId, preferredLotId, setSelectedLotId, deepLinkSpotId])

  // Apply a deep-link: switch to the spot's lot and highlight it.
  useEffect(() => {
    if (!deepLinkSpotId || allSpots.length === 0) return
    const target = allSpots.find((s) => s.id === deepLinkSpotId)
    if (target) {
      if (target.lot_id) setSelectedLotId(target.lot_id)
      setHighlightedSpotId(target.id)
    }
    sessionStorage.removeItem(DEEP_LINK_SPOT_KEY)
  }, [deepLinkSpotId, allSpots, setSelectedLotId, setHighlightedSpotId])

  // Sync fullscreen state with browser API
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Track the container element for portal targeting
  useEffect(() => {
    setContainerEl(containerRef.current)
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

  const portalTarget = isFullscreen ? (containerEl ?? undefined) : undefined

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${isMapMode ? '' : 'bg-muted/40'}`}
      style={isMapMode ? blueprintStyle : undefined}
    >
      <DialogPortalTargetCtx.Provider value={portalTarget}>
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
            invertFloorPlan={isDark}
          />
        )}

        {!isMapMode && (
          <div
            className={`absolute inset-0 overflow-y-auto p-4 pt-56 transition-[filter] duration-300 sm:pt-52 ${shouldBlurMap ? 'blur-[3px]' : ''}`}
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
      </DialogPortalTargetCtx.Provider>
    </div>
  )
}
