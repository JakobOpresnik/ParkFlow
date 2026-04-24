import { Modal } from '@mantine/core'
import {
  BarChart3,
  CalendarDays,
  LayoutGrid,
  MapPinned,
  ParkingCircle,
  ShieldCheck,
  Sparkles,
  UsersRound,
  XIcon,
  Zap,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { useTranslation } from 'react-i18next'

interface AboutModalProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

interface FeatureItem {
  readonly Icon: ComponentType<{ className?: string }>
  readonly titleKey: string
  readonly descKey: string
  readonly tint: string
}

const FEATURES: readonly FeatureItem[] = [
  {
    Icon: MapPinned,
    titleKey: 'about.features.map.title',
    descKey: 'about.features.map.desc',
    tint: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400',
  },
  {
    Icon: CalendarDays,
    titleKey: 'about.features.booking.title',
    descKey: 'about.features.booking.desc',
    tint: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  },
  {
    Icon: UsersRound,
    titleKey: 'about.features.owners.title',
    descKey: 'about.features.owners.desc',
    tint: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400',
  },
  {
    Icon: BarChart3,
    titleKey: 'about.features.stats.title',
    descKey: 'about.features.stats.desc',
    tint: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  },
  {
    Icon: Zap,
    titleKey: 'about.features.realtime.title',
    descKey: 'about.features.realtime.desc',
    tint: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  },
  {
    Icon: ShieldCheck,
    titleKey: 'about.features.admin.title',
    descKey: 'about.features.admin.desc',
    tint: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400',
  },
]

interface BenefitItem {
  readonly Icon: ComponentType<{ className?: string }>
  readonly textKey: string
}

const BENEFITS: readonly BenefitItem[] = [
  { Icon: Sparkles, textKey: 'about.benefits.noMorePhotos' },
  { Icon: Sparkles, textKey: 'about.benefits.fairUsage' },
  { Icon: Sparkles, textKey: 'about.benefits.visibility' },
]

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
  const { t } = useTranslation()
  const handleClose = () => onOpenChange(false)

  return (
    <Modal
      opened={open}
      onClose={handleClose}
      centered
      withCloseButton={false}
      padding={0}
      radius="md"
      size="720px"
      overlayProps={{ backgroundOpacity: 0.5 }}
      transitionProps={{ transition: 'fade', duration: 150 }}
      classNames={{ content: 'bg-card' }}
    >
      <div className="relative max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3.5 right-3.5 flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors focus:outline-none"
        >
          <XIcon className="size-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 pr-8">
          <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl">
            <ParkingCircle className="text-primary size-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg leading-tight font-semibold">
              {t('about.title')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t('about.subtitle')}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <p className="text-sm leading-relaxed">{t('about.intro')}</p>

          {/* Features */}
          <div>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {t('about.featuresHeading')}
            </h3>
            <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              {FEATURES.map(({ Icon, titleKey, descKey, tint }) => (
                <li
                  key={titleKey}
                  className="flex min-w-0 items-start gap-3"
                >
                  <div
                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tint}`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t(titleKey)}</p>
                    <p className="text-muted-foreground text-xs leading-snug">
                      {t(descKey)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits */}
          <div>
            <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {t('about.benefitsHeading')}
            </h3>
            <ul className="space-y-1.5">
              {BENEFITS.map(({ Icon, textKey }) => (
                <li
                  key={textKey}
                  className="flex items-start gap-2 text-sm leading-snug"
                >
                  <Icon className="mt-0.5 size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                  <span>{t(textKey)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="text-muted-foreground flex items-center gap-2 border-t pt-3 text-xs">
            <LayoutGrid className="size-3.5" />
            <span>{t('about.footer')}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
