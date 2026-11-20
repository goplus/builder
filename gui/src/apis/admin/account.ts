import { client, SortOrder, type ByPage, type PaginationParams } from '@/apis/common'
import type {
  AccountAppGrant,
  AccountAppOnlyScope,
  AccountAppStatus,
  AccountAppToken,
  AccountAppTokenType,
  AccountOAuthClient,
  AccountOAuthClientSecret,
  AccountOAuthClientType,
  AccountOAuthGrantType,
  AccountSession,
  AccountUser,
  AccountUserIdentity,
  AccountWeChatReturnTarget,
  AdminAccountApp,
  CreatedAccountAppToken,
  CreatedAccountOAuthClientSecret
} from '@/apis/account/common'

export type {
  AccountApp,
  AccountAppGrant,
  AccountAppOnlyScope,
  AccountAppToken,
  AccountAppTokenType,
  AccountOAuthClient,
  AccountOAuthClientSecret,
  AccountOAuthClientType,
  AccountOAuthGrantType,
  AccountSession,
  AccountUser,
  AccountUserIdentity,
  AccountWeChatReturnTarget,
  AdminAccountApp,
  CreatedAccountAppToken,
  CreatedAccountOAuthClientSecret
} from '@/apis/account/common'

export const accountUsersKeywordMaxLength = 100
export const accountUserUsernameMaxLength = 100
export const accountUserDisplayNameMaxLength = 100
export const accountUserPasswordMinLength = 8
export const accountUserPasswordMaxLength = 128
export const accountAppDisplayNameMaxLength = 100
export const accountOAuthClientSecretNameMaxLength = 100
export const accountAppTokenNameMaxLength = 100

export type ListAccountUsersParams = PaginationParams & {
  /** Filter account users by username or display name pattern */
  keyword?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt'
  /** Order in which to sort the results */
  sortOrder?: SortOrder
}

export function listAccountUsers(params?: ListAccountUsersParams) {
  return client.get('/admin/account/users', params) as Promise<ByPage<AccountUser>>
}

export type CreateAccountUserParams = {
  /** Unique username of the account user */
  username: string
  /** Display name of the account user */
  displayName: string
  /** Optional administrator-managed password for the new user */
  password?: string
}

export function createAccountUser(params: CreateAccountUserParams) {
  return client.post('/admin/account/users', params) as Promise<AccountUser>
}

export function getAccountUser(userID: string) {
  return client.get(`/admin/account/users/${encodeURIComponent(userID)}`) as Promise<AccountUser>
}

export type UpdateAccountUserParams = {
  /** Display name of the account user */
  displayName?: string
}

export function updateAccountUser(userID: string, params: UpdateAccountUserParams) {
  return client.patch(`/admin/account/users/${encodeURIComponent(userID)}`, params) as Promise<AccountUser>
}

export async function updateAccountUserAvatar(userID: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  await client.putBinary(`/admin/account/users/${encodeURIComponent(userID)}/avatar`, form)
}

export type SetAccountUserPasswordParams = {
  /** New administrator-managed password */
  password: string
}

export function setAccountUserPassword(userID: string, params: SetAccountUserPasswordParams) {
  return client.put(`/admin/account/users/${encodeURIComponent(userID)}/password`, params) as Promise<void>
}

export function deleteAccountUserPassword(userID: string) {
  return client.delete(`/admin/account/users/${encodeURIComponent(userID)}/password`) as Promise<void>
}

export function listAccountUserIdentities(userID: string, params?: PaginationParams) {
  return client.get(`/admin/account/users/${encodeURIComponent(userID)}/identities`, params) as Promise<
    ByPage<AccountUserIdentity>
  >
}

export function deleteAccountUserIdentity(userID: string, identityID: string) {
  return client.delete(
    `/admin/account/users/${encodeURIComponent(userID)}/identities/${encodeURIComponent(identityID)}`
  ) as Promise<void>
}

export function listAccountUserSessions(userID: string, params?: PaginationParams) {
  return client.get(`/admin/account/users/${encodeURIComponent(userID)}/sessions`, params) as Promise<
    ByPage<AccountSession>
  >
}

export function revokeAccountUserSessions(userID: string) {
  return client.delete(`/admin/account/users/${encodeURIComponent(userID)}/sessions`) as Promise<void>
}

export function revokeAccountSession(sessionID: string) {
  return client.delete(`/admin/account/sessions/${encodeURIComponent(sessionID)}`) as Promise<void>
}

export type ListAccountUserAppGrantsParams = PaginationParams & {
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'lastUsedAt'
  /** Order in which to sort the results */
  sortOrder?: SortOrder
}

export function listAccountUserAppGrants(userID: string, params?: ListAccountUserAppGrantsParams) {
  return client.get(`/admin/account/users/${encodeURIComponent(userID)}/app-grants`, params) as Promise<
    ByPage<AccountAppGrant>
  >
}

export function getAccountAppGrant(appGrantID: string) {
  return client.get(`/admin/account/app-grants/${encodeURIComponent(appGrantID)}`) as Promise<AccountAppGrant>
}

export async function revokeAccountAppGrant(appGrantID: string) {
  await client.delete(`/admin/account/app-grants/${encodeURIComponent(appGrantID)}`)
}

export type ListAccountAppGrantTokensParams = PaginationParams & {
  /** Filter tokens by OAuth token type */
  tokenType?: AccountAppTokenType
  /** Field by which to order the results */
  orderBy?: 'createdAt'
  /** Order in which to sort the results */
  sortOrder?: SortOrder
}

export function listAccountAppGrantTokens(appGrantID: string, params?: ListAccountAppGrantTokensParams) {
  return client.get(`/admin/account/app-grants/${encodeURIComponent(appGrantID)}/tokens`, params) as Promise<
    ByPage<AccountAppToken>
  >
}

export type CreateAccountAppGrantTokenParams = {
  /** Management ID of an active user-authorization client in the grant app */
  oauthClientID: string
  /** OAuth token type to create */
  tokenType: 'accessToken'
  /** Human-readable token name */
  name: string
  /** Expiration timestamp */
  expiresAt: string
}

export function createAccountAppGrantToken(appGrantID: string, params: CreateAccountAppGrantTokenParams) {
  return client.post(
    `/admin/account/app-grants/${encodeURIComponent(appGrantID)}/tokens`,
    params
  ) as Promise<CreatedAccountAppToken>
}

export function revokeAccountAppGrantToken(appGrantID: string, tokenID: string) {
  return client.delete(
    `/admin/account/app-grants/${encodeURIComponent(appGrantID)}/tokens/${encodeURIComponent(tokenID)}`
  ) as Promise<void>
}

export type ListAccountAppsParams = PaginationParams & {
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt'
  /** Order in which to sort the results */
  sortOrder?: SortOrder
}

export function listAccountApps(params?: ListAccountAppsParams) {
  return client.get('/admin/account/apps', params) as Promise<ByPage<AdminAccountApp>>
}

export type CreateAccountAppParams = {
  /** Unique management name of the app */
  name: string
  /** Defaults to the app name when omitted */
  displayName?: string
  /** Optional plain-text app description */
  description?: string | null
  /** Approved scopes for app-only access */
  clientCredentialsScopes?: AccountAppOnlyScope[]
  /** Administrator-provided reason retained in the audit log */
  reason?: string
}

export function createAccountApp(params: CreateAccountAppParams) {
  return client.post('/admin/account/apps', params) as Promise<AdminAccountApp>
}

export function getAccountApp(appID: string) {
  return client.get(`/admin/account/apps/${encodeURIComponent(appID)}`) as Promise<AdminAccountApp>
}

export type UpdateAccountAppParams = {
  /** Display name of the app */
  displayName?: string
  /** Set to null to clear the description */
  description?: string | null
  /** Target app status */
  status?: AccountAppStatus
  /** Target app-only scopes, with an empty array removing app-only access */
  clientCredentialsScopes?: AccountAppOnlyScope[]
  /** Administrator-provided reason retained in the audit log */
  reason?: string
}

export function updateAccountApp(appID: string, params: UpdateAccountAppParams) {
  return client.patch(`/admin/account/apps/${encodeURIComponent(appID)}`, params) as Promise<AdminAccountApp>
}

export async function updateAccountAppAvatar(appID: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  await client.putBinary(`/admin/account/apps/${encodeURIComponent(appID)}/avatar`, form)
}

function oauthClientsPath(appID: string) {
  return `/admin/account/apps/${encodeURIComponent(appID)}/oauth-clients`
}

function oauthClientPath(appID: string, oauthClientID: string) {
  return `${oauthClientsPath(appID)}/${encodeURIComponent(oauthClientID)}`
}

export function listAccountOAuthClients(appID: string, params?: ListAccountAppsParams) {
  return client.get(oauthClientsPath(appID), params) as Promise<ByPage<AccountOAuthClient>>
}

export type CreateAccountOAuthClientParams = {
  /** Management name unique within the app */
  name: string
  /** Immutable OAuth client authentication type */
  clientType: AccountOAuthClientType
  /** Grant types for user authorization or app-only access */
  grantTypes: AccountOAuthGrantType[]
  /** Exact redirect URI allowlist for user authorization */
  redirectURIs?: string[]
  wechatReturnTargets?: AccountWeChatReturnTarget[]
  /** Administrator-provided reason retained in the audit log */
  reason?: string
}

export function createAccountOAuthClient(appID: string, params: CreateAccountOAuthClientParams) {
  return client.post(oauthClientsPath(appID), params) as Promise<AccountOAuthClient>
}

export function getAccountOAuthClient(appID: string, oauthClientID: string) {
  return client.get(oauthClientPath(appID, oauthClientID)) as Promise<AccountOAuthClient>
}

export type UpdateAccountOAuthClientParams = {
  /** Target client status */
  status?: AccountAppStatus
  /** Target exact redirect URI allowlist */
  redirectURIs?: string[]
  wechatReturnTargets?: AccountWeChatReturnTarget[]
  /** Administrator-provided reason retained in the audit log */
  reason?: string
}

export function updateAccountOAuthClient(appID: string, oauthClientID: string, params: UpdateAccountOAuthClientParams) {
  return client.patch(oauthClientPath(appID, oauthClientID), params) as Promise<AccountOAuthClient>
}

export function listAccountOAuthClientSecrets(appID: string, oauthClientID: string, params?: PaginationParams) {
  return client.get(`${oauthClientPath(appID, oauthClientID)}/secrets`, params) as Promise<
    ByPage<AccountOAuthClientSecret>
  >
}

export type CreateAccountOAuthClientSecretParams = {
  /** Management name unique among the client's active secrets */
  name: string
}

export function createAccountOAuthClientSecret(
  appID: string,
  oauthClientID: string,
  params: CreateAccountOAuthClientSecretParams
) {
  return client.post(
    `${oauthClientPath(appID, oauthClientID)}/secrets`,
    params
  ) as Promise<CreatedAccountOAuthClientSecret>
}

export async function revokeAccountOAuthClientSecret(appID: string, oauthClientID: string, secretID: string) {
  await client.delete(`${oauthClientPath(appID, oauthClientID)}/secrets/${encodeURIComponent(secretID)}`)
}
