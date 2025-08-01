import { client, type ByPage, type PaginationParams } from './common'
import { ApiException, ApiExceptionCode } from './common/exception'

export type User = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Unique username of the user */
  username: string
  /** Display name of the user */
  displayName: string
  /** URL of the user's avatar image */
  avatar: string
  /** Brief bio or description of the user */
  description: string
  /** Subscription plan of the user */
  plan: 'free' | 'plus'
}

export type SignedInUser = User & {
  /** Capabilities and quotas of the user */
  capabilities: UserCapabilities
}

export type UserCapabilities = {
  /** Whether user can manage asset library */
  canManageAssets: boolean
  /** Whether user can manage courses and course series */
  canManageCourses: boolean
  /** Whether user can access premium LLM models */
  canUsePremiumLLM: boolean
  /** Total quota for Copilot messages */
  copilotMessageQuota: number
  /** Remaining quota for Copilot messages */
  copilotMessageQuotaLeft: number
}

export async function getUser(name: string): Promise<User> {
  return await (client.get(`/user/${encodeURIComponent(name)}`) as Promise<User>)
}

export async function getSignedInUser(): Promise<SignedInUser> {
  return await (client.get(`/user`) as Promise<SignedInUser>)
}

export type UpdateSignedInUserParams = Pick<User, 'description'>

export async function updateSignedInUser(params: UpdateSignedInUserParams) {
  return await (client.put(`/user`, params) as Promise<SignedInUser>)
}

export type ListUserParams = PaginationParams & {
  /** Filter users who are being followed by the specified user */
  follower?: string
  /** Filter users who are following the specified user */
  followee?: string
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'followedAt'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export async function listUsers(params: ListUserParams) {
  return await (client.get('/users/list', params) as Promise<ByPage<User>>)
}

/**
 * Check given user followed by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isFollowing(username: string) {
  try {
    await client.get(`/user/${encodeURIComponent(username)}/following`)
    return true
  } catch (e) {
    if (e instanceof ApiException) {
      // Not followed. TODO: reconfirm value of `code` here
      if (e.code === ApiExceptionCode.errorNotFound) return false
      // Not logged in.
      if (e.code === ApiExceptionCode.errorUnauthorized) return false
      throw e
    }
    throw e
  }
}

export async function follow(username: string) {
  await client.post(`/user/${encodeURIComponent(username)}/following`)
}

export async function unfollow(username: string) {
  await client.delete(`/user/${encodeURIComponent(username)}/following`)
}
