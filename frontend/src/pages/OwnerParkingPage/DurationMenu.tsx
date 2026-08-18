import { Menu } from '@mantine/core'
import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Infinity as InfinityIcon,
} from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { DayStatusDuration } from '@/types'

import { DURATION_OPTIONS } from './utils'

// — constants —

const DURATION_ICONS: Record<DayStatusDuration, ReactNode> = {
  day: <CalendarDays className="size-4" />,
  week: <CalendarRange className="size-4" />,
  month: <CalendarClock className="size-4" />,
  indefinite: <InfinityIcon className="size-4" />,
}

// — types —

interface DurationMenuProps {
  readonly target: ReactElement
  readonly onSelect: (duration: DayStatusDuration) => void
}

// — main component —

// Duration picker dropdown for owner availability changes; spans its trigger.
export function DurationMenu({ target, onSelect }: DurationMenuProps) {
  const { t } = useTranslation()
  return (
    <Menu
      shadow="lg"
      position="bottom"
      width="target"
      radius="md"
      offset={6}
      withinPortal
    >
      <Menu.Target>{target}</Menu.Target>
      <Menu.Dropdown className="p-1.5">
        <Menu.Label>{t('ownerParking.durationLabel')}</Menu.Label>
        {DURATION_OPTIONS.map(({ duration, labelKey }) => (
          <Menu.Item
            key={duration}
            leftSection={DURATION_ICONS[duration]}
            className="rounded-md py-2.5 text-sm font-medium"
            onClick={() => onSelect(duration)}
          >
            {t(labelKey)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}
