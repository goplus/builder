// Account APIs for app account.

import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { accountClient, type AccountIdentityProvider, type AccountSession, type AccountUser } from './common'
import { DefaultException } from '@/utils/exception/base'

export type { AccountUser }

export type OAuthRequest = {
  clientId: string
  requestUri: string
}

export type CurrentAccountSession = AccountSession & {
  user: AccountUser
}

export async function getSession(): Promise<CurrentAccountSession | null> {
  try {
    return (await accountClient.get('/session')) as CurrentAccountSession
  } catch (error) {
    if (error instanceof ApiException && error.code === ApiExceptionCode.errorUnauthorized) return null
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

export async function createSessionWithPassword(payload: PasswordSignInPayload): Promise<CurrentAccountSession> {
  return (await accountClient
    .post('/session', {
      method: 'password',
      username: payload.username,
      password: payload.password
    })
    .catch((e) => {
      if (e instanceof ApiException && e.code === ApiExceptionCode.errorUnauthorized) {
        throw new DefaultException({
          en: 'Invalid username or password',
          zh: '用户名或密码错误'
        })
      }
      throw e
    })) as CurrentAccountSession
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
