# Ticket: Integrate OAuth2.0 Authentication (authentik)

## Objective

Integrate OAuth2.0 login using **authentik** into the existing system (frontend + backend repositories).

The OAuth application is **already configured in authentik**.
Configuration inside the authentik admin UI is **out of scope** for this task.

All required configuration values will be provided.

---

## Scope

Implement authentication using:

**OAuth2 Authorization Code Flow (backend token exchange).**

Frontend authenticates users via authentik, while backend validates identity and issues its own session/JWT.

---

## Configuration Inputs (Provided)

The following values will be delivered securely:

```
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=

OAUTH_AUTH_URL=
OAUTH_TOKEN_URL=
OAUTH_JWKS_URL=
OAUTH_LOGOUT_URL=

OAUTH_REDIRECT_URI=https://<frontend-domain>/auth/callback
```

Do not modify these values.

---

## Backend Tasks

### 1. Environment Variables (`backend/.env`)

```
OAUTH_CLIENT_ID=
OAUTH_CLIENT_SECRET=

OAUTH_TOKEN_URL=
OAUTH_JWKS_URL=
OAUTH_REDIRECT_URI=

JWT_SECRET=<generate_random_secret>
```

---

### 2. Implement Endpoint

**POST /auth/exchange**

Request:

```json
{
  "code": "<authorization_code>"
}
```

Backend must:

1. Exchange authorization code at `OAUTH_TOKEN_URL`.
2. Validate returned `id_token` using `OAUTH_JWKS_URL`.
3. Extract user identity (`sub`, `email`, etc.).
4. Issue internal JWT signed with `JWT_SECRET`.

Response:

```json
{
  "token": "<backend_jwt>"
}
```

---

### 3. Protect API Routes

All protected endpoints must require:

```
Authorization: Bearer <backend_jwt>
```

---

## Frontend Tasks

### 1. Environment Variables (`frontend/.env`)

```
VITE_OAUTH_CLIENT_ID=
VITE_OAUTH_AUTH_URL=
VITE_OAUTH_REDIRECT_URI=
VITE_BACKEND_API=https://<backend-domain>
```

---

### 2. Login Flow

Redirect user to:

```
OAUTH_AUTH_URL
 ?response_type=code
 &client_id=VITE_OAUTH_CLIENT_ID
 &redirect_uri=VITE_OAUTH_REDIRECT_URI
 &scope=openid profile email
```

---

### 3. Callback Page

Route:

```
/auth/callback
```

Steps:

1. Read `code` from URL.
2. Call backend `POST /auth/exchange`.
3. Store returned backend JWT.
4. Use JWT for authenticated API requests.

---

### 4. Logout

* Remove stored JWT.
* Redirect user to:

```
OAUTH_LOGOUT_URL?post_logout_redirect_uri=<frontend-url>
```

---

## Security Requirements

* Client secret must exist only in backend.
* Backend must validate token signature via JWKS.
* Frontend must never call token endpoint directly.
* Backend issues its own session/JWT.
* HTTPS required in all environments.

---

## Acceptance Criteria

* User can log in via authentik.
* Callback successfully exchanges authorization code.
* Backend issues internal JWT.
* Protected API endpoints require JWT.
* Logout works and redirects correctly.

---
