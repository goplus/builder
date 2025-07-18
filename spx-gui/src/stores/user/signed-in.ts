import { reactive, watchEffect, computed } from 'vue'
import Sdk from 'casdoor-js-sdk'
import { casdoorConfig } from '@/utils/env'
import { jwtDecode } from 'jwt-decode'
import { useQueryWithCache, useQueryCache } from '@/utils/query'
import { useAction } from '@/utils/exception'
import * as apis from '@/apis/user'
import { getUserQueryKey } from './query-keys'

const casdoorAuthRedirectPath = '/sign-in/callback'
const casdoorSdk = new Sdk({
  ...casdoorConfig,
  redirectPath: casdoorAuthRedirectPath
})

const userStateStorageKey = 'spx-user'
const userState = reactive({
  accessToken: null as string | null,
  accessTokenExpiresAt: null as number | null,
  refreshToken: null as string | null
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
}

export function signInWithAccessToken(accessToken: string) {
  userState.accessToken = accessToken
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
}

export function signOut() {
  userState.accessToken = null
  userState.accessTokenExpiresAt = null
  userState.refreshToken = null
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

export function getSignedInUsername(): string | null {
  if (!isSignedIn()) return null
  if (!userState.accessToken) return null
  const decoded = jwtDecode<{ name: string }>(userState.accessToken)
  return decoded.name
}

const signedInUserStaleTime = 60 * 1000 // 1min

export function getSignedInUserQueryKey() {
  return [...getUserQueryKey(getSignedInUsername() ?? ''), 'signed-in']
}

export function useSignedInUser() {
  const queryKey = computed(() => getSignedInUserQueryKey())
  return useQueryWithCache({
    queryKey: queryKey,
    async queryFn() {
      if (!isSignedIn()) return null
      return apis.getSignedInUser()
    },
    failureSummaryMessage: {
      en: 'Failed to load signed-in user information',
      zh: '加载当前用户信息失败'
    },
    staleTime: signedInUserStaleTime
  })
}

export function useUpdateSignedInUser() {
  const queryCache = useQueryCache()
  return useAction(
    async function updateSignedInUser(params: apis.UpdateSignedInUserParams) {
      const updated = await apis.updateSignedInUser(params)
      queryCache.invalidate(getUserQueryKey(getSignedInUsername()!))
      return updated
    },
    { en: 'Failed to update profile', zh: '更新个人信息失败' }
  )
}
