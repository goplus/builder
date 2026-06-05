/**
 * Utilities for the Account Web sign-in page.
 *
 * These are used by the sign-in page (apps/account/) to parse OAuth context
 * from query parameters, build authorize URLs, and track pending
 * authorization state in sessionStorage.
 *
 * This file is specific to the Account Web sign-in flow and is not used by
 * the main xbuilder.com OAuth client logic.
 */

export interface OAuthContext {
  clientId: string
  requestUri: string
}

export function parseOAuthContext(search: string = window.location.search): OAuthContext | null {
  const params = new URLSearchParams(search)
  const clientId = params.get('clientID')?.trim() ?? ''
  const requestUri = params.get('requestURI')?.trim() ?? ''
  if (clientId === '' || requestUri === '') return null
  return { clientId, requestUri }
}

export function getOAuthError(search: string = window.location.search): string | null {
  const params = new URLSearchParams(search)
  const error = params.get('error')?.trim() ?? ''
  if (error === '') return null
  const description = params.get('error_description')?.trim() ?? ''
  return description === '' ? error : `${error}: ${description}`
}

export function buildAccountApiUrl(path: string, query?: Record<string, string>) {
  const url = new URL(path, window.location.origin)
  if (query != null) {
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

export function buildOAuthAuthorizeUrl(context: OAuthContext) {
  return buildAccountApiUrl('/api/oauth/authorize', {
    client_id: context.clientId,
    request_uri: context.requestUri
  })
}

export function buildIdentityProviderAuthorizeUrl(provider: string, context: OAuthContext) {
  return buildAccountApiUrl(`/api/identity-providers/${encodeURIComponent(provider)}/authorize`, {
    clientID: context.clientId,
    requestURI: context.requestUri
  })
}

function getPendingAuthorizationKey(context: OAuthContext) {
  return `account-web:pending-authorization:${context.clientId}:${context.requestUri}`
}

export function hasPendingAuthorization(context: OAuthContext) {
  return sessionStorage.getItem(getPendingAuthorizationKey(context)) === '1'
}

export function markPendingAuthorization(context: OAuthContext) {
  sessionStorage.setItem(getPendingAuthorizationKey(context), '1')
}

export function clearPendingAuthorization(context: OAuthContext) {
  sessionStorage.removeItem(getPendingAuthorizationKey(context))
}
