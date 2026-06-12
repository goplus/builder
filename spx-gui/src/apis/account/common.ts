import { Client } from '../common/client'

export type AccountModel = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
}

export type AccountUser = AccountModel & {
  /** Unique username of the account user */
  username: string
  /** Display name of the account user */
  displayName: string
  /** Public HTTP URL of the account user's avatar image */
  avatar: string
}

export type AccountIdentityProviderName = 'wechat' | 'qq' | 'github' | 'apple' | 'google' | 'x'

export type AccountIdentityProvider = {
  /** Identity provider name */
  name: AccountIdentityProviderName
  /** Display name of the identity provider */
  displayName: string
  /** Whether the identity provider is currently available for hosted sign-in */
  enabled: boolean
}

export type AccountUserIdentity = AccountModel & {
  /** Identity provider that owns this third-party identity */
  provider: AccountIdentityProviderName
  /** Stable provider subject */
  subject: string
  /** Provider subject namespace when needed for provider-scoped identifiers */
  subjectNamespace?: string | null
  /** Provider display name retained for display and troubleshooting */
  displayName?: string | null
  /** Provider avatar URL retained for display and troubleshooting */
  avatar?: string | null
}

export type AccountSession = AccountModel & {
  /** Timestamp when the account session was last used */
  lastUsedAt: string
  /** Expiration timestamp */
  expiresAt: string
  /** User agent associated with the account session */
  userAgent?: string | null
  /** IP address associated with the account session */
  ipAddress?: string | null
}

export type AccountAppClientType = 'public' | 'confidential'

export type AccountAppStatus = 'active' | 'disabled'

export type AccountApp = AccountModel & {
  /** Unique app name */
  name: string
  /** Display name of the app */
  displayName: string
  /** OAuth client type of the app */
  clientType: AccountAppClientType
  /** App status */
  status: AccountAppStatus
  /** Allowed redirect URIs */
  redirectURIs: string[]
  /** Allowed web origins */
  allowedOrigins: string[]
}

export type AccountAppSecret = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** App secret name */
  name: string
}

export type CreatedAccountAppSecret = AccountAppSecret & {
  /** One-time app secret value */
  value: string
}

/**
 * Default client for the Account app to call its own APIs. These APIs:
 * - use the same origin as the page, under the `/api` path prefix
 * - rely on cookie-based authentication, with cookies included by default
 */
export const accountClient = new Client({
  baseUrl: '/api'
})
