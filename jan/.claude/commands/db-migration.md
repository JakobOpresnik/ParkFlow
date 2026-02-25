Create a database migration for PostgreSQL.
Migration task: $ARGUMENTS
Steps:

Create a new file backend/migrations/NNN_description.sql (increment the number)
Write the SQL migration (CREATE TABLE, ALTER TABLE, ADD COLUMN, etc.)
Check it matches the schema defined in CLAUDE.md — if there's a conflict, point it out and ask
Update the corresponding TypeScript types in frontend/src/types/index.ts
If new columns or tables are added, update the backend routes that interact with them
Update the schema section in CLAUDE.md if the change is permanent

Output:

The migration SQL file content
A rollback SQL snippet
How to run it: psql $DATABASE_URL -f backend/migrations/NNN_description.sql
A note on whether existing data needs to be migrated
