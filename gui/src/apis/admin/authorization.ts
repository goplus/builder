import { client } from '@/apis/common'
import type { UserCapabilities } from '@/apis/user'

export type UserPlan = 'free' | 'plus'

export type UserAuthorization = {
  /** ID of the user */
  userID: string
  /** Roles assigned to the user */
  roles: string[]
  /** Subscription plan of the user */
  plan: UserPlan
  /** Derived permission capabilities of the user */
  capabilities: UserCapabilities
  /** Derived quota policies for XBuilder Authorization decisions */
  quotaPolicies?: Record<string, unknown>
}

export function getUserAuthorization(userID: string) {
  return client.get(`/admin/authorization/users/${encodeURIComponent(userID)}`) as Promise<UserAuthorization>
}

export type UpdateUserAuthorizationParams = {
  /** Roles assigned to the user */
  roles?: string[]
  /** Subscription plan of the user */
  plan?: UserPlan
}

export function updateUserAuthorization(userID: string, params: UpdateUserAuthorizationParams) {
  return client.patch(`/admin/authorization/users/${encodeURIComponent(userID)}`, params) as Promise<UserAuthorization>
}
