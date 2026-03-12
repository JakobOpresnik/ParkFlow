Summarize all unstaged changes by splitting them into logical commits.

Steps:

1. Run `git diff` to see all unstaged changes
2. Run `git status` to see untracked files as well
3. Analyze the changes and group them into logical commits — each group should represent one cohesive unit of work (e.g. a feature, a fix, a refactor, a style change)
4. For each group, write a one-liner conventional commit message (`feat:`, `fix:`, `chore:`, `refactor:`, `style:`, `docs:`)
5. Make sure every changed/untracked file is assigned to exactly one commit — no file should be left out, including files that only have line-ending (CRLF) changes or binary files. Group those into a `chore: normalize line endings` commit if they have no other logical home.
6. Suggest a single branch name that covers all the changes (branched from `main`):
   - Format: `kebab-case`, 3–6 words, no prefix required unless it's clearly one type (e.g. `feat/`, `fix/`)
   - Should be descriptive enough to understand at a glance, short enough to type
   - Example: `admin-filters-map-ux`

7. Present the output in this order — **branch name first, then commits**. For each commit:
   - List each file on its own bullet line (never comma-separated on one line)
   - Follow with a code block containing the `git add` and `git commit` commands

   *(example output — replace with actual changes):*

   **Branch:** `admin-filters-map-ux`

   **1. `feat: add status filter dropdown to parking spots table`**
   - `frontend/src/pages/AdminPage.tsx` — added statusFilter state, select in Status column header
   - `frontend/src/hooks/useSpots.ts` — added helper
   ```
   git add frontend/src/pages/AdminPage.tsx frontend/src/hooks/useSpots.ts
   git commit -m "feat: add status filter dropdown to parking spots table"
   ```

   **2. `fix: align search bar and button height on owners page`**
   - `frontend/src/pages/OwnersPage.tsx` — both now use Mantine size="sm"
   ```
   git add frontend/src/pages/OwnersPage.tsx
   git commit -m "fix: align search bar and button height on owners page"
   ```

8. After all commits, print a **Merge Request description** based on the full set of changes. Format:

   ---
   **MR Description**

   ## What changed
   A short paragraph (2–4 sentences) summarising the overall scope of the changes — what was added, fixed, or improved and why.

   ## Changes
   A bullet list — one bullet per logical commit, written in plain English (not commit message style). Focus on what the user will see or experience.

   ## Notes
   Any caveats, follow-ups, or things a reviewer should pay attention to. Omit this section if there's nothing relevant.
   ---

Do NOT stage or commit anything. This is analysis only.
If there are no unstaged changes, say so clearly.
