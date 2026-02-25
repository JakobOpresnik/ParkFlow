Debug and fix the following issue: $ARGUMENTS
Steps:

Identify the root cause — explain it clearly before touching any code
Fix the issue with minimal scope (don't refactor unrelated code)
Add a regression test so this bug can't silently come back
Run bun run build — zero TypeScript errors
Run bun test — all tests pass
Run bun run lint:fix and bun run format

Reply with:

Root cause (1-2 sentences)
What you changed and why
What the regression test covers
