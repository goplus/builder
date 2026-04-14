import { casdoorProviderParamName, casdoorQqProvider, casdoorWeChatProvider } from '@/utils/env'

export function getDefaultReturnTo() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

export function normalizeSafeReturnTo(input: string | null | undefined) {
  if (input == null || input === '') return '/'
  if (!input.startsWith('/')) return '/'
  if (input.startsWith('//')) return '/'
  return input
}

export function getSignInRoute(returnTo: string = getDefaultReturnTo()) {
  const safeReturnTo = normalizeSafeReturnTo(returnTo)
  if (safeReturnTo === '/') return '/sign-in'
  return `/sign-in?returnTo=${encodeURIComponent(safeReturnTo)}`
}

export function buildProviderParams(config: { providerParamName: string; providerValue: string }) {
  if (config.providerParamName === '' || config.providerValue === '') return null
  return { [config.providerParamName]: config.providerValue }
}

export function getWeChatProviderParams() {
  return buildProviderParams({
    providerParamName: casdoorProviderParamName,
    providerValue: casdoorWeChatProvider
  })
}

export function getQQProviderParams() {
  return buildProviderParams({
    providerParamName: casdoorProviderParamName,
    providerValue: casdoorQqProvider
  })
}
