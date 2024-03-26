/**
 * @file env file
 * @desc Exports enviroment variables from `.env.*` file
 */

/// <reference types="vite/client" />

// Base URL for spx-backend APIs, e.g. `/api`
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string

// Base URL for the application, e.g. `https://builder.goplus.org`
// TODO: what about import.meta.BASE_URL
export const publishBaseUrl = import.meta.env.VITE_PUBLISH_BASE_UR as string

// Base URL for static files' uploading, e.g. `https://builder-static.goplus.org`
export const staticBaseUrl = import.meta.env.VITE_STATIC_BASE_URL as string

// Casdoor configurations
export const casdoorConfig = {
  serverUrl: import.meta.env.VITE_CASDOOR_ENDPOINT as string,
  clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID as string,
  organizationName: import.meta.env.VITE_CASDOOR_ORGANIZATION_NAME as string,
  appName: import.meta.env.VITE_CASDOOR_APP_NAME as string
}
