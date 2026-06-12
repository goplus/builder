import { client, type ByPage, type PaginationParams } from '@/apis/common'
import type {
  AccountApp,
  AccountAppClientType,
  AccountAppSecret,
  AccountAppStatus,
  AccountSession,
  AccountUser,
  AccountUserIdentity,
  CreatedAccountAppSecret
} from '@/apis/account/common'

export type {
  AccountApp,
  AccountAppSecret,
  AccountSession,
  AccountUser,
  AccountUserIdentity,
  CreatedAccountAppSecret
} from '@/apis/account/common'

type SortOrder = 'asc' | 'desc'

export type ListAccountUsersParams = PaginationParams & {
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

export function deleteAccountUserSessions(userID: string) {
  return client.delete(`/admin/account/users/${encodeURIComponent(userID)}/sessions`) as Promise<void>
}

export function deleteAccountSession(sessionID: string) {
  return client.delete(`/admin/account/sessions/${encodeURIComponent(sessionID)}`) as Promise<void>
}

export type ListAccountAppsParams = PaginationParams & {
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt'
  /** Order in which to sort the results */
  sortOrder?: SortOrder
}

export function listAccountApps(params?: ListAccountAppsParams) {
  return client.get('/admin/account/apps', params) as Promise<ByPage<AccountApp>>
}

export type CreateAccountAppParams = {
  /** Unique app name */
  name: string
  /** Display name of the app */
  displayName: string
  /** OAuth client type of the app */
  clientType: AccountAppClientType
  /** Allowed redirect URIs */
  redirectURIs: string[]
  /** Allowed web origins */
  allowedOrigins?: string[]
}

export function createAccountApp(params: CreateAccountAppParams) {
  return client.post('/admin/account/apps', params) as Promise<AccountApp>
}

export function getAccountApp(appID: string) {
  return client.get(`/admin/account/apps/${encodeURIComponent(appID)}`) as Promise<AccountApp>
}

export type UpdateAccountAppParams = {
  /** Display name of the app */
  displayName?: string
  /** App status */
  status?: AccountAppStatus
  /** Allowed redirect URIs */
  redirectURIs?: string[]
  /** Allowed web origins */
  allowedOrigins?: string[]
}

export function updateAccountApp(appID: string, params: UpdateAccountAppParams) {
  return client.patch(`/admin/account/apps/${encodeURIComponent(appID)}`, params) as Promise<AccountApp>
}

export function listAccountAppSecrets(appID: string, params?: PaginationParams) {
  return client.get(`/admin/account/apps/${encodeURIComponent(appID)}/secrets`, params) as Promise<
    ByPage<AccountAppSecret>
  >
}

export type CreateAccountAppSecretParams = {
  /** App secret name */
  name: string
}

export function createAccountAppSecret(appID: string, params: CreateAccountAppSecretParams) {
  return client.post(
    `/admin/account/apps/${encodeURIComponent(appID)}/secrets`,
    params
  ) as Promise<CreatedAccountAppSecret>
}

export function deleteAccountAppSecret(appID: string, secretID: string) {
  return client.delete(
    `/admin/account/apps/${encodeURIComponent(appID)}/secrets/${encodeURIComponent(secretID)}`
  ) as Promise<void>
}
