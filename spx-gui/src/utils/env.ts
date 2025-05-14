/**
 * @file env file
 * @desc Exports environment variables from `.env.*` file
 */

/// <reference types="vite/client" />

// Base URL for spx-backend APIs, e.g. `/api`
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string

// Base URL for the static assets. For example, `monaco-editor` files
export const usercontentBaseUrl = import.meta.env.VITE_USERCONTENT_BASE_URL as string
export const usercontentUploadBaseUrl = import.meta.env.VITE_USERCONTENT_UPLOAD_BASE_URL as string

// Casdoor configurations
export const casdoorConfig = {
  serverUrl: import.meta.env.VITE_CASDOOR_ENDPOINT as string,
  clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID as string,
  organizationName: import.meta.env.VITE_CASDOOR_ORGANIZATION_NAME as string,
  appName: import.meta.env.VITE_CASDOOR_APP_NAME as string
}

/**
 * If we should disable features that rely on AIGC service.
 * For now AIGC service is not ready for production. We disable it until it's ready.
 */
export const disableAIGC = import.meta.env.VITE_DISABLE_AIGC === 'true'

export const spxVersion = import.meta.env.VITE_SPX_VERSION as string

/** Whether to show the license information in the footer. */
export const showLicense = import.meta.env.VITE_SHOW_LICENSE === 'true'
