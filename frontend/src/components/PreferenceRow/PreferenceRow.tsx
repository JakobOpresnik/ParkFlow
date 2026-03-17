// — types —

interface PreferenceRowProps {
  readonly icon: React.ElementType
  readonly title: string
  readonly description: string
  readonly children: React.ReactNode
}

// — main component —

export function PreferenceRow({
  icon: Icon,
  title,
  description,
  children,
}: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
