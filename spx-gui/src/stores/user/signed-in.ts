import { reactive, watchEffect, computed } from 'vue'
import Sdk from 'casdoor-js-sdk'
import { casdoorConfig } from '@/utils/env'
import { useQueryWithCache, useQueryCache, useQuery, composeQuery } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/user'
import { getUserQueryKey } from './query-keys'

export type SignedInUser = apis.SignedInUser

const casdoorAuthRedirectPath = '/sign-in/callback'
const casdoorSdk = new Sdk({
  ...casdoorConfig,
  redirectPath: casdoorAuthRedirectPath
})

const userStateStorageKey = 'spx-user'
const userState = reactive({
  accessToken: null as string | null,
  accessTokenExpiresAt: null as number | null,
  refreshToken: null as string | null,
  /**
   * User name cached from signed-in user data, or null if not available.
   * This is only a hint and should not be treated as canonical backend-confirmed identity.
   */
  username: null as string | null
})

export function initUserState() {
  const stored = localStorage.getItem(userStateStorageKey)
  if (stored != null) {
    Object.assign(userState, JSON.parse(stored))
  }
  watchEffect(() => localStorage.setItem(userStateStorageKey, JSON.stringify(userState)))
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
}

function handleTokenResponse(resp: TokenResponse) {
  userState.accessToken = resp.access_token
  userState.accessTokenExpiresAt = resp.expires_in ? Date.now() + resp.expires_in * 1000 : null
  userState.refreshToken = resp.refresh_token
}

async function syncSignedInUsername() {
  if (userState.accessToken == null) {
    userState.username = null
    return null
  }
  const user = await apis.getSignedInUser()
  userState.username = user.username
  return user
}

export function initiateSignIn(
  returnTo: string = window.location.pathname + window.location.search + window.location.hash
) {
  // Workaround for casdoor-js-sdk not supporting override of `redirectPath` in `signin_redirect`.
  const casdoorSdk = new Sdk({
    ...casdoorConfig,
    redirectPath: `${casdoorAuthRedirectPath}?returnTo=${encodeURIComponent(returnTo)}`
  })
  casdoorSdk.signin_redirect()
}

export async function completeSignIn() {
  const resp = await casdoorSdk.exchangeForAccessToken()
  handleTokenResponse(resp)
  await syncSignedInUsername()
}

export async function signInWithAccessToken(accessToken: string) {
  userState.accessToken = accessToken
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  await syncSignedInUsername()
}

export function signOut() {
  userState.accessToken = null
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  userState.username = null
}

const tokenExpiryDelta = 60 * 1000 // 1 minute in milliseconds
let tokenRefreshPromise: Promise<string | null> | null = null

export async function ensureAccessToken(): Promise<string | null> {
  if (isAccessTokenValid()) return userState.accessToken

  if (tokenRefreshPromise != null) return tokenRefreshPromise
  if (userState.refreshToken == null) {
    signOut()
    return null
  }

  tokenRefreshPromise = (async () => {
    try {
      const resp = await casdoorSdk.refreshAccessToken(userState.refreshToken!)
      handleTokenResponse(resp)
    } catch (e) {
      console.error('failed to refresh access token', e)
      throw e
    }

    // Due to casdoor-js-sdk's lack of error handling, we must check if the access token is valid after calling
    // `casdoorSdk.refreshAccessToken`. The token might still be invalid if, e.g., the server has already revoked
    // the refresh token. We can't do anything but sign out the user in such cases.
    if (!isAccessTokenValid()) {
      signOut()
      return null
    }

    return userState.accessToken
  })()
  return tokenRefreshPromise.finally(() => (tokenRefreshPromise = null))
}

function isAccessTokenValid(): boolean {
  return !!(
    userState.accessToken &&
    (userState.accessTokenExpiresAt === null || userState.accessTokenExpiresAt - tokenExpiryDelta > Date.now())
  )
}

export function isSignedIn(): boolean {
  return isAccessTokenValid() || userState.refreshToken != null
}

/**
 * Returns the current signed-in username from locally available auth state only.
 *
 * The returned value is unresolved: it comes from locally cached signed-in user data,
 * and should not be treated as canonical backend-confirmed identity.
 *
 * Use this only at boundaries that need a synchronous identity hint, such as cache keys, route
 * derivation, or other session-scoping data. Do not use it for behavior-sensitive checks like
 * ownership, permissions, or other logic that should depend on canonical backend data.
 */
export function getUnresolvedSignedInUsername(): string | null {
  if (!isSignedIn()) return null
  return userState.username
}

const signedInUserStaleTime = 60 * 1000 // 1min
const signedInUserQueryKey = ['signed-in-user']

function useSignedInUserQuery() {
  return useQueryWithCache({
    queryKey: signedInUserQueryKey,
    async queryFn() {
      if (!isSignedIn()) throw new Error('User not signed in')
      const user = await apis.getSignedInUser()
      userState.username = user.username
      return user
    },
    failureSummaryMessage: {
      en: 'Failed to load signed-in user information',
      zh: '加载当前用户信息失败'
    },
    staleTime: signedInUserStaleTime
  })
}

export type SignedInState =
  | {
      isSignedIn: false
      user: null
    }
  | {
      isSignedIn: true
      user: SignedInUser
    }

/**
 * Get the signed-in state, including whether the user is signed in and the signed-in user information if available.
 * Suitable for scenarios like:
 * - callers need to know whether the user is signed in or not
 * - callers need to access the loading or error state of the signed-in user query
 */
export function useSignedInStateQuery() {
  const signedInUserQuery = useSignedInUserQuery()
  return useQuery<SignedInState>(async (ctx) => {
    if (!isSignedIn()) return { isSignedIn: false, user: null }
    const user = await composeQuery(ctx, signedInUserQuery)
    return { isSignedIn: true, user }
  })
}

/**
 * Get the signed-in user information, or null if not signed in or the information is not available (e.g. due to loading or error).
 * Suitable for scenarios like:
 * - callers only need the signed-in user information
 * - callers don't need to distinguish between "not signed in" and "signed in but user information not available"
 */
export function useSignedInUser() {
  const signedInStateQuery = useSignedInStateQuery()
  return computed(() => signedInStateQuery.data.value?.user ?? null)
}

export function useUpdateSignedInUser() {
  const queryCache = useQueryCache()

  return useAction(
    async function updateSignedInUser(
      params: Pick<apis.UpdateSignedInUserParams, 'displayName' | 'avatar' | 'description'>
    ) {
      const updated = await apis.updateSignedInUser(params)
      userState.username = updated.username
      queryCache.invalidate(signedInUserQueryKey)
      queryCache.invalidate(getUserQueryKey(updated.username))
      return updated
    },
    { en: 'Failed to update profile', zh: '更新个人信息失败' }
  )
}

/**
 * Modify username for the signed-in user.
 * NOTE: The signed-in user will be signed out after modifying the username.
 * Typically the caller may want to reload the route to trigger navigation guards or initiate sign-in manually.
 */
export function useModifySignedInUsername() {
  const queryCache = useQueryCache()

  return useAction(
    async function modifySignedInUsername(newUsername: string) {
      const currentUser = await apis.getSignedInUser()
      const oldUsername = currentUser.username

      const updated = await apis.updateSignedInUser({ username: newUsername })
      queryCache.invalidate(signedInUserQueryKey)
      queryCache.invalidate(getUserQueryKey(oldUsername))
      queryCache.invalidate(getUserQueryKey(updated.username))
      signOut()
      return updated
    },
    { en: 'Failed to modify username', zh: '修改用户名失败' }
  )
}
