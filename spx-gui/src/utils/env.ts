/**
 * @file env file
 * @desc Exports enviroment variables from `.env.*` file
 */

/// <reference types="vite/client" />

// Base URL for spx-backend APIs, e.g. `/api`
export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string

export const staticConfig = {
  /** Base URL for static files' uploading, e.g. `https://builder-static.goplus.org` */
  baseUrl: import.meta.env.VITE_STATIC_BASE_URL as string,
  /**
   * Region for Kodo bucket, e.g. `na0`, see details in https://developer.qiniu.com/kodo/1671/region-endpoint-fq.
   * Specify region so the js-sdk can skip querying before uploading
   */
  bucketRegion: import.meta.env.VITE_STATIC_BUCKET_REGION as string || undefined
}

// Casdoor configurations
export const casdoorConfig = {
  serverUrl: import.meta.env.VITE_CASDOOR_ENDPOINT as string,
  clientId: import.meta.env.VITE_CASDOOR_CLIENT_ID as string,
  organizationName: import.meta.env.VITE_CASDOOR_ORGANIZATION_NAME as string,
  appName: import.meta.env.VITE_CASDOOR_APP_NAME as string
}
