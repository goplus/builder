/**
 * API client for Account Web sign-in page session management.
 *
 * These are used by the sign-in page (apps/account/) to interact with
 * the Account API for session operations — checking current session,
 * signing in with password, listing identity providers, and clearing
 * the session on account switch.
 *
 * This file is specific to the Account Web sign-in flow and is not used by
 * the main xbuilder.com OAuth client logic (see account-oauth.ts for that).
 */

import { Client } from '@/apis/common/client'
import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import type { OAuthContext } from '@/utils/account/sign-in'

const client = new Client({ baseUrl: '/api' })

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

export interface IdentityProvider {
  name: string
  displayName: string
  enabled: boolean
}

interface IdentityProviderListResponse {
  data: IdentityProvider[]
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
  return response.data.filter((provider) => provider.enabled)
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
