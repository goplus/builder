/* eslint-disable @typescript-eslint/naming-convention */
/// <reference types="vite/client" />
 
interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_CASDOOR_ENDPOINT: string
  readonly VITE_CASDOOR_CLIENT_ID: string
  readonly VITE_CASDOOR_ORGANIZATION_NAME: string
  readonly VITE_CASDOOR_APP_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
