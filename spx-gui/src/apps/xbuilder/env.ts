export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL as string
export const usercontentBaseUrl = import.meta.env.VITE_USERCONTENT_BASE_URL as string
export const usercontentBucket = import.meta.env.VITE_USERCONTENT_BUCKET as string
export const disableAIGC = import.meta.env.VITE_DISABLE_AIGC === 'true'
export const spxVersion = import.meta.env.VITE_SPX_VERSION as string
export const showLicense = import.meta.env.VITE_SHOW_LICENSE === 'true'
export const showTutorialsEntry = import.meta.env.VITE_SHOW_TUTORIALS_ENTRY === 'true'
export const defaultLang = (import.meta.env.VITE_DEFAULT_LANG as string) || 'en'
export const accountOAuthClientId = import.meta.env.VITE_ACCOUNT_OAUTH_CLIENT_ID as string
const sentryTracesSampleRate = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string)
const sentryLSPSampleRate = parseFloat(import.meta.env.VITE_SENTRY_LSP_SAMPLE_RATE as string)
export const sentry = {
  dsn: (import.meta.env.VITE_SENTRY_DSN as string) || '',
  tracesSampleRate: Number.isNaN(sentryTracesSampleRate) ? 0.1 : sentryTracesSampleRate,
  lspSampleRate: Number.isNaN(sentryLSPSampleRate) ? 0.1 : sentryLSPSampleRate
}
