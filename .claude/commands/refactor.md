Refactor the file: $ARGUMENTS

Read the file first and fully understand it before making any changes. Do not refactor what you haven't read.
Preserve all existing functionality — this is a structural improvement only, not a feature change.

---

## Phase 1 — Analyse

Before touching anything, scan the file and identify every applicable improvement from the checklist below.
Present a numbered list of what you found, grouped by category.
Ask the user to confirm before proceeding.

---

## Phase 2 — Apply (after confirmation)

Apply all identified improvements. Work through them in order. After all changes are made, detect the package manager and run the project's lint/format command:

1. Find the `package.json` closest to the changed file and check for a lockfile in that directory (or its parents):
   - `bun.lockb` or `bunfig.toml` → `bun run <script>`
   - `pnpm-lock.yaml` → `pnpm run <script>`
   - `yarn.lock` → `yarn <script>`
   - `package-lock.json` → `npm run <script>`
2. Pick the script to run — check `package.json` `"scripts"` in this order of preference: `fix` → `lint:fix` → `lint` + `format` (two commands) → `lint:all`
3. Run the detected command from the directory containing that `package.json` and fix any reported errors.

---

## Refactoring Checklist

### 1. File structure — impose this exact section order using `// — label —` dividers

```
// — types —          interfaces and type aliases used only in this file
// — constants —      module-level const values and config records
// — helpers —        pure functions with no hooks (usable outside React)
// — hooks —          custom hook functions (use* prefix), each in its own file if >~30 lines
// — sub-components — internal React components not exported
// — main component — the exported component(s)
```

Sections that have no content should be omitted. Types/constants/helpers shared across files belong in dedicated files, not here.

#### When to promote a file to a folder

Move `ComponentName.tsx` → `ComponentName/index.tsx` when **any** of these are true:
- The file contains 3 or more sub-components that each have distinct data needs
- The file is >~150 lines and growing with more sub-components
- You're about to extract a hook that is meaningfully large (>~30 lines)

Once in a folder:
- Main component lives in `index.tsx` — import paths for consumers stay unchanged (`@/pages/ProfilePage` still works)
- Each sub-component gets its own file: `UserProfileCard.tsx`, `BookingRow.tsx`, etc.
- Collocated hook files sit alongside: `useBookingStats.ts`, `useProfilePage.ts`
- Pure helpers shared across the folder's files go into `utils.ts` in the same folder
- Sub-components that could be useful elsewhere graduate to `components/ComponentName/ComponentName.tsx`

---

### 2. TypeScript

- No `any` types — use `unknown` with type narrowing, or define a proper type
- All interface props must be `readonly` on each field (`readonly name: string`) — not `Readonly<T>` wrapper
- Add explicit type annotations to `useState` and `useRef` when TypeScript cannot infer (`useState<string>('')`, `useRef<number>(0)`)
- Use `Number.parseInt` / `Number.isNaN` instead of globals `parseInt` / `isNaN`
- Union types for string literals instead of plain `string` when values are known: `'free' | 'occupied' | 'reserved'`
- Prefer `interface` for object shapes; `type` for unions, intersections, and aliases
- Do not prefix interfaces with `I` — this is outdated convention
- Use discriminated unions to model mutually exclusive states instead of optional flag combinations:
  ```ts
  // good:  type Result = { status: 'ok'; data: Spot[] } | { status: 'error'; error: string }
  // avoid: { data?: Spot[]; error?: string; isLoading?: boolean }
  ```

---

### 3. Constants and config objects

- Merge parallel `Record<SameUnion, ...>` maps into one config object:
  ```ts
  // bad:  STATUS_LABELS, STATUS_COLORS, STATUS_ICONS (3 separate records)
  // good: STATUS_CONFIG: Record<SpotStatus, { label: string; color: string; icon: ReactNode }>
  ```
- Extract magic numbers and repeated string literals to named `const`s — `const MAX_BOOKING_HOURS = 24`
- `UPPER_SNAKE_CASE` for simple scalar constants; PascalCase for rich config objects
- Config records belong in `// — constants —`, not inside component function bodies

---

### 4. State design

- **Never store derived values in state** — compute them during render:
  ```ts
  // bad:  const [fullName, setFullName] = useState(first + ' ' + last)
  // good: const fullName = first + ' ' + last   ← just compute it
  ```
- **Never mirror props in state** unless the prop is explicitly an `initialX` / `defaultX` prop (signals it's only used as the starting value)
- **Avoid contradictory boolean pairs** — replace `isLoading` + `isError` + `isSuccess` with a single `status: 'idle' | 'loading' | 'error' | 'success'`
- **Store IDs, not objects** when selecting from a list: `selectedSpotId` not `selectedSpot` — look up the object during render from the canonical source
- **Keep state as low as possible** — only lift it when two or more sibling components genuinely need the same value

---

### 5. Pure helpers

- Any logic that does not call hooks and does not depend on component state should be a plain function in `// — helpers —` (outside the component entirely)
- Replace inline IIFEs `(() => { ... })()` with a named function call
- Replace complex nested ternaries in JSX with a named helper function that returns the string/node

---

### 6. Custom hooks

- Extract hook logic from a component when it owns ≥3 pieces of related state, ≥2 queries/mutations, or a cluster of non-trivial derived values + handlers
- Only use the `use` prefix if the function actually calls other hooks — otherwise it's a plain utility function
- Name hooks after the **concrete use case**, not the mechanism: `useOnlineStatus` not `useSubscription`, `useBookingCta` not `useLocalState`
- Do not extract a hook for a single `useState` — the overhead is not worth it
- If the hook body is >~30 lines, move it to a separate file in the same folder (`useBookingCta.ts` next to `SpotModal.tsx`) and import it
- Return an object (not an array) when returning more than 2 values — objects are self-documenting and order-independent
- The hook file should export only what the component needs — don't expose internal setters unless the component drives them from JSX

#### Hook splitting — when one hook is doing too much

If a hook returns >~10 values, check whether those values naturally belong to two different domains. Split by domain, not by type:

```
// bad:  useProfilePage() → 24 values mixing user identity, prefs, and booking stats
// good: useProfilePage() → user + lots + prefs (12 values, one domain)
//       useBookingStats() → derived booking metrics (9 values, own domain)
```

Each hook should have a single clear responsibility that you can state in one sentence.

#### Zustand whole-store subscription

When a component or hook consumes **most or all** values from a Zustand store, subscribing to the whole store is cleaner than 8+ individual selectors:

```ts
// fine when consuming nearly everything:
const prefs = usePrefsStore()

// preferred when consuming only 1–2 values:
const notifyOnBooking = usePrefsStore((s) => s.notifyOnBooking)
```

The per-selector pattern is worth it for performance only when the component genuinely needs a small subset.

---

### 7. Effects (`useEffect`)

Flag any `useEffect` that falls into the "you don't need an effect" category:

- **Transforming data for render** → compute inline or with `useMemo`; don't sync into state
- **Responding to a user event** → put the logic in the event handler, not an effect
- **Resetting state when a prop changes** → pass a `key` prop to the child to remount it instead
- **Notifying a parent of a state change** → update parent and child state in the same event handler
- **Chains of effects** → if effect A sets state B which triggers effect C, consolidate into one event handler

Keep effects only for: syncing with external systems (WebSocket, browser API), subscriptions, or data fetching (though React Query is preferred).
Every effect must return a cleanup function if it sets up a subscription or timer.

---

### 8. Sub-component extraction

- Extract any JSX block >~15 lines with a clear, self-contained purpose into a named sub-component in `// — sub-components —`
- Sub-components used in only one place must NOT be exported — keep them file-private
- Give each sub-component a focused, single-responsibility props interface
- Props interfaces go in `// — types —`
- Split a component when it renders **distinct visual regions with different data needs** — not just because it's long

#### When to move a sub-component out of the file entirely

- If the component file has been promoted to a folder (see §1), each sub-component gets its own file (`UserProfileCard.tsx`, `BookingRow.tsx`) — never inline them all in `index.tsx`
- If a sub-component is generic enough to be useful in other pages (e.g. `StatCard`, `PreferenceRow`), move it to `components/ComponentName/ComponentName.tsx` and import it — do not duplicate it
- Pure helpers shared by multiple files in the folder (e.g. `formatDate`, `getInitials`) belong in a collocated `utils.ts`, not copy-pasted into each file

---

### 9. Naming conventions

#### Components
- **PascalCase**, named after what it **displays or represents**, not internal mechanics
- Compound descriptive names: `SpotDetailCard`, `AdminOwnerPanel`, `ReservationTimerRow`
- Suffix by structural role when it aids clarity: `*List`, `*Card`, `*Row`, `*Modal`, `*Form`, `*Badge`
- Never abbreviate unless the abbreviation is universally understood (`btn` → `button`, `usr` → `user`)

#### Files and folders
- Component files: **PascalCase** matching the component name — `SpotCard.tsx`
- Hook files: **camelCase** matching the hook name — `useBookingCta.ts`
- Utility/helper files: **camelCase** — `formatDate.ts`, `spotUtils.ts`
- Folders: **kebab-case** — `spot-card/`, `parking-map/`

#### Functions and variables
- All functions and variables: **camelCase** — `formatDuration`, `computeExpiry`
- Helper/utility functions: **verb-first** describing what they do — `formatDate`, `getSpotById`, `buildSelectOptions`, `computeExpiresAt`
- Arrays and collections: **plural nouns** — `spots`, `owners`, `allStatuses`
- Event handler **props**: `on` prefix — `onClose`, `onChange`, `onSpotClick`
- Event handler **implementations**: `handle` prefix — `handleClose`, `handleSubmit`, `handleSpotClick`
- These always pair: `<Button onClick={handleClick}>` — `on*` is the contract, `handle*` is the impl

#### Constants
| Pattern | Convention | Example |
|---|---|---|
| Scalar primitive (number, string) | `UPPER_SNAKE_CASE` | `MAX_BOOKING_HOURS`, `DEFAULT_FLOOR` |
| Rich config object / Record | PascalCase | `STATUS_CONFIG`, `SpotTypeInfo` |
| Enum-like union values | `UPPER_SNAKE_CASE` string literals | `'SORT_ASC'`, `'SORT_DESC'` |

#### Hooks
- Always `use` + PascalCase: `useSpotSearch`, `useBookingCta`, `useManagementAccordion`
- Only use `use` prefix if the function **actually calls hooks** — if it doesn't, it's a plain util
- Name after the **use case**, not the mechanism: `useOnlineStatus` not `useEventListener`, `useParkingMap` not `useRef`
- Never abbreviate: `useManagementAccordion` not `useMgmtAccordion`

#### Types and interfaces
- **PascalCase** — `SpotOwner`, `BookingPayload`, `StatusConfigDetails`
- No `I` prefix — `SpotProps` not `ISpotProps` (outdated Java convention)
- Props interfaces named `<ComponentName>Props` — `SpotCardProps`, `StatusBannerProps`
- Hook option bags named `Use<HookName>Options` — `UseBookingCtaOptions`

#### Booleans
- Always prefix with `is`, `has`, `can`, `should`, `was`, or `did`:
  `isOpen`, `hasError`, `canEdit`, `shouldRefetch`, `wasSubmitted`, `didMount`
- **Positive framing only**: `isVisible` not `isHidden`, `isEnabled` not `isDisabled`
- Never use vague names: `flag`, `check`, `status` (as a bool), `temp`, `data`

---

### 10. Boolean extraction

- Any JSX condition with >2 operands must be extracted to a named `const` above the return:
  ```tsx
  // bad:  {spot.status === 'free' && !!user && isBookableDate && !arrivalWindowPassed && <Reserve />}
  // good: const canReserveNow = spot.status === 'free' && !!user && isBookableDate && !arrivalWindowPassed
  //       {canReserveNow && <Reserve />}
  ```
- Name the variable after what it **means** semantically, not what the parts say literally

---

### 11. Control flow

- **Prefer early returns** over nested conditions — flatten the happy path:
  ```ts
  // bad:  if (user) { if (user.isAdmin) { return <Admin /> } else { return <Forbidden /> } }
  // good: if (!user) return null
  //       if (!user.isAdmin) return <Forbidden />
  //       return <Admin />
  ```
- **`const` over `let`** everywhere the binding is not reassigned — signals immutability at a glance

---

### 12. JSX quality

- No nested ternaries in JSX — use early returns, named variables, or helper functions
- No static inline object literals as props (`style={{ color: 'red' }}` creates a new object every render) — extract to a constant or use Tailwind
- Avoid anonymous arrow functions in JSX for non-trivial logic — extract to a named handler
- Interactive elements without visible text (`<button>`, icon-only buttons, `<a>`) must have `aria-label`
- Empty/zero states should render meaningful UI (`<p>No spots found.</p>`) not `null` or nothing

---

### 13. What NOT to change

- Do not add features, fallbacks, or error handling for impossible cases
- Do not add docstrings or inline comments unless the logic is genuinely non-obvious
- Do not wrap working Tailwind utilities in custom CSS classes
- Do not create helpers, hooks, or abstractions for one-time use just to keep things DRY — duplication is cheaper than the wrong abstraction (AHA: Avoid Hasty Abstractions)
- Do not change runtime behaviour — structure, naming, and organisation only

---

## Output format

After applying all changes:

1. List every change made, grouped by category from the checklist above
2. Note any items identified but not applied, and why (e.g. "already clean", "would change behaviour")
3. List any new files created (e.g. extracted hook files)
