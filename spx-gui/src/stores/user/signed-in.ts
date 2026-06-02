import { reactive, watchEffect, computed, ref } from 'vue'
import Sdk from 'casdoor-js-sdk'
import { Client } from '@/apis/common/client'
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

async function fetchSignedInUsernameByAccessToken(accessToken: string) {
  const client = new Client()
  client.setTokenProvider(async () => accessToken)
  const user = (await client.get('/user')) as SignedInUser
  return user.username
}

async function handleTokenResponse(resp: TokenResponse) {
  const username = await fetchSignedInUsernameByAccessToken(resp.access_token)
  userState.accessToken = resp.access_token
  userState.accessTokenExpiresAt = resp.expires_in ? Date.now() + resp.expires_in * 1000 : null
  userState.refreshToken = resp.refresh_token
  userState.username = username
}

/**
 * Local auth-session scope for signed-in-user queries and derived async reads.
 *
 * This is bumped whenever local auth state crosses a session boundary, such as sign-in or sign-out,
 * so cached data and in-flight async results from an older local auth session are not consumed in the
 * current session.
 */
const authSessionScope = ref(0)

function bumpAuthSessionScope() {
  authSessionScope.value++
  return authSessionScope.value
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
  await handleTokenResponse(resp)
  bumpAuthSessionScope()
}

export async function signInWithAccessToken(accessToken: string) {
  const username = await fetchSignedInUsernameByAccessToken(accessToken)
  userState.accessToken = accessToken
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  userState.username = username
  bumpAuthSessionScope()
}

function hasLocalAuthState() {
  return userState.accessToken != null || userState.accessTokenExpiresAt != null || userState.refreshToken != null
}

export function signOut() {
  // `ensureAccessToken()` is also used by guest/public API requests. If we are already effectively
  // signed out, returning early avoids bumping `authSessionScope` for those requests, which would
  // otherwise retrigger signed-in-state consumers and can cascade into startup update loops.
  if (!hasLocalAuthState()) return
  bumpAuthSessionScope()
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
    return null
  }

  tokenRefreshPromise = (async () => {
    try {
      const resp = await casdoorSdk.refreshAccessToken(userState.refreshToken!)
      await handleTokenResponse(resp)
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
 * The returned value is unresolved: it comes from local cached state and may lag behind the
 * canonical signed-in user returned by the backend.
 *
 * Use this only at boundaries that need a synchronous session-scoped identity hint, such as
 * temporary route derivation or user-scoped storage. Do not use it for behavior-sensitive checks
 * like ownership, permissions, or other logic that should depend on canonical backend data.
 */
export function getUnresolvedSignedInUsername(): string | null {
  if (!isSignedIn()) return null
  return userState.username
}

const signedInUserStaleTime = 60 * 1000 // 1min
const signedInUserQueryKey = computed(() => ['signed-in-user', authSessionScope.value])

function useSignedInUserQuery() {
  return useQueryWithCache({
    queryKey: signedInUserQueryKey,
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
 * - callers need to know whether the user is signed in or not
 * - callers need to access the loading or error state of the signed-in user query
 */
export function useSignedInStateQuery() {
  const signedInUserQuery = useSignedInUserQuery()
  return useQuery<SignedInState>(async (ctx) => {
    if (!isSignedIn()) return { isSignedIn: false, user: null }
    const scope = authSessionScope.value
    const user = await composeQuery(ctx, signedInUserQuery)
    if (scope !== authSessionScope.value) return { isSignedIn: false, user: null }
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
      queryCache.invalidate(signedInUserQueryKey.value)
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
      queryCache.invalidate(signedInUserQueryKey.value)
      queryCache.invalidate(getUserQueryKey(oldUsername))
      queryCache.invalidate(getUserQueryKey(updated.username))
      signOut()
      return updated
    },
    { en: 'Failed to modify username', zh: '修改用户名失败' }
  )
}
