import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  LayoutGrid,
  Map,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  PanelRight,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { ParkingMap } from '@/components/ParkingMap/ParkingMap'
import type { ParkingMapHandle } from '@/components/ParkingMap/ParkingMap'
import { SpotGrid } from '@/components/SpotGrid/SpotGrid'
import { SpotSearch } from '@/components/SpotSearch/SpotSearch'
import { SpotModal } from '@/components/SpotModal/SpotModal'
import { useSpots } from '@/hooks/useSpots'
import { useLots } from '@/hooks/useLots'
import { useParkingStore } from '@/store/parkingStore'
import { useUIStore } from '@/store/uiStore'
import { usePrefsStore } from '@/store/prefsStore'
import type { ParkingLot, Spot, SpotStatus } from '@/types'

// ─── Legend ───────────────────────────────────────────────────────────────────

function MapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-free size-2.5 rounded-sm" />
        Free
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-occupied size-2.5 rounded-sm" />
        Occupied
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-spot-reserved size-2.5 rounded-sm" />
        Reserved
      </span>
    </div>
  )
}

// ─── Stat cards (sidebar) ─────────────────────────────────────────────────────

function StatCards({ spots }: { readonly spots: Spot[] }) {
  const total = spots.length
  const free = spots.filter((s) => s.status === 'free').length
  const occupied = spots.filter((s) => s.status === 'occupied').length
  const reserved = spots.filter((s) => s.status === 'reserved').length

  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: 'Total', value: total, dot: 'bg-muted-foreground' },
        { label: 'Free', value: free, dot: 'bg-spot-free' },
        { label: 'Occupied', value: occupied, dot: 'bg-spot-occupied' },
        { label: 'Reserved', value: reserved, dot: 'bg-spot-reserved' },
      ].map((s) => (
        <div
          key={s.label}
          className="bg-card flex items-center gap-2 rounded-lg border p-2.5 shadow-sm"
        >
          <span className={`${s.dot} size-2 shrink-0 rounded-full`} />
          <div>
            <p className="text-muted-foreground text-xs">{s.label}</p>
            <p className="text-base leading-none font-semibold">{s.value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Overlay button ───────────────────────────────────────────────────────────

function OverlayBtn({
  onClick,
  title,
  children,
  active,
}: {
  readonly onClick: () => void
  readonly title: string
  readonly children: React.ReactNode
  readonly active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex size-11 items-center justify-center rounded-lg text-white transition-colors ${
        active ? 'bg-white/20' : 'hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const BLUEPRINT_STYLE: React.CSSProperties = {
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

export function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<ParkingMapHandle>(null)

  const { data: allSpots = [], isLoading: spotsLoading, isError } = useSpots()
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

  // Auto-select preferred lot (or first lot as fallback) when arriving at map
  useEffect(() => {
    if (lots.length > 0 && selectedLotId === null) {
      const preferred =
        preferredLotId !== null
          ? lots.find((l) => l.id === preferredLotId)
          : null
      setSelectedLotId(preferred ? preferred.id : lots[0].id)
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

  const STATUS_DOT: Record<SpotStatus, string> = {
    free: 'bg-spot-free',
    occupied: 'bg-spot-occupied',
    reserved: 'bg-spot-reserved',
  }

  const isMapMode = mapViewMode === 'map'

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${!isMapMode ? 'bg-muted/40' : ''}`}
      style={isMapMode ? BLUEPRINT_STYLE : undefined}
    >
      {/* ── Map — centered with aspect ratio ─────────────────────── */}
      {isMapMode && (
        <div className="absolute inset-0 flex items-center justify-center p-4">
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

      {/* ── Grid view ────────────────────────────────────────────── */}
      {!isMapMode && (
        <div className="absolute inset-0 overflow-y-auto p-4 pt-20 sm:pt-16">
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

      {/* ── Top-left: lot selector — always visible ──────────────── */}
      <div className="absolute top-3 left-3 z-20 max-w-[calc(100vw-96px)]">
        <div
          className={`flex flex-wrap gap-1 rounded-xl p-1.5 ${
            isMapMode
              ? 'bg-black/40 backdrop-blur-sm'
              : 'bg-card border shadow-sm'
          }`}
        >
          {isLoading ? (
            <>
              <div
                className={`h-9 w-20 animate-pulse rounded-lg ${isMapMode ? 'bg-white/10' : 'bg-muted'}`}
              />
              <div
                className={`h-9 w-24 animate-pulse rounded-lg ${isMapMode ? 'bg-white/10' : 'bg-muted'}`}
              />
            </>
          ) : (
            lots.map((lot) => (
              <button
                key={lot.id}
                onClick={() => handleLotSelect(lot)}
                className={`flex min-h-9 items-center rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  isMapMode
                    ? activeLot?.id === lot.id
                      ? 'bg-white text-blue-950'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                    : activeLot?.id === lot.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {lot.name}
                {(() => {
                  const ls = allSpots.filter((s) => s.lot_id === lot.id)
                  const free = ls.filter((s) => s.status === 'free').length
                  return ls.length > 0 ? (
                    <span
                      className={`ml-1.5 size-1.5 rounded-full ${STATUS_DOT['free']} ${
                        activeLot?.id === lot.id ? 'opacity-100' : 'opacity-70'
                      }`}
                      title={`${free} free`}
                    />
                  ) : null
                })()}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Top-right: view mode toggle ─────────────────────────── */}
      <div className="absolute top-3 right-3 z-20">
        <div
          className={`flex gap-0.5 rounded-xl p-1 ${
            isMapMode
              ? 'bg-black/40 backdrop-blur-sm'
              : 'bg-card border shadow-sm'
          }`}
        >
          <button
            onClick={() => setMapViewMode('map')}
            title="Map view"
            className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
              isMapMode
                ? 'bg-white/20 text-white'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Map className="size-4 shrink-0" />
            <span>Map</span>
          </button>
          <button
            onClick={() => setMapViewMode('grid')}
            title="Grid view"
            className={`flex min-h-11 min-w-15 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
              !isMapMode
                ? 'bg-accent text-foreground'
                : 'text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutGrid className="size-4 shrink-0" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* ── Bottom-right: sidebar toggle + zoom + fullscreen (map mode only) ──────── */}
      {isMapMode && (
        <div className="absolute right-3 bottom-3 z-20 flex flex-col gap-2">
          {/* Sidebar toggle */}
          <div className="rounded-xl bg-black/40 p-1 backdrop-blur-sm">
            <OverlayBtn
              onClick={() => setSidebarOpen((v) => !v)}
              title="Toggle sidebar"
              active={sidebarOpen}
            >
              <PanelRight className="size-5" />
            </OverlayBtn>
          </div>
          <div className="flex flex-col rounded-xl bg-black/40 p-1 backdrop-blur-sm">
            <OverlayBtn
              onClick={() => mapRef.current?.zoomIn()}
              title="Zoom in"
            >
              <Plus className="size-5" />
            </OverlayBtn>
            <div className="mx-1 h-px bg-white/20" />
            <OverlayBtn
              onClick={() => mapRef.current?.zoomOut()}
              title="Zoom out"
            >
              <Minus className="size-5" />
            </OverlayBtn>
            <div className="mx-1 h-px bg-white/20" />
            <OverlayBtn
              onClick={() => mapRef.current?.resetZoom()}
              title="Reset zoom"
            >
              <RotateCcw className="size-4" />
            </OverlayBtn>
          </div>
          <div className="rounded-xl bg-black/40 p-1 backdrop-blur-sm">
            <OverlayBtn
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="size-5" />
              ) : (
                <Maximize2 className="size-5" />
              )}
            </OverlayBtn>
          </div>
        </div>
      )}

      {/* ── Sidebar backdrop (mobile tap-to-close) ──────────────── */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 z-20 bg-black/30 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Right sidebar overlay ───────────────────────────────── */}
      <div
        className={`bg-background/95 absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l shadow-2xl backdrop-blur-sm transition-transform duration-300 sm:w-80 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <p className="font-semibold">{activeLot?.name ?? 'Parking Map'}</p>
          <button
            onClick={() => setSidebarOpen(false)}
            className="hover:bg-muted flex size-9 items-center justify-center rounded-lg transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Sidebar content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <SpotSearch />

          {activeLot && lotSpots.length > 0 && (
            <>
              <MapLegend />
              <StatCards spots={lotSpots} />
            </>
          )}

          {!isLoading && activeLot && lotSpots.length === 0 && (
            <p className="text-muted-foreground text-center text-sm">
              No spots in this lot yet.
            </p>
          )}
        </div>
      </div>

      {/* SpotModal (Dialog, separate from sidebar) */}
      <SpotModal />
    </div>
  )
}
