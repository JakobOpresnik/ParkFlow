import { CheckCircle2, Clock, HelpCircle, XCircle } from 'lucide-react'

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
    color: 'yellow',
    bg: 'bg-amber-500/10 border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    icon: <Clock className="size-4 shrink-0" />,
  },
  unconfirmed: {
    label: 'Unconfirmed',
    color: 'violet',
    bg: 'bg-violet-500/10 border-violet-500/20',
    text: 'text-violet-600 dark:text-violet-400',
    icon: <HelpCircle className="size-4 shrink-0" />,
  },
}

// Admins manually set only these statuses; 'unconfirmed' is derived, not editable.
export const ALL_STATUSES: SpotStatus[] = ['free', 'occupied', 'reserved']
