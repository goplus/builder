import { client, type ByPage, type PaginationParams } from './common'
import { ApiException, ApiExceptionCode } from './common/exception'

export type User = {
  /** Unique identifier */
  id: string
  /** Unique username of the user */
  username: string
  /** Brief bio or description of the user */
  description: string
  /** Name to display, TODO: from Casdoor? */
  displayName: string
  /** Avatar URL, TODO: from Casdoor? */
  avatar: string
  /** Create time */
  cTime: string
  /** Update time */
  uTime: string
}

function __mockUser(name: string): User {
  return {
    id: Math.random().toString(),
    username: name,
    description:
      'All the world’s a stage, and all the men and women merely players. They have their exits and their entrances; and one man in his time plays many parts.',
    displayName: name,
    avatar: 'https://avatars.githubusercontent.com/u/1492263?v=4',
    cTime: '2021-08-07T07:00:00Z',
    uTime: '2021-08-07T07:00:00Z'
  }
}

function __mockUsers(num: number): User[] {
  return Array.from({ length: num }, (_, i) => __mockUser(`test${i}`))
}

export async function getUser(name: string): Promise<User> {
  // TODO: remove me
  if (process.env.NODE_ENV === 'development') {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return __mockUser(name)
  }
  return client.get(`/user/${encodeURIComponent(name)}`) as Promise<User>
}

export type ListUserParams = PaginationParams & {
  /** Filter users who are being followed by the specified user */
  follower?: string
  /** Filter users who are following the specified user */
  followee?: string
  /** Field by which to order the results */
  orderBy?: 'cTime' | 'uTime' | 'followedAt'
  /** Order in which to sort the results */
  sortOrder?: 'asc' | 'desc'
}

export async function listUsers(params: ListUserParams) {
  // TODO: remove me
  if (process.env.NODE_ENV === 'development') {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return {
      total: 15,
      data:
        params.pageIndex === 1 ? __mockUsers(params.pageSize!) : __mockUsers(15 - params.pageSize!)
    }
  }
  return client.get('/users/list', { params }) as Promise<ByPage<User>>
}

/**
 * Check given user followed by current logged-in user.
 * If not logged in, `false` will be returned.
 */
export async function isFollowing(username: string) {
  // TODO: remove me
  if (process.env.NODE_ENV === 'development') {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return Math.random() > 0.5
  }
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

export async function follow(username: string) {
  // TODO: remove me
  if (process.env.NODE_ENV === 'development') {
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (Math.random() > 0.5) throw new Error('Failed to follow')
    return
  }
  await client.post(`/user/following/${encodeURIComponent(username)}`)
}

export async function unfollow(username: string) {
  // TODO: remove me
  if (process.env.NODE_ENV === 'development') {
    await new Promise((resolve) => setTimeout(resolve, 300))
    if (Math.random() > 0.5) throw new Error('Failed to follow')
    return
  }
  await client.delete(`/user/following/${encodeURIComponent(username)}`)
}
