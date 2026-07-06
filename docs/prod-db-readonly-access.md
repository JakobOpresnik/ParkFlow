# Production DB — Read-Only Access

How to inspect the **production** ParkFlow PostgreSQL database safely (read-only). For
debugging and data inspection only — never write to prod.

> ⚠️ **READ-ONLY ONLY.** Never `INSERT`/`UPDATE`/`DELETE`, never restart or kill
> containers on the prod host. All changes to prod go through CI/CD, never by hand.

## Prerequisites

- **VPN / internal network access.** The prod host is only reachable from the internal
  network. Off-VPN, port 22 times out.
- Your SSH public key must be authorized on the server's `deploy` account (ask an admin).

## Production server

- **Host:** `parkflow.int.matheo.si` → internal IP `10.0.0.9`
- **Deploy account:** `deploy` (CI/CD-managed deploy dir `~/parkflow`)
- **Stack:** `compose.yml`, db = `postgres:16` listening on `5432` inside the network
- **Superuser** `parkflow:parkflow` exists but **do not use it for browsing** — use the
  read-only role below.
- `docker compose` commands may warn `Found multiple config files: compose.yml,
  docker-compose.yml` — harmless, it picks `compose.yml`.

## 1. SSH config

Add this block to `~/.ssh/config`:

```sshconfig
Host parkflow
  HostName parkflow.int.matheo.si
  User deploy
  IdentityFile ~/.ssh/id_rsa
  AddKeysToAgent yes
  UseKeychain yes
  LocalForward 15432 localhost:5432
```

`LocalForward` tunnels your local port **15432** to the database's `5432` on the server.

## 2. Read-only DB role

A dedicated role `parkflow_readonly` (SELECT-only on schema `public` + default
privileges) is used for all browsing.

> **Note:** this role was created manually on prod (via
> `docker compose exec db psql -U parkflow`), **not** via a migration. It would **not**
> survive a DB volume rebuild — recreate it manually if that happens:
>
> ```sql
> CREATE ROLE parkflow_readonly LOGIN PASSWORD '<pw>';
> GRANT CONNECT ON DATABASE parkflow TO parkflow_readonly;
> GRANT USAGE ON SCHEMA public TO parkflow_readonly;
> GRANT SELECT ON ALL TABLES IN SCHEMA public TO parkflow_readonly;
> ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO parkflow_readonly;
> ```

The password is **not** stored in this repo. Keep it in your local config only
(`~/.claude.json` for the MCP, or your password manager). Contact Jakob
(jakob.opresnik@acex.si) to get it.

## 3. Open the tunnel

```bash
ssh -f -N -o ConnectTimeout=10 parkflow   # background tunnel on 15432
nc -z localhost 15432 && echo UP          # verify (if nc is installed)
```

No `nc` (e.g. Git Bash on Windows)? Use bash's built-in `/dev/tcp` instead:

```bash
(exec 3<>/dev/tcp/localhost/15432) && echo UP || echo DOWN
```

Or from PowerShell:

```powershell
Test-NetConnection -ComputerName localhost -Port 15432
```

A timeout on port 22 means the VPN is off.

## 4. Connect

`psql` may not be installed locally. A few options:

**a) psql (if installed):**

```bash
psql "postgresql://parkflow_readonly:<pw>@localhost:15432/parkflow"
```

**b) Bun + the backend `pg` driver (no psql needed):**

```bash
cd backend && bun -e '
  import { Client } from "pg"
  const c = new Client(process.env.U)
  await c.connect()
  console.log((await c.query("SELECT * FROM owners LIMIT 5")).rows)
  await c.end()
' 
# with U=postgresql://parkflow_readonly:<pw>@localhost:15432/parkflow
```

**c) GUI client (Beekeeper Studio / DBeaver):**

Two ways to wire up the connection, depending on whether the manual tunnel from step 3
is already open:

- **Tunnel already open (step 3):** connect directly to `localhost:15432`, database
  `parkflow`, user `parkflow_readonly`, password `<pw>`. No SSH settings needed in the
  client.
- **Or let the client manage its own tunnel** (skip step 3): in the connection's SSH/Tunnel
  tab, set host `parkflow.int.matheo.si`, user `deploy`, auth via your private key
  (`~/.ssh/id_rsa`), and forward to the DB host's `localhost:5432`. Then set the DB
  connection itself to host `localhost`, port `5432` (the client rewrites this through the
  tunnel), database `parkflow`, user `parkflow_readonly`, password `<pw>`.

Either way, still VPN-gated — the client's tunnel just replaces your manual `ssh -f -N`.

## 5. (Optional) Claude Code MCP

Register a `postgres-prod` MCP server for restricted, read-only SQL access from Claude
(one-time setup, per machine):

```bash
claude mcp add postgres-prod -s local -e 'DATABASE_URI=postgresql://parkflow_readonly:<pw>@localhost:15432/parkflow' -- uvx postgres-mcp --access-mode=restricted
```

Paste it as a single unbroken line with the real password substituted in for `<pw>` (no
angle brackets) — a split line or literal `<pw>` will make the CLI swallow the `-e` value
and error with `option '-e, --env <env...>' argument missing`.

**The MCP connects to the DB only at Claude startup**, so the order is strict:

1. Connect VPN
2. `ssh -f -N parkflow` (tunnel up on 15432) — verify with step 3 above
3. **Then** start / restart Claude Code

If Claude was launched while the tunnel was down, the MCP is unavailable for the entire
session — there is no in-session fix, you must restart. Same applies any time the tunnel
drops mid-session: restart Claude after reopening it.

## 6. Rotate the read-only password

Generate a URL-safe password (hex only — base64's `/+=` chars have broken things here
before, see prod DB password conventions):

```bash
openssl rand -hex 24
```

Set it on prod (via the superuser, same as role creation):

```bash
docker compose exec db psql -U parkflow -c "ALTER ROLE parkflow_readonly WITH PASSWORD '<new-pw>';"
```

Verify it actually works before relying on it — Postgres only stores a one-way hash, so
there's no command that reads a password back out, only test-connecting with it:

```bash
PGPASSWORD='<new-pw>' docker compose exec -e PGPASSWORD db psql -U parkflow_readonly -d parkflow -c "SELECT 1"
```

If that returns `1`, update the MCP registration (`claude mcp remove postgres-prod`, then
re-add per step 5 with the new password) and your password manager.

## 7. Verify the role's permissions

List all roles and their attributes:

```bash
docker compose exec db psql -U parkflow -c "\du"
```

`parkflow_readonly` should show no attributes (no `Superuser`/`Create role`/`Create DB`).
Check its actual table grants — should be `SELECT` only, on every table:

```bash
docker compose exec db psql -U parkflow -d parkflow -c "SELECT table_name, privilege_type FROM information_schema.table_privileges WHERE grantee = 'parkflow_readonly' ORDER BY table_name;"
```

If anything other than `SELECT` shows up, the grants were set up wrong — re-run the
`GRANT`/`REVOKE` statements from step 2.
