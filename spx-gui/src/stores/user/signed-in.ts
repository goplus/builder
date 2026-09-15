import { reactive, computed } from 'vue'
import { composeQuery, useQuery, useQueryCache, useQueryWithCache } from '@/utils/query'
import { capture, useAction } from '@/utils/exception'
import { OAuthErrorCode, OAuthFlow, type OAuthTokenResponse } from '@/utils/oauth'
import { normalizeLang, useI18n } from '@/utils/i18n'
import { OAuthException } from '@/apis/common/exception'
import * as userApis from '@/apis/user'
import { accountOAuthApisForXBuilder as oauthApis } from '@/apis/account/oauth'
import { getUserQueryKey } from './query-keys'

export type SignedInUser = userApis.SignedInUser

const userStateStorageKey = 'builder-user'
const userAccessTokenLockName = 'builder-user-access-token'

type UserState = {
  accessToken: string | null
  accessTokenExpiresAt: number | null
  refreshToken: string | null
  username: string | null
}

const emptyUserState: UserState = {
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
  username: null
}

let oauthFlow: OAuthFlow<{ returnTo: string }> | null = null

const userState = reactive<UserState>({ ...emptyUserState })

function ensureOAuthFlow() {
  if (oauthFlow == null) throw new Error('OAuth flow is not initialized')
  return oauthFlow
}

export function initUserState(clientId: string) {
  oauthFlow = new OAuthFlow<{ returnTo: string }>(oauthApis, {
    clientId,
    redirectUri: `${window.location.origin}/sign-in/callback`
  })

  restoreUserState()
  window.addEventListener('storage', (event) => {
    if (event.key == null || event.key === userStateStorageKey) restoreUserState()
  })
}

function restoreUserState() {
  const stored = localStorage.getItem(userStateStorageKey)
  try {
    const newState: UserState = stored != null ? JSON.parse(stored) : emptyUserState
    Object.assign(userState, newState)
  } catch {
    localStorage.removeItem(userStateStorageKey)
    Object.assign(userState, emptyUserState)
  }
}

function setUserState(state: UserState) {
  Object.assign(userState, state)
  localStorage.setItem(userStateStorageKey, JSON.stringify(state))
}

async function getSignedInUsernameByAccessToken(accessToken: string) {
  const user = await userApis.getSignedInUser(accessToken)
  return user.username
}

/**
 * Persists OAuth tokens, retrieving the username only when one was not already available.
 */
async function handleTokenResponse(resp: OAuthTokenResponse, username: string | null = null) {
  username ??= await getSignedInUsernameByAccessToken(resp.access_token)
  setUserState({
    accessToken: resp.access_token,
    accessTokenExpiresAt: resp.expires_in != null ? Date.now() + resp.expires_in * 1000 : null,
    refreshToken: resp.refresh_token ?? null,
    username
  })
}

export function useSignIn() {
  const i18n = useI18n()
  return async (returnTo: string = window.location.pathname + window.location.search + window.location.hash) => {
    const { authorizeUrl } = await ensureOAuthFlow().createAuthorization({
      data: { returnTo },
      uiLocales: normalizeLang(i18n.lang.value)
    })
    window.location.assign(authorizeUrl)
  }
}

export async function completeSignIn(search: string) {
  const { token, extraData } = await ensureOAuthFlow().completeAuthorization(search)
  await handleTokenResponse(token)
  return extraData
}

export async function signInWithAccessToken(accessToken: string) {
  const username = await getSignedInUsernameByAccessToken(accessToken)
  setUserState({
    accessToken,
    accessTokenExpiresAt: null,
    refreshToken: null,
    username
  })
}

function clearUserState() {
  setUserState(emptyUserState)
}

export async function signOut() {
  const { accessToken, refreshToken } = userState
  clearUserState()
  await Promise.all(
    [accessToken, refreshToken].filter((token) => token != null).map((token) => ensureOAuthFlow().revokeToken(token))
  ).catch((e) => capture(e, 'Failed to revoke tokens during sign out'))
}

/**
 * Returns a valid access token, or null when the user is not signed in.
 *
 * Clears state and resolves null when the refresh token is invalid; preserves state and rejects
 * for other refresh failures.
 */
export async function ensureAccessToken(): Promise<string | null> {
  if (isAccessTokenValid()) return userState.accessToken

  await navigator.locks.request(userAccessTokenLockName, async () => {
    // Another tab may have refreshed the token while this request waited for the lock.
    restoreUserState()
    if (isAccessTokenValid()) return
    if (userState.refreshToken == null) {
      clearUserState()
      return
    }

    const refreshTokenBeforeRefresh = userState.refreshToken
    try {
      const token = await ensureOAuthFlow().refreshToken(refreshTokenBeforeRefresh)
      // Reuse the cached username so a failing GET /user cannot prevent persisting rotated tokens.
      await handleTokenResponse(token, userState.username)
    } catch (e) {
      capture(e, 'Failed to refresh access token')
      if (e instanceof OAuthException && e.error === OAuthErrorCode.InvalidGrant) {
        clearUserState()
        return
      }
      throw e
    }
  })
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
    async function updateSignedInUser(params: Pick<userApis.UpdateSignedInUserParams, 'displayName' | 'description'>) {
      const unresolvedUsername = getUnresolvedSignedInUsername()
      const updated = await userApis.updateSignedInUser(params)
      if (unresolvedUsername != null) queryCache.invalidate(getUserQueryKey(unresolvedUsername))
      queryCache.invalidate(getUserQueryKey(updated.username))
      return updated
    },
    { en: 'Failed to update profile', zh: '更新个人信息失败' }
  )
}

export function useUpdateSignedInUserAvatar() {
  const queryCache = useQueryCache()

  return useAction(
    async function updateSignedInUserAvatar(file: File) {
      const unresolvedUsername = getUnresolvedSignedInUsername()
      await userApis.updateSignedInUserAvatar(file)
      const updated = await userApis.getSignedInUser()
      if (unresolvedUsername != null) queryCache.invalidate(getUserQueryKey(unresolvedUsername))
      queryCache.invalidate(getUserQueryKey(updated.username))
      return updated
    },
    { en: 'Failed to update avatar', zh: '更新头像失败' }
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
