<div align="center">

# 🔐 Authentication — Authentik SSO

**OAuth 2.0 Authorization Code + PKCE, backend token exchange, own JWTs.**
How ParkFlow logs users in, decides who is admin, and lets guests browse read-only.

![OAuth](https://img.shields.io/badge/OAuth_2.0-PKCE_S256-EB5424?style=flat-square&logo=openid&logoColor=white)
![Authentik](https://img.shields.io/badge/IdP-Authentik-FD4B2D?style=flat-square&logo=authentik&logoColor=white)
![JWT](https://img.shields.io/badge/session-backend_JWT_8h-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)

</div>

---

## 📑 Contents

- [⚡ How It Works](#-how-it-works)
- [🔁 Login Flow, Step by Step](#-login-flow-step-by-step)
- [👑 Roles](#-roles)
- [👤 Guest Mode](#-guest-mode)
- [🛡️ Route Protection](#️-route-protection)
- [⏳ Session Lifetime & Expiry](#-session-lifetime--expiry)
- [🚪 Logout](#-logout)
- [📚 Endpoints](#-endpoints)
- [🔑 Environment Variables](#-environment-variables)

---

## ⚡ How It Works

The frontend never sees the client secret and never calls the token endpoint. It runs
the **Authorization Code + PKCE** dance against Authentik, then hands the code to the
backend, which exchanges it, identifies the user, and issues **ParkFlow's own JWT** —
the only credential the API ever checks afterwards. There is **no per-request call to
Authentik**: `requireAuth` verifies the backend JWT locally with `JWT_SECRET`.

| Piece                                                 | File                                  |
| ----------------------------------------------------- | ------------------------------------- |
| 🖥️ OAuth config (authorize/end-session URLs, scopes)  | `frontend/src/lib/oauth.ts`           |
| 🖥️ Login page — starts the PKCE flow                  | `frontend/src/pages/LoginPage.tsx`    |
| 🖥️ Callback page — state check + code exchange        | `frontend/src/pages/CallbackPage.tsx` |
| 🖥️ Auth store — token storage, expiry, logout         | `frontend/src/store/authStore.ts`     |
| ⚙️ Exchange / guest / me endpoints                    | `backend/src/routes/auth.ts`          |
| ⚙️ `requireAuth` / `requireAdmin` / `requireNonGuest` | `backend/src/middleware/auth.ts`      |

---

## 🔁 Login Flow, Step by Step

1. **Login page** generates a PKCE `code_verifier` + S256 `code_challenge` and a random
   `state`, stores both in `sessionStorage`, and redirects the browser to Authentik's
   `authorize/` endpoint with `scope: openid profile email`.
2. Authentik authenticates the user and redirects back to **`/callback?code=…&state=…`**.
3. **Callback page** rejects a `state` mismatch (CSRF guard), then POSTs
   `{code, code_verifier, redirect_uri}` to **`POST /api/auth/exchange`**.
4. **Backend** exchanges the code at `OAUTH_TOKEN_URL` (adding the client secret, which
   only the backend holds), then:
   - validates the returned `id_token` signature via `OAUTH_JWKS_URL` — **best-effort**:
     a JWKS failure logs a warning and continues, it is not fatal;
   - fetches **userinfo** (`sub`, `preferred_username`, `name`, `groups`) with the
     access token — this is the identity source;
   - derives the role from `groups` (see [Roles](#-roles));
   - signs an **8-hour backend JWT** and returns `{token, id_token}`.
5. Frontend calls `GET /api/auth/me`, stores the user in the Zustand auth store and the
   tokens in `localStorage` (`pf_access_token`, `pf_id_token`), and navigates to `/`.

> [!NOTE]
> The JWT payload keys the user by **`preferred_username`**, not the opaque Authentik
> `sub` — so the web app and the Rocket.Chat bot (which only ever sees the username)
> store and match bookings under the same identity. First login per server start is
> logged with the resolved role and groups.

---

## 👑 Roles

| Role       | How it's granted                                                               | Can do                                                |
| ---------- | ------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 👑 `admin` | Userinfo `groups` contains `AUTHENTIK_ADMIN_GROUP` (default `parkflow-admins`) | Everything, incl. admin panel + admin endpoints       |
| 👤 `user`  | Any other SSO login                                                            | Browse + all self-service writes (booking, own spots) |
| 👻 `guest` | `POST /api/auth/guest` — no SSO account                                        | Read-only browsing; every write rejected              |

---

## 👤 Guest Mode

`POST /api/auth/guest` (no body) mints a **4-hour** JWT with a fresh anonymous identity
(`userId: guest:<uuid>`, role `guest`) so visitors can browse the map without an SSO
account. `requireNonGuest` blocks guests from every write endpoint, and the API
additionally strips personal data from some reads for guests (e.g. owner names in
presence-derived fields).

---

## 🛡️ Route Protection

All API endpoints require `Authorization: Bearer <backend JWT>` via `requireAuth`
(local `jwt.verify` against `JWT_SECRET` — invalid/expired → `401`). Layered on top:

| Middleware        | Effect                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| `requireAuth`     | Valid backend JWT → `req.user = {userId, username, displayName, role}` |
| `requireNonGuest` | `403` for `guest` tokens — used on all write endpoints                 |
| `requireAdmin`    | `403` unless `role === 'admin'`                                        |

Service-to-service endpoints (Rocket.Chat webhook, reminder triggers) use shared-secret
headers instead of a JWT — see the [README API reference](README.md#-api-reference).

---

## ⏳ Session Lifetime & Expiry

| Token          | Lifetime |
| -------------- | -------- |
| User/admin JWT | **8 h**  |
| Guest JWT      | **4 h**  |

The frontend decodes the JWT's `exp` claim and schedules a **proactive expiry**: when it
hits, tokens are cleared, a "session expired" flag is shown, and the browser is sent to
`/login` after 3 s. Returning to a backgrounded tab triggers the same check immediately
(`visibilitychange`) instead of waiting for the next API call to bounce with `401`.

---

## 🚪 Logout

- **Guests** — clear tokens, straight back to `/login` (no Authentik session exists).
- **SSO users** — clear tokens, then **RP-initiated logout** at Authentik's
  `end-session/` endpoint with `id_token_hint` and
  `post_logout_redirect_uri=<origin>/login`, ending the Authentik session too.

---

## 📚 Endpoints

| Method | Endpoint             | Description                                                                                                             |
| ------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `POST` | `/api/auth/exchange` | `{code, code_verifier, redirect_uri}` → `{token, id_token}`; `400` on missing fields, `401` on failed exchange/userinfo |
| `POST` | `/api/auth/guest`    | No body → `{token, id_token: null}` (4 h, role `guest`)                                                                 |
| `GET`  | `/api/auth/me`       | Backend JWT → `{id, username, displayName, role}`                                                                       |

---

## 🔑 Environment Variables

### ⚙️ Backend

| Variable                                  | Purpose                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `JWT_SECRET`                              | Signs ParkFlow's own JWTs                                        |
| `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` | Authentik OAuth application credentials (secret is backend-only) |
| `OAUTH_TOKEN_URL`                         | Authentik token endpoint for the code exchange                   |
| `OAUTH_JWKS_URL`                          | JWKS endpoint for the best-effort `id_token` check               |
| `AUTHENTIK_USERINFO_URL`                  | Userinfo endpoint — the identity source                          |
| `AUTHENTIK_ADMIN_GROUP`                   | Group name that grants the `admin` role                          |

### 🖥️ Frontend

| Variable                  | Purpose                                                                         |
| ------------------------- | ------------------------------------------------------------------------------- |
| `VITE_OAUTH_AUTHORITY`    | OIDC issuer URL (app slug path); authorize/end-session URLs are derived from it |
| `VITE_OAUTH_CLIENT_ID`    | OAuth client ID                                                                 |
| `VITE_OAUTH_REDIRECT_URI` | Must match Authentik's configured redirect — `<origin>/callback`                |
| `VITE_OAUTH_ADMIN_GROUP`  | Admin group name (must match the backend)                                       |

> [!CAUTION]
> `VITE_`-prefixed values are compiled into the public JS bundle — never put a secret in
> one. The client secret lives only in the backend env.

---

<div align="center">

[Project README](README.md) · [Report an issue](https://git.matheo.si/jakobo/parkflow/-/issues)

</div>
