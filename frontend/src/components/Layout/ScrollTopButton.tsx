import { ActionIcon, Tooltip, Transition } from '@mantine/core'
import { ArrowUp } from 'lucide-react'
import { type RefObject, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// — types —

interface ScrollTopButtonProps {
  readonly scrollRef: RefObject<HTMLElement | null>
}

// — main component —

// Floating "back to top" for the app's single scroll container (Layout's
// <main>), so every long page — admin tables, owners, bookings history,
// dashboard activity — gets it without wiring anything per page.
export function ScrollTopButton({ scrollRef }: ScrollTopButtonProps) {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      setShow(el!.scrollTop > 400)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [scrollRef])

  return (
    <Transition mounted={show} transition="slide-up" duration={150}>
      {(style) => (
        // Positioning lives on a plain div: Mantine's unlayered
        // `position: relative` on ActionIcon outranks Tailwind's layered `fixed`.
        <div
          style={style}
          className="fixed right-6 bottom-20 z-40 sm:right-10 sm:bottom-6"
        >
          <Tooltip label={t('common.scrollToTop')} position="left" withArrow>
            <ActionIcon
              onClick={() =>
                scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }
              aria-label={t('common.scrollToTop')}
              size="xl"
              radius="xl"
              variant="filled"
              className="shadow-lg"
            >
              <ArrowUp className="size-5" />
            </ActionIcon>
          </Tooltip>
        </div>
      )}
    </Transition>
  )
}
