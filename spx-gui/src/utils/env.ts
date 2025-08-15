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

/** Whether to show the license information (including copyright) in the footer. */
export const showLicense = import.meta.env.VITE_SHOW_LICENSE === 'true'

/**
 * Sentry DSN for error reporting
 * Empty string means Sentry is disabled
 */
export const sentryDsn = (import.meta.env.VITE_SENTRY_DSN as string) || ''

/**
 * Sampling rate for Sentry traces (0.0 to 1.0)
 * This determines what percentage of transactions are sent to Sentry
 */
export const sentryTracesSampleRate = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string) || 0.1

/**
 * Sampling rate for Sentry LSP traces (0.0 to 1.0)
 * This determines what percentage of LSP transactions are sent to Sentry
 */
export const sentryLSPSampleRate = parseFloat(import.meta.env.VITE_SENTRY_LSP_SAMPLE_RATE as string) || 0.1

/** If tutorials entry should be shown in the Navbar */
export const showTutorialsEntry = import.meta.env.VITE_SHOW_TUTORIALS_ENTRY === 'true'
