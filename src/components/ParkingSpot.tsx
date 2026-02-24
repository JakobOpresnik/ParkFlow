import { Tooltip, Text } from '@mantine/core'
import { Car, Zap, Accessibility, User } from 'lucide-react'
import type { ParkingSpot as ParkingSpotType } from '@/types'

interface Props {
  readonly spot: ParkingSpotType
  readonly isCurrentUser: boolean
  readonly onSelect: (spot: ParkingSpotType) => void
}

const statusConfig = {
  occupied: {
    bg: 'bg-red-50 border-red-200',
    car: 'text-red-500',
    label: 'text-red-600',
    dot: 'bg-red-500',
  },
  available: {
    bg: 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300 cursor-pointer hover:shadow-md',
    car: 'text-green-400',
    label: 'text-green-600',
    dot: 'bg-green-500',
  },
  reserved: {
    bg: 'bg-primary-50 border-primary-200',
    car: 'text-primary-500',
    label: 'text-primary-600',
    dot: 'bg-primary-500',
  },
  unavailable: {
    bg: 'bg-gray-100 border-gray-200 opacity-60',
    car: 'text-gray-400',
    label: 'text-gray-500',
    dot: 'bg-gray-400',
  },
}

function getTooltipLabel(
  status: ParkingSpotType['status'],
  isCurrentUser: boolean,
  permanentOwner?: string,
  reservedBy?: string,
): string {
  if (status === 'available') return 'Click to reserve'
  if (status === 'reserved' && isCurrentUser) return 'Click to cancel'
  if (status === 'occupied') return `Occupied by ${permanentOwner}`
  return `Reserved by ${reservedBy}`
}

function canInteractWithSpot(
  status: ParkingSpotType['status'],
  isCurrentUser: boolean,
): boolean {
  return status === 'available' || (status === 'reserved' && isCurrentUser)
}

function getCarRotation(orientation?: string): string {
  if (orientation === 'left') return '-rotate-90'
  if (orientation === 'right') return 'rotate-90'
  if (orientation === 'down') return 'rotate-180'
  return ''
}

export default function ParkingSpot({ spot, isCurrentUser, onSelect }: Props) {
  const config = statusConfig[spot.status]
  const interactable = canInteractWithSpot(spot.status, isCurrentUser)
  const tooltipLabel = getTooltipLabel(
    spot.status,
    isCurrentUser,
    spot.permanentOwner,
    spot.reservedBy,
  )

  return (
    <Tooltip label={tooltipLabel} position="top" withArrow radius="md" fz="xs">
      <button
        disabled={!interactable}
        onClick={() => interactable && onSelect(spot)}
        className={`group relative flex h-full w-full flex-col items-center justify-center rounded-xl border-2 p-2 transition-all duration-200 ${config.bg} ${
          isCurrentUser && spot.status === 'reserved'
            ? 'ring-2 ring-primary-400 ring-offset-2 hover:cursor-pointer hover:bg-primary-100'
            : ''
        }`}
      >
        {/* Spot label */}
        <span
          className={`absolute top-1 left-2 text-[10px] font-bold ${config.label}`}
        >
          {spot.label}
        </span>

        {/* Type badge */}
        {spot.type === 'ev' && (
          <span className="absolute top-1 right-1">
            <Zap className="h-3 w-3 text-yellow-500" />
          </span>
        )}
        {spot.type === 'handicap' && (
          <span className="absolute top-1 right-1">
            <Accessibility className="h-3 w-3 text-blue-500" />
          </span>
        )}

        {/* Car icon or empty */}
        {spot.status === 'occupied' || spot.status === 'reserved' ? (
          <div className={config.car}>
            <Car className={`h-8 w-8 ${getCarRotation(spot.orientation)}`} />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center">
            <div
              className={`h-2 w-2 rounded-full ${config.dot} animate-pulse`}
            />
          </div>
        )}

        {/* Owner / reserved info */}
        <div className="mt-1 w-full truncate text-center">
          {spot.status === 'occupied' && spot.permanentOwner && (
            <Text
              size="xs"
              c="red"
              className="flex items-center justify-center gap-1.5"
              style={{ fontSize: 14 }}
            >
              <User className="h-3.5 w-3.5" />
              {spot.permanentOwner.split(' ')[0]}
            </Text>
          )}
          {spot.status === 'reserved' && spot.reservedBy && (
            <Text
              size="xs"
              c="violet"
              className="flex items-center justify-center gap-1.5"
              style={{ fontSize: 14 }}
            >
              <User className="h-3.5 w-3.5" />
              {isCurrentUser ? 'You' : spot.reservedBy.split(' ')[0]}
            </Text>
          )}
          {spot.status === 'available' && (
            <Text size="xs" c="green" fw={500} style={{ fontSize: 14 }}>
              Open
            </Text>
          )}
        </div>
      </button>
    </Tooltip>
  )
}
