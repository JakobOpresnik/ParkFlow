import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  PanelRight,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { ParkingMapHandle } from '@/components/ParkingMap/ParkingMap'
import { ParkingMap } from '@/components/ParkingMap/ParkingMap'
import { SpotGrid } from '@/components/SpotGrid/SpotGrid'
import { SpotModal } from '@/components/SpotModal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useEffectiveSpots } from '@/hooks/useEffectiveSpots'
import { useLots } from '@/hooks/useLots'
import { useParkingStore } from '@/store/parkingStore'
import { usePrefsStore } from '@/store/prefsStore'
import { useUIStore } from '@/store/uiStore'
import type { ParkingLot, Spot } from '@/types'

import { LotDaySelector } from './LotDaySelector'
import { MapSidebar } from './MapSidebar'
import { MapViewToggle } from './MapViewToggle'
import { OverlayButton } from './OverlayButton'
import { useNextWeekPrompt } from './useNextWeekPrompt'
import { getWeekDays } from './utils'

// ─── constants ────────────────────────────────────────────────────────────────

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

// ─── main component ───────────────────────────────────────────────────────────

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
  const [keyNavRow, setKeyNavRow] = useState(0)

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

  // Fullscreen change listener
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Arrow key navigation: Up/Down switches between lot row and weekday row;
  // Left/Right navigates within the active row.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setKeyNavRow(0)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setKeyNavRow(1)
        return
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return

      if (keyNavRow === 0) {
        if (lots.length < 2) return
        const idx = lots.findIndex((l) => l.id === selectedLotId)
        const next =
          e.key === 'ArrowRight'
            ? lots[(idx + 1) % lots.length]
            : lots[(idx - 1 + lots.length) % lots.length]
        if (next) setSelectedLotId(next.id)
      } else {
        const idx = weekDays.indexOf(selectedDate)
        const nextIdx =
          e.key === 'ArrowRight'
            ? (idx + 1) % weekDays.length
            : (idx - 1 + weekDays.length) % weekDays.length
        setSelectedDate(weekDays[nextIdx] ?? selectedDate)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [
    keyNavRow,
    lots,
    selectedLotId,
    setSelectedLotId,
    weekDays,
    selectedDate,
    setSelectedDate,
  ])

  const isLoading = spotsLoading || lotsLoading
  const activeLot = lots.find((l) => l.id === selectedLotId) ?? lots[0] ?? null
  const lotSpots = activeLot
    ? allSpots.filter((s) => s.lot_id === activeLot.id)
    : []

  function handleSpotClick(spot: Spot) {
    setSelectedSpot(spot)
    setSpotModalOpen(true)
  }

  function handleLotSelect(lot: ParkingLot) {
    setSelectedLotId(lot.id)
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void containerRef.current?.requestFullscreen()
    } else {
      void document.exitFullscreen()
    }
  }

  const isMapMode = mapViewMode === 'map'
  const shouldBlurMap = isWorkFreeDay || isLoadingPresence

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${isMapMode ? '' : 'bg-muted/40'}`}
      style={isMapMode ? BlueprintStyle : undefined}
    >
      {/* ── Map — centered with aspect ratio ──────────────────────────────── */}
      {isMapMode && (
        <div
          className={`absolute inset-0 flex items-center justify-center p-4 transition-[filter] duration-300 ${shouldBlurMap ? 'blur-[3px]' : ''}`}
        >
          <div
            className="relative h-full max-h-full w-full max-w-full"
            style={{
              aspectRatio: activeLot
                ? `${activeLot.image_width} / ${activeLot.image_height}`
                : '4 / 3',
              maxWidth: '100%',
              maxHeight: '100%',
              flex: '0 1 auto',
            }}
          >
            {isLoading && (
              <div className="flex h-full items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            )}

            {isError && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
                <AlertCircle className="size-8" />
                <p className="text-sm">Could not load parking data</p>
                <p className="text-xs opacity-60">
                  Check that the backend is running
                </p>
              </div>
            )}

            {!isLoading && !isError && !activeLot && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-white/70">
                <MapPin className="size-8" />
                <p className="text-sm">No parking lots found</p>
                <p className="text-xs opacity-60">
                  Add a lot via the Admin page
                </p>
              </div>
            )}

            {!isLoading && !isError && activeLot && (
              <div
                className="absolute inset-0 overflow-hidden rounded-xl"
                style={{
                  border: '1px solid rgba(255,255,255,0.18)',
                  boxShadow:
                    '0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)',
                }}
              >
                <ParkingMap
                  key={activeLot.id}
                  ref={mapRef}
                  lot={activeLot}
                  spots={lotSpots}
                  selectedSpotId={selectedSpot?.id ?? null}
                  highlightedSpotId={highlightedSpotId}
                  onSpotClick={handleSpotClick}
                  invertFloorPlan
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Grid view ──────────────────────────────────────────────────────── */}
      {!isMapMode && (
        <div
          className={`absolute inset-0 overflow-y-auto p-4 pt-44 transition-[filter] duration-300 sm:pt-40 ${shouldBlurMap ? 'blur-[3px]' : ''}`}
        >
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-muted h-20 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : lotSpots.length === 0 ? (
            <div className="text-muted-foreground flex h-32 items-center justify-center">
              <p className="text-sm">No spots in this lot</p>
            </div>
          ) : (
            <SpotGrid spots={lotSpots} />
          )}
        </div>
      )}

      {/* ── Top-left: lot selector + week day strip ──────────────────────────── */}
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

      {/* ── Top-right: view mode toggle ──────────────────────────────────────── */}
      <MapViewToggle
        isMapMode={isMapMode}
        onSelectMap={() => setMapViewMode('map')}
        onSelectGrid={() => setMapViewMode('grid')}
      />

      {/* ── Bottom-right: sidebar toggle + zoom + fullscreen (map mode only) ── */}
      {isMapMode && (
        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2">
          <div className="rounded-xl bg-black/40 p-1 backdrop-blur-sm">
            <OverlayButton
              onClick={() => setSidebarOpen((v) => !v)}
              title="Toggle sidebar"
              active={sidebarOpen}
            >
              <PanelRight className="size-5" />
            </OverlayButton>
          </div>
          <div className="flex flex-col rounded-xl bg-black/40 p-1 backdrop-blur-sm">
            <OverlayButton
              onClick={() => mapRef.current?.zoomIn()}
              title="Zoom in"
            >
              <Plus className="size-5" />
            </OverlayButton>
            <div className="mx-1 h-px bg-white/20" />
            <OverlayButton
              onClick={() => mapRef.current?.zoomOut()}
              title="Zoom out"
            >
              <Minus className="size-5" />
            </OverlayButton>
            <div className="mx-1 h-px bg-white/20" />
            <OverlayButton
              onClick={() => mapRef.current?.resetZoom()}
              title="Reset zoom"
            >
              <RotateCcw className="size-4" />
            </OverlayButton>
          </div>
          <div className="rounded-xl bg-black/40 p-1 backdrop-blur-sm">
            <OverlayButton
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="size-5" />
              ) : (
                <Maximize2 className="size-5" />
              )}
            </OverlayButton>
          </div>
        </div>
      )}

      {/* ── Right sidebar overlay ─────────────────────────────────────────── */}
      <MapSidebar
        isOpen={sidebarOpen}
        activeLot={activeLot}
        lotSpots={lotSpots}
        isLoading={isLoading}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Next-week prompt — shown on Friday after arrival window closes */}
      <Dialog open={showNextWeekPrompt} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false}>
          <DialogHeader className="gap-5">
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="text-primary size-5 shrink-0" />
              Switch to next week?
            </DialogTitle>
            <DialogDescription>
              This week&apos;s reservation window has closed. Would you like to
              view next week&apos;s availability and reserve a spot in advance?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-3">
            <Button variant="ghost" size="sm" onClick={handleDismiss}>
              Stay
            </Button>
            <Button size="sm" className="gap-1.5" onClick={handleGoToNextWeek}>
              Go to next week
              <ArrowRight className="size-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Presence / timesheet loading overlay ──────────────────────────── */}
      {isLoadingPresence && !isLoading && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl bg-black/70 px-6 py-4 shadow-2xl backdrop-blur-md">
            <div className="size-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm font-medium text-white">
              Loading timesheet data…
            </p>
          </div>
        </div>
      )}

      {/* ── Work-free day overlay ──────────────────────────────────────────── */}
      {isWorkFreeDay && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
          <div className="pointer-events-auto rounded-2xl bg-black/70 px-8 py-5 text-center shadow-2xl backdrop-blur-md">
            <CalendarDays className="mx-auto mb-2 size-8 text-amber-400" />
            <p className="text-lg font-semibold text-white">Work-Free Day</p>
            <p className="mt-1 text-sm text-white/60">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              is a public holiday
            </p>
          </div>
        </div>
      )}

      {/* SpotModal (Dialog, separate from sidebar) */}
      <SpotModal />
    </div>
  )
}
