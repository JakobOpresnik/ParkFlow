import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'

import type { SpotStatus } from '@/types'

// — types —

export interface StatusConfigDetails {
  readonly label: string
  readonly color: string
  readonly bg: string
  readonly text: string
  readonly icon: React.ReactNode
}

// — constants —

export const STATUS_CONFIG: Record<SpotStatus, StatusConfigDetails> = {
  free: {
    label: 'Available',
    color: 'green',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: <CheckCircle2 className="size-4 shrink-0" />,
  },
  occupied: {
    label: 'Occupied',
    color: 'red',
    bg: 'bg-red-500/10 border-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    icon: <XCircle className="size-4 shrink-0" />,
  },
  reserved: {
    label: 'Reserved',
    color: 'blue',
    bg: 'bg-blue-500/10 border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: <Clock className="size-4 shrink-0" />,
  },
  spotted: {
    label: 'Reported as taken',
    color: 'orange',
    bg: 'bg-orange-500/10 border-orange-500/30',
    text: 'text-orange-600 dark:text-orange-400',
    icon: <AlertTriangle className="size-4 shrink-0" />,
  },
}
