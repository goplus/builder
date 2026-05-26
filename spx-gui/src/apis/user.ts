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
  /** Capabilities of the user */
  capabilities: UserCapabilities
}

export type UserCapabilities = {
  /** Whether user can manage asset library */
  canManageAssets: boolean
  /** Whether user can manage courses and course series */
  canManageCourses: boolean
  /** Whether user can access premium LLM models */
  canUsePremiumLLM: boolean
}

export function getUser(username: string): Promise<User> {
  return client.get(`/users/${encodeURIComponent(username)}`) as Promise<User>
}

export async function isUsernameTaken(username: string) {
  try {
    const user = await getUser(username)
    return user.username.toLowerCase() === username.toLowerCase()
  } catch (e) {
    if (e instanceof ApiException && e.code === ApiExceptionCode.errorNotFound) return false
    throw e
  }
}

export function getSignedInUser(): Promise<SignedInUser> {
  return client.get(`/user`) as Promise<SignedInUser>
}

export type UpdateSignedInUserParams = Partial<Pick<User, 'username' | 'displayName' | 'avatar' | 'description'>>

export function updateSignedInUser(params: UpdateSignedInUserParams) {
  return client.patch(`/user`, params) as Promise<SignedInUser>
}

type ListUserFollowRelationsParams = PaginationParams & {
  /** Field by which to order the results */
  orderBy?: 'createdAt' | 'updatedAt' | 'followedAt'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export type ListUserFollowersParams = ListUserFollowRelationsParams

export type ListUserFollowingParams = ListUserFollowRelationsParams

export function listUserFollowers(username: string, params?: ListUserFollowersParams) {
  return client.get(`/users/${encodeURIComponent(username)}/followers`, params) as Promise<ByPage<User>>
}

export function listUserFollowing(username: string, params?: ListUserFollowingParams) {
  return client.get(`/users/${encodeURIComponent(username)}/following`, params) as Promise<ByPage<User>>
}

/**
 * Check given user followed by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isFollowing(username: string) {
  try {
    await client.get(`/user/following/${encodeURIComponent(username)}`)
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

export function follow(username: string) {
  return client.put(`/user/following/${encodeURIComponent(username)}`) as Promise<void>
}

export function unfollow(username: string) {
  return client.delete(`/user/following/${encodeURIComponent(username)}`) as Promise<void>
}
