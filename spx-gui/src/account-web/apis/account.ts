import { Client } from '@/apis/common/client'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import type { OAuthContext } from '../utils/oauth'

export interface AccountUser {
  id: string
  createdAt: string
  updatedAt: string
  username: string
  displayName: string
  avatar: string
}

export interface CurrentAccountSession {
  id: string
  createdAt: string
  updatedAt: string
  lastUsedAt: string
  expiresAt: string
  current: boolean
  user: AccountUser
  userAgent?: string | null
  ipAddress?: string | null
}

export interface IdentityProvider {
  name: string
  displayName: string
  enabled: boolean
}

interface IdentityProviderListResponse {
  data: IdentityProvider[]
}

function filterEnabledIdentityProviders(providers: IdentityProvider[]): IdentityProvider[] {
  return providers.filter((provider) => provider.enabled)
}

const client = new Client({ baseUrl: '/api' })

function isUnauthorizedError(error: unknown) {
  return (
    (error instanceof ApiException && error.code === ApiExceptionCode.errorUnauthorized) ||
    (error instanceof Error && error.message.includes('status 401 for api call:'))
  )
}

export async function getCurrentAccountSession(): Promise<CurrentAccountSession | null> {
  try {
    return (await client.get('/session')) as CurrentAccountSession
  } catch (error) {
    if (isUnauthorizedError(error)) return null
    throw error
  }
}

export async function deleteCurrentAccountSession(): Promise<void> {
  await client.delete('/session')
}

export async function getIdentityProviders(context?: OAuthContext): Promise<IdentityProvider[]> {
  const response = (await client.get(
    '/identity-providers',
    context == null
      ? undefined
      : {
          clientID: context.clientId,
          requestURI: context.requestUri
        }
  )) as IdentityProviderListResponse
  return filterEnabledIdentityProviders(response.data)
}

export interface PasswordSignInPayload {
  username: string
  password: string
}

export async function createPasswordSession(payload: PasswordSignInPayload): Promise<CurrentAccountSession> {
  return (await client.post('/session', {
    method: 'password',
    username: payload.username,
    password: payload.password
  })) as CurrentAccountSession
}
