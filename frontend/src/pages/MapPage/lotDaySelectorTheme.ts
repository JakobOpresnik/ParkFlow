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
  readonly todayBtn: string
  readonly projectionNote: string
  readonly keyNavRing: string
  readonly skeletonBg: string
  readonly todayDot: string
}

// — constants —

const MAP_THEME: SelectorTheme = {
  container: 'bg-primary/10 backdrop-blur-sm',
  divider: 'bg-primary/20',
  lotActive: 'bg-card text-primary shadow-sm',
  lotInactive: 'text-primary/70 hover:bg-primary/10 hover:text-primary',
  dayToggleActive: 'bg-primary/15 text-primary',
  dayToggleInactive: 'text-primary/70 hover:bg-primary/10 hover:text-primary',
  dayDropdownMenu: 'bg-card border shadow-md',
  daySelected: 'bg-primary text-primary-foreground',
  dayUnselected: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  daySelectedDot: 'bg-primary-foreground',
  dayUnselectedDot: 'bg-primary',
  todayBtn:
    'bg-primary/15 text-primary ring-1 ring-primary/40 hover:bg-primary/25 font-semibold',
  projectionNote: 'text-primary/60',
  keyNavRing: 'ring-1 ring-primary/40',
  skeletonBg: 'bg-primary/10',
  todayDot: 'bg-primary',
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
  todayBtn:
    'bg-primary/15 text-primary ring-1 ring-primary/40 hover:bg-primary/25 font-semibold',
  projectionNote: 'text-muted-foreground',
  keyNavRing: 'ring-primary/50 ring-1',
  skeletonBg: 'bg-muted',
  todayDot: 'bg-primary',
}

// — helpers —

export function getTheme(isMapMode: boolean): SelectorTheme {
  return isMapMode ? MAP_THEME : NORMAL_THEME
}
