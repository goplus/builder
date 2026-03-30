import { reactive, watchEffect, computed } from 'vue'
import Sdk from 'casdoor-js-sdk'
import { casdoorConfig } from '@/utils/env'
import { jwtDecode } from 'jwt-decode'
import { useQueryWithCache, useQueryCache, useQuery, composeQuery } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/user'
import { getUserQueryKey } from './query-keys'
import { getDefaultReturnTo, getQQProviderParams, getSignInRoute, getWeChatProviderParams } from './sign-in-entry'

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
   * User name parsed from access token, or null if not available.
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

function decodeUsernameFromAccessToken(accessToken: string): string | null {
  try {
    const decoded = jwtDecode<{ name?: unknown }>(accessToken)
    if (typeof decoded.name !== 'string' || decoded.name === '') return null
    return decoded.name
  } catch {
    return null
  }
}

function handleTokenResponse(resp: TokenResponse) {
  userState.accessToken = resp.access_token
  userState.accessTokenExpiresAt = resp.expires_in ? Date.now() + resp.expires_in * 1000 : null
  userState.refreshToken = resp.refresh_token
  userState.username = decodeUsernameFromAccessToken(resp.access_token)
}

export function goToSignIn(returnTo: string = getDefaultReturnTo()) {
  window.location.assign(getSignInRoute(returnTo))
}

export function initiateSignIn(returnTo: string = getDefaultReturnTo(), additionalParams?: Record<string, string>) {
  // Workaround for casdoor-js-sdk not supporting override of `redirectPath` in `signin_redirect`.
  const casdoorSdk = new Sdk({
    ...casdoorConfig,
    redirectPath: `${casdoorAuthRedirectPath}?returnTo=${encodeURIComponent(returnTo)}`
  })
  casdoorSdk.signin_redirect(additionalParams)
}

export function initiateWeChatSignIn(returnTo: string = getDefaultReturnTo()) {
  initiateSignIn(returnTo, getWeChatProviderParams() ?? undefined)
}

export function initiateQQSignIn(returnTo: string = getDefaultReturnTo()) {
  initiateSignIn(returnTo, getQQProviderParams() ?? undefined)
}

export async function completeSignIn() {
  const resp = await casdoorSdk.exchangeForAccessToken()
  handleTokenResponse(resp)
}

export function signInWithAccessToken(accessToken: string) {
  userState.accessToken = accessToken
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  userState.username = decodeUsernameFromAccessToken(accessToken)
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
 * The returned value is unresolved: it comes from the access token,
 * and should not be treated as canonical backend-confirmed identity.
 *
 * Use this only at boundaries that need a synchronous identity hint, such as cache keys, route
 * derivation, or other session-scoping data. Do not use it for behavior-sensitive checks like
 * ownership, permissions, or other logic that should depend on canonical backend data.
 */
export function getUnresolvedSignedInUsername(): string | null {
  if (!isSignedIn()) return null
  if (userState.username != null) return userState.username
  if (userState.accessToken == null) return null
  const username = decodeUsernameFromAccessToken(userState.accessToken)
  if (username == null) return null
  userState.username = username
  return username
}

const signedInUserStaleTime = 60 * 1000 // 1min

function getSignedInUserQueryKey() {
  return [...getUserQueryKey(getUnresolvedSignedInUsername() ?? ''), 'signed-in']
}

function useSignedInUserQuery() {
  const queryKey = computed(() => getSignedInUserQueryKey())
  return useQueryWithCache({
    queryKey: queryKey,
    async queryFn() {
      if (!isSignedIn()) throw new Error('User not signed in')
      return apis.getSignedInUser()
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
 * - callers need to known whether the user is signed in or not
 * - callers need to acccess the loading or error state of the signed-in user query
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
      const unresolvedUsername = getUnresolvedSignedInUsername()
      const updated = await apis.updateSignedInUser(params)
      if (unresolvedUsername != null) queryCache.invalidate(getUserQueryKey(unresolvedUsername))
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
      const oldUsername = getUnresolvedSignedInUsername()
      if (oldUsername == null) throw new Error('Signed-in username is not available')

      const updated = await apis.updateSignedInUser({ username: newUsername })
      queryCache.invalidate(getUserQueryKey(oldUsername))
      queryCache.invalidate(getUserQueryKey(updated.username))
      signOut()
      return updated
    },
    { en: 'Failed to modify username', zh: '修改用户名失败' }
  )
}
