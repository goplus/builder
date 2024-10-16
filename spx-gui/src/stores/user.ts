import Sdk from 'casdoor-js-sdk'
import { casdoorConfig } from '@/utils/env'
import { jwtDecode } from 'jwt-decode'
import { defineStore } from 'pinia'

export interface UserInfo {
  id: string
  name: string
  displayName: string
  avatar: string
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  refresh_expires_in: number
}

const casdoorAuthRedirectPath = '/callback'
const casdoorSdk = new Sdk({
  ...casdoorConfig,
  redirectPath: casdoorAuthRedirectPath
})

const tokenExpiryDelta = 60 * 1000 // 1 minute in milliseconds

export const useUserStore = defineStore('spx-user', {
  state: () => ({
    accessToken: null as string | null,
    refreshToken: null as string | null,

    // timestamp in milliseconds, null if never expires
    accessTokenExpiresAt: null as number | null,
    refreshTokenExpiresAt: null as number | null
  }),
  getters: {
    isAccessTokenValid(): boolean {
      return !!(
        this.accessToken &&
        (this.accessTokenExpiresAt === null ||
          this.accessTokenExpiresAt - tokenExpiryDelta > Date.now())
      )
    },
    isRefreshTokenValid(): boolean {
      return !!(
        this.refreshToken &&
        (this.refreshTokenExpiresAt === null ||
          this.refreshTokenExpiresAt - tokenExpiryDelta > Date.now())
      )
    },
    isSignedIn(): boolean {
      return this.isAccessTokenValid || this.isRefreshTokenValid
    },
    userInfo(): UserInfo | null {
      if (!this.isSignedIn) return null
      return jwtDecode<UserInfo>(this.accessToken!)
    }
  },
  actions: {
    initiateSignIn(
      returnTo: string = window.location.pathname + window.location.search + window.location.hash
    ) {
      // Workaround for casdoor-js-sdk not supporting override of `redirectPath` in `signin_redirect`.
      const casdoorSdk = new Sdk({
        ...casdoorConfig,
        redirectPath: `${casdoorAuthRedirectPath}?returnTo=${encodeURIComponent(returnTo)}`
      })
      casdoorSdk.signin_redirect()
    },
    async completeSignIn() {
      const resp = await casdoorSdk.exchangeForAccessToken()
      this.handleTokenResponse(resp)
    },
    signOut() {
      this.accessToken = null
      this.refreshToken = null
      this.accessTokenExpiresAt = null
      this.refreshTokenExpiresAt = null
    },
    async ensureAccessToken(): Promise<string | null> {
      if (this.isAccessTokenValid) return this.accessToken

      if (this.isRefreshTokenValid) {
        try {
          const resp = await casdoorSdk.refreshAccessToken(this.refreshToken!)
          this.handleTokenResponse(resp)
        } catch (e) {
          console.error('failed to refresh access token', e)
          throw e
        }

        // Due to casdoor-js-sdk's lack of error handling, we must check if the access token is valid after calling
        // `casdoorSdk.refreshAccessToken`. The token might still be invalid if, e.g., the server has already revoked
        // the refresh token.
        if (this.isAccessTokenValid) return this.accessToken
      }

      this.signOut()
      return null
    },
    handleTokenResponse(resp: TokenResponse) {
      this.accessToken = resp.access_token
      this.refreshToken = resp.refresh_token
      this.accessTokenExpiresAt = resp.expires_in ? Date.now() + resp.expires_in * 1000 : null
      this.refreshTokenExpiresAt = resp.refresh_expires_in
        ? Date.now() + resp.refresh_expires_in * 1000
        : null
    }
  },
  persist: true
})
