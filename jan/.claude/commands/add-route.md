Add a new route/page to the frontend app.

Route to add: $ARGUMENTS

Steps:
1. Create `src/routes/$ARGUMENTS.tsx` with a `createRoute()` using TanStack Router
   - Use `getParentRoute: () => rootRoute`
   - Export the route and the component
2. Register the route in `src/routeTree.gen.ts`
3. Add a nav entry in `src/components/Layout.tsx` navItems array
4. Use shadcn/ui components for UI elements (Button, Card, Dialog, Badge, Input, etc.)
   - Components live in `src/components/ui/` — import from there
   - Add new shadcn components with: `bunx shadcn@latest add <component>`
5. Use Tailwind for spacing, layout and custom styling
6. If the page fetches data, create a hook in `src/hooks/` using React Query
7. Run `bun run build` — zero TypeScript errors
8. Run `bun run lint:fix` and `bun run format`

Reply with: route path, component name, files created/modified.
