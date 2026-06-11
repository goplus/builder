// Account APIs for app account.

import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { accountClient, type AccountIdentityProvider, type AccountSessionBase, type AccountUser } from './common'

export type { AccountUser }

export type OAuthRequest = {
  clientId: string
  requestUri: string
}

export type AccountSession = AccountSessionBase & {
  current: boolean
  user: AccountUser
}

function isUnauthorizedError(error: unknown) {
  return (
    (error instanceof ApiException && error.code === ApiExceptionCode.errorUnauthorized) ||
    (error instanceof Error && error.message.includes('status 401 for api call:'))
  )
}

export async function getSession(): Promise<AccountSession | null> {
  try {
    return (await accountClient.get('/session')) as AccountSession
  } catch (error) {
    if (isUnauthorizedError(error)) return null
    throw error
  }
}

export async function deleteSession(): Promise<void> {
  await accountClient.delete('/session')
}

export type PasswordSignInPayload = {
  username: string
  password: string
}

export async function createSessionWithPassword(payload: PasswordSignInPayload): Promise<AccountSession> {
  return (await accountClient.post('/session', {
    method: 'password',
    username: payload.username,
    password: payload.password
  })) as AccountSession
}

export type IdentityProvider = AccountIdentityProvider

type IdentityProviderListResponse = {
  data: IdentityProvider[]
}

export async function getIdentityProviders(request?: OAuthRequest): Promise<IdentityProvider[]> {
  const response = (await accountClient.get(
    '/identity-providers',
    request == null
      ? undefined
      : {
          clientID: request.clientId,
          requestURI: request.requestUri
        }
  )) as IdentityProviderListResponse
  return response.data.filter((provider) => provider.enabled)
}

export function buildIdentityProviderAuthorizeUrl(provider: string, request: OAuthRequest) {
  const url = accountClient.urlFor(`/identity-providers/${encodeURIComponent(provider)}/authorize`)
  url.searchParams.set('clientID', request.clientId)
  url.searchParams.set('requestURI', request.requestUri)
  return url.toString()
}
