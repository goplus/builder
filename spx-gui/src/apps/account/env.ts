export const defaultLang = (import.meta.env.VITE_DEFAULT_LANG as string) || 'en'
const sentryTracesSampleRate = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE as string)
const sentryLSPSampleRate = parseFloat(import.meta.env.VITE_SENTRY_LSP_SAMPLE_RATE as string)
export const sentry = {
  dsn: (import.meta.env.VITE_SENTRY_DSN as string) || '',
  tracesSampleRate: Number.isNaN(sentryTracesSampleRate) ? 0.1 : sentryTracesSampleRate,
  lspSampleRate: Number.isNaN(sentryLSPSampleRate) ? 0.1 : sentryLSPSampleRate
}
