/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_TG_BOT_USERNAME: string
  readonly VITE_TG_APP_LOGIN_ENABLED?: string
  readonly VITE_TG_GROUP_URL?: string
  readonly VITE_TG_MEMBERSHIP_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
