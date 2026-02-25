Implement a new feature from the backlog.
Steps:

Read CLAUDE.md and TASKS.md to understand current project state
Find the task matching: $ARGUMENTS
Move it to ## 🔥 In Progress in TASKS.md
Implement the feature following all conventions in CLAUDE.md
Write tests if the feature contains non-trivial logic (see Testing section in CLAUDE.md)
Run bun run build — fix all TypeScript errors before continuing
Run bun test — all tests must pass
Run bun run lint:fix and bun run format
Move task to ## ✅ Done in TASKS.md
Reply with a short summary: what you built, what files were created/modified, and any decisions made

If anything is unclear about the requirements, ask before implementing.
