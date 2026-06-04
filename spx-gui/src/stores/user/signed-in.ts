import { reactive, watchEffect, computed } from 'vue'
import {
  getAccountOAuthAuthorizeUrl,
  createPushedAuthorizationRequest,
  exchangeAuthorizationCode,
  exchangeRefreshToken,
  revokeOAuthToken,
  type AccountOAuthTokenResponse
} from '@/apis/account-oauth'
import * as apis from '@/apis/user'
import { useAction } from '@/utils/exception'
import { composeQuery, useQuery, useQueryCache, useQueryWithCache } from '@/utils/query'
import { getUserQueryKey } from './query-keys'

export type SignedInUser = apis.SignedInUser

const userStateStorageKey = 'spx-user'
const pendingAuthorizationStorageKey = 'spx-account-oauth:pending-authorization'

interface PendingAuthorization {
  state: string
  codeVerifier: string
  returnTo: string
}

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

function encodeBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function createRandomString(byteLength: number = 32) {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)))
}

async function createCodeChallenge(codeVerifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
  return encodeBase64Url(new Uint8Array(digest))
}

function readPendingAuthorization(): PendingAuthorization | null {
  const stored = sessionStorage.getItem(pendingAuthorizationStorageKey)
  if (stored == null) return null
  try {
    return JSON.parse(stored) as PendingAuthorization
  } catch {
    sessionStorage.removeItem(pendingAuthorizationStorageKey)
    return null
  }
}

function writePendingAuthorization(value: PendingAuthorization | null) {
  if (value == null) {
    sessionStorage.removeItem(pendingAuthorizationStorageKey)
  } else {
    sessionStorage.setItem(pendingAuthorizationStorageKey, JSON.stringify(value))
  }
}

async function fetchSignedInUsernameByAccessToken(accessToken: string) {
  const user = await apis.getSignedInUser(accessToken)
  return user.username
}

async function handleTokenResponse(resp: AccountOAuthTokenResponse) {
  const username = await fetchSignedInUsernameByAccessToken(resp.access_token)
  userState.accessToken = resp.access_token
  userState.accessTokenExpiresAt = resp.expires_in ? Date.now() + resp.expires_in * 1000 : null
  if ('refresh_token' in resp) userState.refreshToken = resp.refresh_token ?? null
  userState.username = username
}

export async function createAuthorizationRequest(
  returnTo: string = window.location.pathname + window.location.search + window.location.hash
) {
  const state = createRandomString()
  const codeVerifier = createRandomString(48)
  const codeChallenge = await createCodeChallenge(codeVerifier)
  const response = await createPushedAuthorizationRequest({ state, codeChallenge })

  writePendingAuthorization({ state, codeVerifier, returnTo })
  return {
    requestUri: response.request_uri,
    signInUrl: getAccountOAuthAuthorizeUrl(response.request_uri)
  }
}

export async function initiateSignIn(
  returnTo: string = window.location.pathname + window.location.search + window.location.hash
) {
  const { signInUrl } = await createAuthorizationRequest(returnTo)
  window.location.assign(signInUrl)
}

export async function completeAuthorizationCodeSignIn(search: string = window.location.search) {
  const params = new URLSearchParams(search)
  const code = params.get('code')?.trim() ?? ''
  const state = params.get('state')?.trim() ?? ''
  if (code === '' || state === '') throw new Error('Missing OAuth callback parameters')

  const pendingAuthorization = readPendingAuthorization()
  if (pendingAuthorization == null) throw new Error('Missing pending OAuth authorization state')
  if (pendingAuthorization.state !== state) throw new Error('OAuth state mismatch')

  try {
    const resp = await exchangeAuthorizationCode(code, pendingAuthorization.codeVerifier)
    await handleTokenResponse(resp)
  } finally {
    writePendingAuthorization(null)
  }

  return {
    returnTo: pendingAuthorization.returnTo
  }
}

export async function signInWithAccessToken(accessToken: string) {
  const username = await fetchSignedInUsernameByAccessToken(accessToken)
  userState.accessToken = accessToken
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  userState.username = username
}

export function signOut() {
  userState.accessToken = null
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
  userState.username = null
  writePendingAuthorization(null)
}

export async function revokeTokens() {
  const accessToken = userState.accessToken
  const refreshToken = userState.refreshToken
  signOut()
  try {
    await revokeOAuthToken(accessToken)
  } catch (error) {
    console.error('failed to revoke access token', error)
  }
  try {
    await revokeOAuthToken(refreshToken)
  } catch (error) {
    console.error('failed to revoke refresh token', error)
  }
}

const tokenExpiryDelta = 60 * 1000 // 1 minute in milliseconds
let tokenRefreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = userState.refreshToken
  if (refreshToken == null) return null
  if (tokenRefreshPromise != null) return tokenRefreshPromise

  tokenRefreshPromise = (async () => {
    try {
      const resp = await exchangeRefreshToken(refreshToken)
      await handleTokenResponse(resp)
    } catch (error) {
      console.error('failed to refresh access token', error)
      signOut()
      return null
    }

    if (!isAccessTokenValid()) {
      signOut()
      return null
    }

    return userState.accessToken
  })()

  return tokenRefreshPromise.finally(() => (tokenRefreshPromise = null))
}

export async function ensureAccessToken(): Promise<string | null> {
  if (isAccessTokenValid()) return userState.accessToken
  if (userState.refreshToken == null) {
    signOut()
    return null
  }
  return refreshAccessToken()
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
