<div align="center">

# 🐘 Production DB — Read-Only Access

**Inspect the production ParkFlow PostgreSQL safely — SELECT only, ever.**
VPN + SSH tunnel + a dedicated read-only role, for debugging and data inspection.

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Access](https://img.shields.io/badge/access-read--only-brightgreen?style=flat-square)
![Network](https://img.shields.io/badge/network-VPN_%2B_SSH_tunnel-0078D4?style=flat-square)
![Role](https://img.shields.io/badge/role-parkflow__readonly-lightgrey?style=flat-square)

</div>

> [!CAUTION]
> **READ-ONLY ONLY.** Never `INSERT`/`UPDATE`/`DELETE`, never restart or kill
> containers on the prod host. All changes to prod go through CI/CD, never by hand.

---

## 📑 Contents

- [📋 Prerequisites](#-prerequisites)
- [🖥️ Production Server](#️-production-server)
- [⚙️ Setup & Connect](#️-setup--connect)
- [🤖 Claude Code MCP (Optional)](#-claude-code-mcp-optional)
- [🔄 Rotate the Read-Only Password](#-rotate-the-read-only-password)
- [✅ Verify the Role's Permissions](#-verify-the-roles-permissions)

---

## 📋 Prerequisites

| Requirement               | Detail                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| 🔒 VPN / internal network | The prod host is only reachable internally — off-VPN, port 22 times out |
| 🔑 SSH key authorized     | Your public key must be on the server's `deploy` account (ask an admin) |
| 🔐 Read-only DB password  | `<pw>` throughout this doc — **not** in this repo, ask an admin (Jakob) |

Keep the password in your local config only (`~/.claude.json` for the MCP, or your
password manager).

---

## 🖥️ Production Server

|                   |                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| 🌐 Host           | `parkflow.int.matheo.si` → internal IP `10.0.0.9`                                                                    |
| 👤 Deploy account | `deploy` (CI/CD-managed deploy dir `~/parkflow`)                                                                     |
| 🐳 Stack          | `compose.yml`, db = `postgres:16` — `db:5432` inside the compose network                                             |
| 🔌 DB port        | Published to the **loopback only** (`127.0.0.1:5432`) — reachable via the SSH tunnel, invisible to the wider network |

> [!WARNING]
> The superuser `parkflow` (password injected at deploy from the `POSTGRES_PASSWORD`
> CI/CD variable, never in this repo) is **not for browsing** — use the read-only role.
> The `docker compose exec db psql -U parkflow` commands in this doc need no password:
> they authenticate over the container's local socket.

`docker compose` commands may warn `Found multiple config files: compose.yml,
docker-compose.yml` — harmless, it picks `compose.yml`.

---

## ⚙️ Setup & Connect

### 1️⃣ SSH config

Add this block to `~/.ssh/config`:

```sshconfig
Host parkflow
  HostName parkflow.int.matheo.si
  User deploy
  IdentityFile ~/.ssh/id_rsa
  AddKeysToAgent yes
  LocalForward 15432 localhost:5432
```

`LocalForward` tunnels your local port **15432** to the database's `5432` on the server.

> [!WARNING]
> On **macOS** you may add `UseKeychain yes` to store the key passphrase in the Keychain.
> Don't add it on Windows or Linux — it's an Apple-only option, and their OpenSSH aborts
> every `ssh` call with `Unsupported option UseKeychain`.

### 2️⃣ Read-only DB role

A dedicated role `parkflow_readonly` (SELECT-only on schema `public` + default
privileges) is used for all browsing.

> [!NOTE]
> This role was created manually on prod (via `docker compose exec db psql -U parkflow`),
> **not** via a migration. It would **not** survive a DB volume rebuild — recreate it
> manually if that happens:
>
> ```sql
> CREATE ROLE parkflow_readonly LOGIN PASSWORD '<pw>';
> GRANT CONNECT ON DATABASE parkflow TO parkflow_readonly;
> GRANT USAGE ON SCHEMA public TO parkflow_readonly;
> GRANT SELECT ON ALL TABLES IN SCHEMA public TO parkflow_readonly;
> ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO parkflow_readonly;
> ```

### 3️⃣ Open the tunnel

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

### 4️⃣ Connect

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

**c) GUI client (Beekeeper Studio / DBeaver)** — two ways, depending on whether the
manual tunnel from step 3️⃣ is already open:

- **Tunnel already open:** connect directly to `localhost:15432`, database `parkflow`,
  user `parkflow_readonly`, password `<pw>`. No SSH settings needed in the client.
- **Or let the client manage its own tunnel** (skip step 3️⃣): in the connection's
  SSH/Tunnel tab, set host `parkflow.int.matheo.si`, user `deploy`, auth via your private
  key (`~/.ssh/id_rsa`), and forward to the DB host's `localhost:5432`. Then set the DB
  connection itself to host `localhost`, port `5432` (the client rewrites this through
  the tunnel), database `parkflow`, user `parkflow_readonly`, password `<pw>`.

Either way, still VPN-gated — the client's tunnel just replaces your manual `ssh -f -N`.

---

## 🤖 Claude Code MCP (Optional)

Register a `postgres-prod` MCP server for restricted, read-only SQL access from Claude
(one-time setup, per machine). Requires [uv](https://docs.astral.sh/uv/) — install with
`pip install uv` if `uvx --version` fails:

```bash
claude mcp add postgres-prod -s local -e 'DATABASE_URI=postgresql://parkflow_readonly:<pw>@localhost:15432/parkflow' -- uvx --with "mcp<2" postgres-mcp --access-mode=restricted
```

The `--with "mcp<2"` pin is required: `postgres-mcp` still imports the v1 `FastMCP` API
and crashes on import against the mcp 2.x Python SDK.

> [!IMPORTANT]
> Paste it as a single unbroken line with the real password substituted in for `<pw>` (no
> angle brackets) — a split line or literal `<pw>` will make the CLI swallow the `-e`
> value and error with `option '-e, --env <env...>' argument missing`.

**The MCP connects to the DB only at Claude startup**, so the order is strict:

1. Connect VPN
2. `ssh -f -N parkflow` (tunnel up on 15432) — verify with step 3️⃣ above
3. **Then** start / restart Claude Code (or run `/mcp` → reconnect `postgres-prod`)

### 🐛 Troubleshooting `CONNECTION_CLOSED`

The error is generic — it means the MCP process died or never spawned. Check in order:

<details>
<summary><strong>1. Tunnel down</strong></summary>

`Test-NetConnection localhost -Port 15432` (PowerShell). If closed: VPN +
`ssh -f -N parkflow`. On Windows, a macOS `UseKeychain yes` line in `~/.ssh/config`
aborts every ssh call — remove it.

</details>

<details>
<summary><strong>2. <code>uvx</code> not installed</strong></summary>

`uvx --version`; a missing binary surfaces as CONNECTION_CLOSED, not "command not
found". Fix: `pip install uv`.

</details>

<details>
<summary><strong>3. Server crashes on start</strong></summary>

E.g. missing the `--with "mcp<2"` pin. Reproduce by piping a JSON-RPC `initialize` line
into the exact registered command and reading stderr.

</details>

---

## 🔄 Rotate the Read-Only Password

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
re-add per the [MCP section](#-claude-code-mcp-optional) with the new password) and your
password manager.

---

## ✅ Verify the Role's Permissions

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
`GRANT`/`REVOKE` statements from step [2️⃣](#2️⃣-read-only-db-role).

---

<div align="center">

[Project README](../README.md) · [Report an issue](https://git.matheo.si/jakobo/parkflow/-/issues)

</div>
