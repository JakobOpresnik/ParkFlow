# ParkFlow — Interface Design System

## Stack
- React 19 + TypeScript
- Tailwind CSS v4 (utility-first, no separate CSS files)
- Mantine 8 (notifications, some form primitives like Select)
- shadcn/ui-style components wrapped around Mantine (`Button`, `Dialog`, `Input`, `Badge`, `Table`)
- Lucide React icons
- Dark mode via `data-mantine-color-scheme="dark"`

---

## Spacing

Base unit: **4px**. Use Tailwind scale only — no arbitrary values.

| Token | px | Usage |
|---|---|---|
| `gap-0.5` / `space-y-0.5` | 2 | Nav item stacking |
| `gap-1` / `space-y-1` | 4 | Tight icon+label, dot indicators |
| `gap-1.5` | 6 | Meta info rows (icon + text) |
| `gap-2` / `space-y-2` | 8 | Standard icon+label, form field stacks |
| `gap-3` / `space-y-3` | 12 | List items, booking cards |
| `gap-4` / `space-y-4` | 16 | Grid gaps, section content |
| `gap-5` / `space-y-5` | 20 | Within-card sections |
| `gap-6` / `space-y-6` | 24 | Page-level section gaps |
| `space-y-8` | 32 | Admin page top-level section separation |

**Padding:**
- Card standard: `p-4` (16px)
- Card large: `p-5` (20px)
- Card header: `px-4 py-3` or `px-5 py-3`
- Table cell: `px-4 py-2`
- Sidebar nav: `p-2 sm:p-3`
- Page content: `p-4 sm:p-6`
- Empty states: `p-10`–`p-12`

---

## Radius

Base `--radius: 0.625rem` (10px).

| Class | Value | Usage |
|---|---|---|
| `rounded-md` | ~8px | Inputs, small UI elements, skeleton loaders |
| `rounded-lg` | 10px | Cards, tables, dropdowns, dialogs |
| `rounded-xl` | ~14px | Stat cards on Dashboard |
| `rounded-full` | 9999px | Pills, badges, dots, avatars, progress bars |

---

## Color Tokens

### Semantic (CSS variables)
```
--background       white / dark surface
--foreground       near-black
--card             white / elevated dark
--muted            very light gray / dark gray
--muted-foreground gray text
--primary          oklch(0.511 0.262 276.966) — purple/indigo
--primary-foreground white
--destructive      oklch(0.577 0.245 27.325) — red
--border           oklch(0.922 0 0) — light gray border
--ring             same as primary
```

### Spot status colors
```
--color-spot-free      oklch(0.723 0.219 149.579)  — green-500
--color-spot-occupied  oklch(0.637 0.237 25.331)   — red-500
--color-spot-reserved  oklch(0.795 0.184 86.047)   — yellow-400
```

### Tinted surfaces
- `bg-primary/10 text-primary` — subtle primary highlight (active nav, icon backgrounds, filter pills)
- `bg-green-500/15 text-green-600 dark:text-green-400` — success/active states
- `bg-orange-500/15 text-orange-600 dark:text-orange-400` — utilization/warning
- `bg-violet-500/15 text-violet-600 dark:text-violet-400` — admin role badge
- `bg-muted text-muted-foreground` — neutral/inactive

---

## Typography

| Role | Classes | Notes |
|---|---|---|
| Page heading | `text-2xl font-semibold` | All page `<h1>` |
| Page subheading | `text-muted-foreground mt-0.5 text-sm` | Directly below h1 |
| Section heading | `text-base font-semibold` | Inside cards or sections |
| Section heading sm | `text-sm font-semibold` | Card headers, table section titles |
| Section label | `text-xs font-semibold tracking-widest uppercase text-muted-foreground` | Group separators (Active, History) |
| Body | `text-sm` | Table cells, card content |
| Meta / secondary | `text-xs text-muted-foreground` | Timestamps, counts, hints |
| Large stat | `text-2xl font-bold tabular-nums sm:text-3xl` | Dashboard stat values |
| Medium stat | `text-2xl font-bold tabular-nums` | Profile stat cards |
| Label (form) | `mb-1 block text-sm font-medium` | Input labels |
| Hint (form) | `mt-1 text-xs text-muted-foreground` | Below inputs |
| Monospace | `font-mono text-xs` | IDs, vehicle plates |

---

## Depth Strategy

**Borders-first, subtle shadows.**

- Standard card: `border shadow-sm` — never `shadow-md` or higher
- No card: flat with `border-b` dividers (preferences rows, table headers)
- Active/highlighted card: `border-l-4 border-l-spot-free` or similar colored left accent
- Sidebar: `border-r` only

---

## Cards

### Standard card
```tsx
<div className="bg-card rounded-lg border p-4 shadow-sm">
```

### Card with header
```tsx
<div className="bg-card rounded-lg border shadow-sm">
  <div className="border-b px-4 py-3">
    <h2 className="text-sm font-semibold">Title</h2>
    <p className="text-muted-foreground text-xs">Subtitle</p>
  </div>
  <div className="p-4">…</div>
</div>
```

### Stat card (dashboard)
```tsx
<div className="flex flex-col gap-2 rounded-xl border p-4 shadow-sm bg-card">
  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
    <Icon className="size-4 text-primary" />
  </div>
  <p className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</p>
  <div>
    <p className="text-sm font-medium">{label}</p>
    <p className="text-muted-foreground text-xs">{sub}</p>
  </div>
</div>
```

### Lot/item card (grid)
```tsx
<div className="bg-card flex items-start justify-between rounded-lg border p-4 shadow-sm">
```

---

## Buttons

Wrapped Mantine buttons with shadcn-style API. Always use the `Button` component.

| Variant | Use case |
|---|---|
| `default` (filled primary) | Primary actions: Add, Create, Save |
| `outline` | Cancel, secondary dialog actions |
| `ghost` | Table row actions (edit/delete icons) |
| `destructive` | Confirm delete in dialogs |
| `link` | Inline text links |

| Size | Use case |
|---|---|
| `default` (md) | Toolbar/header buttons |
| `sm` | Table actions, card header buttons |
| `icon` / `icon-sm` | Icon-only buttons (theme toggle, logout) |

**Icon sizing in buttons:**
- `size="sm"` ghost → `<Icon className="size-3.5" />`
- `size="sm"` filled → `<Icon className="size-4" />`
- `size="default"` → `<Icon className="size-4" />`

**Destructive ghost pattern (table row delete):**
```tsx
<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
  <Trash2 className="size-3.5" />
</Button>
```

---

## Status Badges (Spot)

Pill shape, color-coded, always inline.

```tsx
// Pattern
<span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
  {free}     bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400
  {occupied} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400
  {reserved} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400
">
```

For `Badge` component usage (booking status):
```tsx
const STATUS_BADGE: Record<BookingStatus, string> = {
  active:    'bg-spot-free text-white border-transparent',
  cancelled: 'bg-muted text-muted-foreground border-transparent',
  expired:   'bg-muted text-muted-foreground border-transparent',
}
```

---

## Filter Pills

Used in table headers and toolbar to filter by lot/status/type.

```tsx
// Active
<button className="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors bg-primary text-primary-foreground border-primary">
// Inactive
<button className="cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors text-muted-foreground border-border hover:text-foreground">
```

---

## Icons

Using Lucide React throughout. Never use emoji for icons.

| Size class | px | Usage |
|---|---|---|
| `size-3` | 12 | Tiny inline (badge icons, link icons) |
| `size-3.5` | 14 | sm button icons, meta row icons |
| `size-4` | 16 | Standard nav icons, default button icons |
| `size-5` | 20 | Stat card icons |
| `size-7` | 28 | Logo icon |
| `size-8` | 32 | Empty state icons, spinner |
| `size-16` | 64 | Avatar |

Icon colors follow parent text color. For colored icons: `text-primary`, `text-muted-foreground`, or status colors.

---

## Empty States

Used when a list/table has no data.

```tsx
// Page-level
<div className="rounded-lg border border-dashed p-12 text-center">
  <Icon className="text-muted-foreground mx-auto mb-3 size-8" />
  <p className="text-muted-foreground text-sm">No items yet. Do X to get started.</p>
</div>

// Section-level (tighter)
<div className="rounded-lg border border-dashed p-10 text-center">
```

---

## Loading Skeletons

```tsx
// Full-width block
<div className="bg-muted h-24 animate-pulse rounded-lg" />
// Smaller item
<div className="bg-muted h-12 animate-pulse rounded-md" />
// Grid of stat cards
<div className="bg-muted h-28 animate-pulse rounded-xl border" />
```

---

## Navigation (Sidebar)

- Width: `w-14` collapsed (mobile) / `w-56` expanded (sm+)
- Background: `bg-card border-r`
- Logo bar: `h-14 border-b`
- Nav area: `p-2 sm:p-3 gap-0.5`

**Nav link classes:**
```tsx
const linkClass = 'relative text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors sm:px-3'
const activeLinkClass = 'bg-primary/10 text-primary font-semibold hover:bg-primary/10 hover:text-primary before:absolute before:inset-y-1.5 before:left-0.5 before:w-0.5 before:rounded-full before:bg-primary'
```

---

## Layout

```tsx
// App shell
<div className="flex h-screen overflow-hidden">
  <aside className="bg-card flex w-14 shrink-0 flex-col border-r sm:w-56" />
  <main className="bg-muted/40 flex-1 overflow-y-auto p-4 sm:p-6">
    <div className="mx-auto max-w-6xl">{children}</div>
  </main>
</div>
```

Max content width: `max-w-6xl` (72rem).

---

## Page Structure

Every page follows this pattern:

```tsx
<div className="space-y-6">
  {/* Header */}
  <div>
    <h1 className="text-2xl font-semibold">Page Title</h1>
    <p className="text-muted-foreground mt-0.5 text-sm">Short description</p>
  </div>

  {/* Content sections */}
  …
</div>
```

---

## Forms (in Dialogs)

```tsx
<div className="grid gap-3">
  <div>
    <label className="mb-1 block text-sm font-medium">Field Label *</label>
    <Input placeholder="…" />
    <p className="text-muted-foreground mt-1 text-xs">Hint text</p>
  </div>
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    …
  </div>
</div>
```

Dialog footer pattern:
```tsx
<DialogFooter>
  <Button variant="outline" onClick={onClose}>Cancel</Button>
  <Button onClick={onSubmit} disabled={isPending}>Save</Button>
</DialogFooter>
```

---

## Tables

```tsx
<div className="bg-card rounded-lg border shadow-sm">
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Column</TableHead>
        {/* Sticky actions column */}
        <TableHead className="bg-card before:bg-border sticky right-0 w-[100px] text-center before:absolute before:inset-y-0 before:left-0 before:w-px before:opacity-0 before:content-[''] group-data-[overflow=true]:before:opacity-100">
          Actions
        </TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map(item => (
        <TableRow key={item.id}>
          <TableCell>…</TableCell>
          <TableCell className="bg-card before:bg-border sticky right-0 …">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost"><Pencil className="size-3.5" /></Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

---

## Search Input Pattern

```tsx
<div className="relative">
  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
  <Input value={q} onChange={…} placeholder="Search…" className="h-8 w-44 pr-7 pl-8 text-sm" />
  {q && (
    <button onClick={() => setQ('')} className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer" aria-label="Clear search">
      <X className="size-3.5" />
    </button>
  )}
</div>
```

---

## Toolbars (Section header row)

```tsx
<div className="flex items-center justify-between">
  <h2 className="flex items-center gap-2 text-base font-semibold">
    <Icon className="text-primary size-4" />
    Section Title
  </h2>
  <Button size="sm" className="gap-2">
    <Plus className="size-4" />
    Add Item
  </Button>
</div>
```

---

## Progress / Occupancy Bar

```tsx
<div className="bg-muted flex h-3 w-full overflow-hidden rounded-full">
  <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--color-spot-occupied)' }} />
  <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--color-spot-reserved)' }} />
  <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: 'var(--color-spot-free)' }} />
</div>
```

---

## Do Nots

- No `shadow-md` or higher — depth is achieved with borders
- No arbitrary Tailwind values (`w-[123px]`) except for known fixed-width columns
- No inline `style` except for dynamic CSS variable color values
- No separate CSS files — all styling in Tailwind classes
- No Mantine layout components (Grid, Stack, Group) — use Tailwind flex/grid
- Never use `any` types
- No emoji in UI (use Lucide icons)
