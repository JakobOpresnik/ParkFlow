---
name: mobile
description: Transform the app into a professional responsive mobile-friendly design. Audits all pages, identifies issues, and applies targeted fixes.
---

Make the application work superbly on mobile devices (320px-428px viewport width). Follow this systematic process:

## Phase 1: Audit

1. **Explore all pages and layout components** using the Explore agent. For each page, identify:
   - Navigation: Does it use a sidebar? Does it steal horizontal space on mobile? Should it use bottom nav or hamburger drawer instead?
   - Tables: Any `whitespace-nowrap` tables with 4+ columns? These need card-based mobile layouts.
   - Overflow: Any `max-w-[calc(...)]`, `min-w-[...]`, fixed pixel widths, or horizontal scroll issues?
   - Touch targets: Any interactive elements below 44px minimum (size-7, size-8)?
   - Typography: Any text below 11px (`text-[9px]`, `text-[10px]`) that's hard to read?
   - Positioning: Any `absolute` overlays that might collide on narrow screens?
   - Forms/Modals: Any dropdowns or modals that overflow on mobile?
   - Content spacing: Any content hidden behind fixed-position elements (bottom nav, sticky headers)?

2. **Check existing responsive patterns** already in the codebase. Note what already works well so you don't touch it.

3. **Check the UI framework** (Mantine, shadcn, Tailwind, etc.) and breakpoints in use.

## Phase 2: Plan (use EnterPlanMode)

Prioritize fixes by impact:

1. **Navigation** (biggest impact) - If sidebar steals space on mobile, replace with bottom nav + drawer for secondary items. Use `hidden sm:flex` on sidebar, `sm:hidden` on bottom nav.
2. **Tables to cards** - Wrap tables with `hidden sm:block`, add `sm:hidden` card list with same data. Cards: top row (ID + badges), middle (details), bottom (actions).
3. **Overlay collisions** - Use responsive max-widths (`max-w-[calc(100%-Xpx)] sm:max-w-[calc(100%-Ypx)]`). Stack toggle buttons vertically on very narrow screens with `flex-col min-[300px]:flex-row`.
4. **Control offsets** - If adding bottom nav, offset floating controls: `bottom-20 sm:bottom-3`.
5. **Fixed widths** - Remove `min-w-[...]` constraints that force horizontal scroll. Let CSS Grid fill naturally.
6. **Touch polish** - Ensure all tap targets meet 44px minimum.

## Phase 3: Implement

Apply changes following these patterns:

### Bottom Navigation Pattern
```tsx
{/* Desktop sidebar */}
<aside className="hidden w-56 shrink-0 flex-col border-r sm:flex">...</aside>

{/* Mobile bottom nav */}
<nav className="bg-card fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t sm:hidden">
  {items.map(({ to, label, Icon }) => (
    <Link to={to} className="flex min-w-0 flex-1 flex-col items-center gap-0.5 px-0.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-[9px]">
      <Icon className="size-5 shrink-0" />
      <span className="w-full truncate text-center">{label}</span>
    </Link>
  ))}
</nav>
```

- Use short labels for mobile nav (`shortLabel` field) to prevent overflow
- Add `pb-20 sm:pb-6` to main content to clear bottom nav
- "More" drawer (Mantine `Drawer position="bottom"`) for admin/secondary items
- Include safe area insets: `pb-[max(0.5rem,env(safe-area-inset-bottom))]`

### Table to Card Pattern
```tsx
{/* Mobile cards */}
<div className="space-y-2 sm:hidden">
  {items.map(item => (
    <div className="bg-card rounded-lg border p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="font-bold">#{item.number}</span>
        <span className="rounded-full px-2 py-0.5 text-[11px]">{item.status}</span>
        <div className="ml-auto flex gap-1">{/* action buttons */}</div>
      </div>
      <div className="text-muted-foreground mt-1 text-xs">{/* details */}</div>
    </div>
  ))}
</div>

{/* Desktop table */}
<div className="hidden sm:block">{/* existing table */}</div>
```

### Admin Back Button Pattern
```tsx
<Link to="/" className="text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1.5 text-sm sm:hidden">
  <ArrowLeft className="size-4" />
  {t('common.back')}
</Link>
```

### Responsive Toggle Pattern
```tsx
{/* Stack vertically on very narrow screens, horizontal otherwise */}
<div className="flex flex-col gap-0.5 min-[300px]:flex-row">...</div>

{/* Hide text labels on mobile, icon-only */}
<span className="hidden sm:inline">{label}</span>
```

### Modal/Dropdown Fix Pattern
```tsx
{/* Use Mantine comboboxProps to prevent dropdown overflow */}
<Select comboboxProps={{ position: 'top', middlewares: { flip: true, shift: true } }} />

{/* Ensure modals have overflow-y-auto and max-height */}
<DialogContent className="max-h-[85vh] overflow-y-auto">
```

### Work-free Day Pattern
```tsx
{/* Disable non-work days in date pickers */}
<button disabled={isNonWork} className={isNonWork ? 'cursor-not-allowed opacity-40' : 'hover:bg-muted'}>
```

## Phase 4: Verify

After each batch of changes:
1. Run the project's linter and formatter
2. Run `build` to check for TypeScript errors
3. Test at 320px, 375px, 428px widths in Chrome DevTools
4. Verify dark mode still works (use semantic tokens: `bg-card`, `text-muted-foreground`, etc.)
5. Check that `sm:` breakpoint (640px) correctly transitions between mobile and desktop

## Rules

- **Use Mantine components** per project rules (never custom-build what Mantine provides)
- **Tailwind utility classes only** (no separate CSS files)
- **Don't touch pages that already work** — card-based layouts, responsive grids, centered login pages are usually fine
- **Don't over-engineer** — fix real issues visible on a phone, not hypothetical edge cases
- **Preserve desktop layout** — all changes should be additive for mobile, not destructive to desktop
- **Add translations** for any new user-facing strings (both `en.ts` and `sl.ts` if applicable)
- **Use semantic color tokens** for dark mode compatibility
