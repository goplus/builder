import Casdoor from 'casdoor-vue-sdk'
import type { App } from 'vue'
const config = {
  serverUrl: import.meta.env.VITE_CASDOOR_ENDPOINT,
  clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID,
  organizationName: import.meta.env.VITE_CASDOOR_ORGANIZATION_NAME,
  appName: import.meta.env.VITE_CASDOOR_APP_NAME,
  redirectPath: '/callback'
}

export const initCasdoor = (app: App) => {
  app.use(Casdoor, config)
}
