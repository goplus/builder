import { reactive, watchEffect, computed } from 'vue'
import { accountOAuthClientId as oauthClientId, defaultLang } from '@/utils/env'
import { composeQuery, useQuery, useQueryCache, useQueryWithCache } from '@/utils/query'
import { capture, useAction } from '@/utils/exception'
import { OAuthFlow, type OAuthTokenResponse } from '@/utils/oauth'
import { normalizeLang } from '@/utils/i18n'
import * as userApis from '@/apis/user'
import { accountOAuthApisForXBuilder as oauthApis } from '@/apis/account/oauth'
import { getUserQueryKey } from './query-keys'

export type SignedInUser = userApis.SignedInUser

const userStateStorageKey = 'builder-user'

const oauthFlow = new OAuthFlow<{ returnTo: string }>(oauthApis, {
  clientId: oauthClientId,
  redirectUri: `${window.location.origin}/sign-in/callback`
})

const userState = reactive({
  accessToken: null as string | null,
  accessTokenExpiresAt: null as number | null,
  refreshToken: null as string | null,
  username: null as string | null
})

export function initUserState() {
  const stored = localStorage.getItem(userStateStorageKey)
  if (stored != null) {
    try {
      Object.assign(userState, JSON.parse(stored))
    } catch {
      localStorage.removeItem(userStateStorageKey)
    }
  }
  watchEffect(() => localStorage.setItem(userStateStorageKey, JSON.stringify(userState)))
}

async function getSignedInUsernameByAccessToken(accessToken: string) {
  const user = await userApis.getSignedInUser(accessToken)
  return user.username
}

async function handleTokenResponse(resp: OAuthTokenResponse) {
  const username = await getSignedInUsernameByAccessToken(resp.access_token)
  userState.accessToken = resp.access_token
  userState.accessTokenExpiresAt = resp.expires_in != null ? Date.now() + resp.expires_in * 1000 : null
  userState.refreshToken = resp.refresh_token ?? null
  userState.username = username
}

export async function initiateSignIn(
  returnTo: string = window.location.pathname + window.location.search + window.location.hash
) {
  const { authorizeUrl } = await oauthFlow.createAuthorization({
    data: { returnTo },
    // TODO: Avoid reaching into the UI language persistence detail here. The sign-in
    // flow should receive the current UI language from the app-level i18n state instead.
    uiLocales: normalizeLang(localStorage.getItem('spx-gui-language') ?? defaultLang)
  })
  window.location.assign(authorizeUrl)
}

export async function completeSignIn(search: string) {
  const { token, extraData } = await oauthFlow.completeAuthorization(search)
  await handleTokenResponse(token)
  return extraData
}

export async function signInWithAccessToken(accessToken: string) {
  const username = await getSignedInUsernameByAccessToken(accessToken)
  userState.accessToken = accessToken
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  userState.username = username
}

function clearUserState() {
  userState.accessToken = null
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  userState.username = null
}

export async function signOut() {
  const { accessToken, refreshToken } = userState
  clearUserState()
  await Promise.all(
    [accessToken, refreshToken].filter((token) => token != null).map((token) => oauthFlow.revokeToken(token))
  ).catch((e) => capture(e, 'Failed to revoke tokens during sign out'))
}

let tokenRefreshPromise: Promise<void> | null = null

export async function ensureAccessToken(): Promise<string | null> {
  if (isAccessTokenValid()) return userState.accessToken
  if (userState.refreshToken == null) {
    clearUserState()
    return null
  }
  if (tokenRefreshPromise == null) {
    tokenRefreshPromise = oauthFlow
      .refreshToken(userState.refreshToken)
      .then(handleTokenResponse)
      .catch((e) => {
        capture(e, 'Failed to refresh access token')
        clearUserState()
      })
      .finally(() => {
        tokenRefreshPromise = null
      })
  }
  await tokenRefreshPromise
  return userState.accessToken
}

const tokenExpiryDelta = 60 * 1000 // 1 minute in milliseconds

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

/**
 * TODO: This query key still depends on `getUnresolvedSignedInUsername()`, which is only a local
 * username hint rather than a canonical auth-session identifier.
 *
 * Current limitations:
 * - auth-session changes do not change the key if the unresolved username stays the same
 * - different sessions for the same username may therefore reuse the same cache entry
 *
 * A later cleanup should replace this with a dedicated auth-session-scoping key.
 */
function getSignedInUserQueryKey() {
  return [...getUserQueryKey(getUnresolvedSignedInUsername() ?? ''), 'signed-in']
}

function useSignedInUserQuery() {
  const queryKey = computed(() => getSignedInUserQueryKey())
  return useQueryWithCache({
    queryKey,
    async queryFn() {
      if (!isSignedIn()) throw new Error('User not signed in')
      return userApis.getSignedInUser()
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
      params: Pick<userApis.UpdateSignedInUserParams, 'displayName' | 'avatar' | 'description'>
    ) {
      const unresolvedUsername = getUnresolvedSignedInUsername()
      const updated = await userApis.updateSignedInUser(params)
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

      const updated = await userApis.updateSignedInUser({ username: newUsername })
      queryCache.invalidate(getUserQueryKey(oldUsername))
      queryCache.invalidate(getUserQueryKey(updated.username))
      await signOut()
      return updated
    },
    { en: 'Failed to modify username', zh: '修改用户名失败' }
  )
}
