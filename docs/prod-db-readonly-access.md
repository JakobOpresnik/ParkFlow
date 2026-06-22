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
(`~/.claude.json` for the MCP, or your password manager).

## 3. Open the tunnel

```bash
ssh -f -N -o ConnectTimeout=10 parkflow   # background tunnel on 15432
nc -z localhost 15432 && echo UP          # verify
```

A timeout on port 22 means the VPN is off.

## 4. Connect

`psql` may not be installed locally. Two options:

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

## 5. (Optional) Claude Code MCP

A `postgres-prod` MCP server (`uvx postgres-mcp --access-mode=restricted`,
`DATABASE_URI=postgresql://parkflow_readonly:<pw>@localhost:15432/parkflow`) gives Claude
restricted, read-only SQL access.

**The MCP connects to the DB only at Claude startup**, so the order is strict:

1. Connect VPN
2. `ssh -f -N parkflow` (tunnel up on 15432)
3. **Then** start / restart Claude Code

If Claude was launched while the tunnel was down, the MCP is unavailable for the entire
session — there is no in-session fix, you must restart.
