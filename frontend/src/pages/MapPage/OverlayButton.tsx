import type { ReactNode } from 'react'

// ─── types ────────────────────────────────────────────────────────────────────

interface OverlayButtonProps {
  readonly onClick: () => void
  readonly title: string
  readonly children: ReactNode
  readonly active?: boolean
}

// ─── component ────────────────────────────────────────────────────────────────

export function OverlayButton({
  onClick,
  title,
  children,
  active,
}: OverlayButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`text-primary flex size-11 items-center justify-center rounded-lg transition-colors ${
        active ? 'bg-primary/20' : 'hover:bg-primary/15'
      }`}
    >
      {children}
    </button>
  )
}
