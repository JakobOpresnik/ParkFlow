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
      className={`flex size-11 items-center justify-center rounded-lg text-white transition-colors ${
        active ? 'bg-white/20' : 'hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}
