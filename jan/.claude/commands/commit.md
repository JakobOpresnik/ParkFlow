Create a git commit for all current changes.

Steps:
1. Run `git status` to see what has changed
2. Run `git diff --staged` and `git diff` to understand what was modified
3. Group changes by type (feat, fix, chore, refactor, docs)
4. Run `bun run build` — do not commit if TypeScript errors exist
5. Run `git add -A`
6. Write a commit message following conventional commits:
   - Single change: `git commit -m "feat: add SpotCard component"`
   - Multiple changes: use multiline body
     ```
     git commit -m "feat: add owner assignment flow

     - AssignOwner modal with owner dropdown
     - PATCH /api/spots/:id/owner endpoint
     - React Query cache invalidation on assign
     "
     ```
7. Report what was committed and the full commit message

If there is nothing to commit, say so clearly.
If $ARGUMENTS is provided, use it as context or as the commit message directly.
