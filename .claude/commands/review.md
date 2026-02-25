Review the code quality of the following: $ARGUMENTS
If no argument is given, review all recently modified files.
Check for:

TypeScript — no any types, proper interfaces in src/types/
Error handling — all async functions have try/catch, API errors return { error: message }
Component size — flag any component over ~150 lines as a candidate for splitting
Conventions — naming, file structure, no inline styles, no hardcoded values
Tests — is there logic that should be tested but isn't?
Security — no secrets or credentials in code, no DATABASE_URL or backend secrets on frontend
Accessibility — interactive elements have labels, keyboard navigation works

Run bun run build and bun run lint and report any errors found.
Output a short report:

✅ What looks good
⚠️ What should be improved (with file + line references)
🔴 What must be fixed before this is considered done
