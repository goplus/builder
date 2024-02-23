import { casdoorSdk } from '@/util/casdoor'
import type ITokenResponse from 'js-pkce/dist/ITokenResponse'
import { defineStore } from 'pinia'

// https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
const parseJwt = (token: string) => {
  const base64Url = token.split('.')[1]
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      })
      .join('')
  )

  return JSON.parse(jsonPayload)
}

export interface JwtPayload {
  name: string
  id: string
  displayName: string
  avatar: string
  email: string
  emailVerified: boolean
  phone: string
}

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
          this.signOut()
          return null
        }

        try {
          const tokenResp = await casdoorSdk.pkce.refreshAccessToken(this.refreshToken!)
          this.setToken(tokenResp)
        } catch (error) {
          // TODO: not to clear storage for network error
          console.error('Failed to refresh access token', error)
          this.signOut()
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
    signOut() {
      this.accessToken = null
      this.refreshToken = null
      this.accessTokenExpiresAt = null
      this.refreshTokenExpiresAt = null
    },
    hasSignedIn() {
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
    async consumeCurrentUrl() {
      const tokenResp = await casdoorSdk.pkce.exchangeForAccessToken(window.location.href)
      this.setToken(tokenResp)
    },
    signInWithRedirection() {
      casdoorSdk.signinWithRedirection()
    }
  },
  getters: {
    userInfo: (state) => {
      if (!state.accessToken) return null
      return parseJwt(state.accessToken) as JwtPayload
    }
  },
  persist: true
})
