// Authority = the OIDC issuer URL, e.g. https://sso.matheo.si/application/o/park-flow/
// Authentik puts authorize/token/userinfo at the parent path (/application/o/)
// while end-session lives under the app slug.
const authority = (
  import.meta.env.VITE_OAUTH_AUTHORITY ??
  'http://localhost:9000/application/o/parkflow'
).replace(/\/+$/, '')

// Strip the app slug to get the base path: /application/o
const base = authority.replace(/\/[^/]+$/, '')

export const oauthConfig = {
  clientId: import.meta.env.VITE_OAUTH_CLIENT_ID ?? '',
  redirectUri:
    import.meta.env.VITE_OAUTH_REDIRECT_URI ??
    `${window.location.origin}/callback`,
  // Full URLs — used for browser redirects (not subject to CORS)
  authorizeUrl: `${base}/authorize/`,
  endSessionUrl: `${authority}/end-session/`,
  // Proxied paths — fetched by JS, routed through Vite proxy in dev / nginx in prod
  tokenUrl: '/oauth/token/',
  userinfoUrl: '/oauth/userinfo/',
  adminGroup: import.meta.env.VITE_OAUTH_ADMIN_GROUP ?? 'parkflow-admins',
  scopes: 'openid profile email',
} as const
