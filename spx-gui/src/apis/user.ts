import { client, type ByPage, type PaginationParams } from './common'
import { ApiException, ApiExceptionCode } from './common/exception'
import { getCasdoorUser } from './casdoor-user'

export type User = {
  /** Unique identifier */
  id: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
  /** Unique username of the user */
  username: string
  /** Brief bio or description of the user */
  description: string

  /** Name to display, from Casdoor */
  displayName: string
  /** Avatar URL, from Casdoor */
  avatar: string
}

async function completeUserWithCasdoor(user: Omit<User, 'displayName' | 'avatar'>): Promise<User> {
  // TODO: cache the result of `getCasdoorUser` to avoid redundant requests?
  const casdoorUser = await getCasdoorUser(user.username)
  return {
    ...user,
    displayName: casdoorUser.displayName,
    avatar: casdoorUser.avatar
  }
}

export async function getUser(name: string): Promise<User> {
  const user = await (client.get(`/user/${encodeURIComponent(name)}`) as Promise<User>)
  return completeUserWithCasdoor(user)
}

export type UpdateProfileParams = Pick<User, 'description'>

export async function updateProfile(params: UpdateProfileParams) {
  const user = await (client.put(`/user`, params) as Promise<User>)
  return completeUserWithCasdoor(user)
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
  const { total, data } = await (client.get('/users/list', params) as Promise<ByPage<User>>)
  return {
    total,
    // There is a performance issue here, as we are calling `completeUserWithCasdoor` for each user. Unfortunately,
    // Casdoor doesn't provide a batch API for fetching multiple user profiles by their usernames.
    data: await Promise.all(data.map(completeUserWithCasdoor))
  }
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
