import { casdoorSdk } from '@/util/casdoor'
import type ITokenResponse from 'js-pkce/dist/ITokenResponse'
import { defineStore } from 'pinia'

export const useUserStore = defineStore('spx-user', {
  state: () => ({
    accessToken: null as string | null,
    refreshToken: null as string | null,

    // timestamp in milliseconds, null if never expires
    accessTokenExpiresAt: null as number | null,
    refreshTokenExpiresAt: null as number | null
  }),
  actions: {
    async getFreshAccessToken(): Promise<string | null> {
      if (!this.accessTokenValid()) {
        if (!this.refreshTokenValid()) {
          this.logout()
          return null
        }

        try {
          const tokenResp = await casdoorSdk.pkce.refreshAccessToken(this.refreshToken!)
          this.setToken(tokenResp)
        } catch (error) {
          // TODO: not to clear storage for network error
          console.error('Failed to refresh access token', error)
          this.logout()
          throw error
        }
      }
      return this.accessToken
    },
    setToken(tokenResp: ITokenResponse) {
      const accessTokenExpiresAt = tokenResp.expires_in
        ? Date.now() + tokenResp.expires_in * 1000
        : null
      const refreshTokenExpiresAt = tokenResp.refresh_expires_in
        ? Date.now() + tokenResp.refresh_expires_in * 1000
        : null
      this.accessToken = tokenResp.access_token
      this.refreshToken = tokenResp.refresh_token
      this.accessTokenExpiresAt = accessTokenExpiresAt
      this.refreshTokenExpiresAt = refreshTokenExpiresAt
    },
    logout() {
      this.accessToken = null
      this.refreshToken = null
      this.accessTokenExpiresAt = null
      this.refreshTokenExpiresAt = null
    },
    hasLoggedIn() {
      return this.accessTokenValid() || this.refreshTokenValid()
    },
    accessTokenValid() {
      const delta = 60 * 1000 // 1 minute
      return !!(
        this.accessToken &&
        (this.accessTokenExpiresAt === null || this.accessTokenExpiresAt - delta > Date.now())
      )
    },
    refreshTokenValid() {
      const delta = 60 * 1000 // 1 minute
      return !!(
        this.refreshToken &&
        (this.refreshTokenExpiresAt === null || this.refreshTokenExpiresAt - delta > Date.now())
      )
    },
    async loginWithCurrentUrl() {
      await casdoorSdk.pkce.exchangeForAccessToken(window.location.href)
    }
  },
  persist: true
})
