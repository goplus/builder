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

export type AccountAppStatus = 'active' | 'disabled'

export type AccountAppOnlyScope = 'account:app:read' | 'account:user:read'

export type AccountApp = AccountModel & {
  /** Unique app name */
  name: string
  /** Display name of the app */
  displayName: string
  /** Public HTTP URL of the Account-managed app avatar, or null when unset */
  avatar: string | null
  /** Optional plain-text app description */
  description: string | null
  /** App status */
  status: AccountAppStatus
}

export type AdminAccountApp = AccountApp & {
  /** Approved scopes for app-only access */
  clientCredentialsScopes: AccountAppOnlyScope[]
}

export type AccountOAuthClientType = 'public' | 'confidential'

export type AccountOAuthGrantType = 'authorization_code' | 'refresh_token' | 'client_credentials'

export type AccountOAuthClient = AccountModel & {
  /** Stable ID of the owning app */
  appID: string
  /** OAuth client ID used in OAuth requests */
  clientID: string
  /** Management name unique within the owning app */
  name: string
  /** OAuth client authentication type */
  clientType: AccountOAuthClientType
  /** Client status */
  status: AccountAppStatus
  /** Allowed OAuth grant types */
  grantTypes: AccountOAuthGrantType[]
  /** Allowed redirect URIs */
  redirectURIs: string[]
  /** Read-only redirect URI patterns for HTTPS preview environments */
  redirectURIPatterns: string[]
}

export type AccountOAuthClientSecret = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Client secret name */
  name: string
}

export type CreatedAccountOAuthClientSecret = AccountOAuthClientSecret & {
  /** One-time client secret value */
  value: string
}

export type AccountAppGrant = AccountModel & {
  /** ID of the app authorized by the user */
  appID: string
  /** ID of the user who authorized the app */
  userID: string
  /** Account OAuth scope granted to the app */
  scope: string
  /** App authorized by the user */
  app: AccountApp
  /** Timestamp when the app grant was last used */
  lastUsedAt?: string | null
  /** Timestamp when the app grant was revoked */
  revokedAt?: string | null
}

export type AccountAppTokenType = 'accessToken' | 'refreshToken'

export type AccountAppToken = AccountModel & {
  /** Management ID of the issuing OAuth client */
  oauthClientID: string
  /** ID of the app grant associated with the token */
  grantID: string
  /** OAuth token type */
  tokenType: AccountAppTokenType
  /** Account OAuth scope associated with the token */
  scope: string
  /** Human-readable token name */
  name: string
  /** Expiration timestamp */
  expiresAt: string
  /** Timestamp when the token was last used */
  lastUsedAt?: string | null
  /** Timestamp when this token was consumed during refresh-token rotation. Applies to refresh tokens only. */
  consumedAt?: string | null
  /** Timestamp when the token was revoked */
  revokedAt?: string | null
}

export type CreatedAccountAppToken = AccountAppToken & {
  /** One-time token value */
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
