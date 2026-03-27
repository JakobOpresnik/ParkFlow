// — types —

interface SelectorTheme {
  readonly container: string
  readonly divider: string
  readonly lotActive: string
  readonly lotInactive: string
  readonly dayToggleActive: string
  readonly dayToggleInactive: string
  readonly dayDropdownMenu: string
  readonly daySelected: string
  readonly dayUnselected: string
  readonly daySelectedDot: string
  readonly dayUnselectedDot: string
  readonly projectionNote: string
  readonly keyNavRing: string
  readonly skeletonBg: string
  readonly todayDot: string
}

// — constants —

const MAP_THEME: SelectorTheme = {
  container: 'bg-black/40 backdrop-blur-sm',
  divider: 'bg-white/15',
  lotActive: 'bg-white text-blue-950',
  lotInactive: 'text-white/80 hover:bg-white/10 hover:text-white',
  dayToggleActive: 'bg-white/20 text-white',
  dayToggleInactive: 'text-white/70 hover:bg-white/10 hover:text-white',
  dayDropdownMenu: 'bg-black/80 backdrop-blur-sm',
  daySelected: 'bg-white/20 text-white',
  dayUnselected: 'text-white/70 hover:bg-white/10 hover:text-white',
  daySelectedDot: 'bg-white',
  dayUnselectedDot: 'bg-white/50',
  projectionNote: 'text-white/50',
  keyNavRing: 'ring-1 ring-white/40',
  skeletonBg: 'bg-white/10',
  todayDot: 'bg-white',
}

const NORMAL_THEME: SelectorTheme = {
  container: 'bg-card border shadow-sm',
  divider: 'bg-border',
  lotActive: 'bg-primary text-primary-foreground',
  lotInactive: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  dayToggleActive: 'bg-primary/10 text-primary',
  dayToggleInactive:
    'text-muted-foreground hover:bg-muted hover:text-foreground',
  dayDropdownMenu: 'bg-card border shadow-md',
  daySelected: 'bg-primary text-primary-foreground',
  dayUnselected: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  daySelectedDot: 'bg-primary-foreground',
  dayUnselectedDot: 'bg-primary',
  projectionNote: 'text-muted-foreground',
  keyNavRing: 'ring-primary/50 ring-1',
  skeletonBg: 'bg-muted',
  todayDot: 'bg-primary',
}

// — helpers —

export function getTheme(isMapMode: boolean): SelectorTheme {
  return isMapMode ? MAP_THEME : NORMAL_THEME
}
