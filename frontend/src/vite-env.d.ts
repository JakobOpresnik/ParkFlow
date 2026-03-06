/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined
  readonly VITE_OAUTH_AUTHORITY: string | undefined
  readonly VITE_OAUTH_CLIENT_ID: string | undefined
  readonly VITE_OAUTH_REDIRECT_URI: string | undefined
  readonly VITE_OAUTH_ADMIN_GROUP: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
