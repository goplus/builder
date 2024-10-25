import { type App } from 'vue'
import { defineStore, createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import Sdk from 'casdoor-js-sdk'
import { casdoorConfig } from '@/utils/env'
import { jwtDecode } from 'jwt-decode'

export interface UserInfo {
  id: string
  name: string
  displayName: string
  avatar: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
}

const casdoorAuthRedirectPath = '/sign-in/callback'
const casdoorSdk = new Sdk({
  ...casdoorConfig,
  redirectPath: casdoorAuthRedirectPath
})

const tokenExpiryDelta = 60 * 1000 // 1 minute in milliseconds

export const useUserStore = defineStore('spx-user', {
  state: () => ({
    accessToken: null as string | null,
    accessTokenExpiresAt: null as number | null, // timestamp in milliseconds, null if never expires
    refreshToken: null as string | null
  }),
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
      this.accessTokenExpiresAt = null
      this.refreshToken = null
    },
    async ensureAccessToken(): Promise<string | null> {
      if (this.isAccessTokenValid()) return this.accessToken

      if (this.refreshToken != null) {
        try {
          const resp = await casdoorSdk.refreshAccessToken(this.refreshToken)
          this.handleTokenResponse(resp)
        } catch (e) {
          console.error('failed to refresh access token', e)
          throw e
        }

        // Due to casdoor-js-sdk's lack of error handling, we must check if the access token is valid after calling
        // `casdoorSdk.refreshAccessToken`. The token might still be invalid if, e.g., the server has already revoked
        // the refresh token.
        if (this.isAccessTokenValid()) return this.accessToken
      }

      this.signOut()
      return null
    },
    handleTokenResponse(resp: TokenResponse) {
      this.accessToken = resp.access_token
      this.accessTokenExpiresAt = resp.expires_in ? Date.now() + resp.expires_in * 1000 : null
      this.refreshToken = resp.refresh_token
    },
    isAccessTokenValid(): boolean {
      return !!(
        this.accessToken &&
        (this.accessTokenExpiresAt === null ||
          this.accessTokenExpiresAt - tokenExpiryDelta > Date.now())
      )
    },
    isSignedIn(): boolean {
      return this.isAccessTokenValid() || this.refreshToken != null
    },
    // TODO: return type `User` instead of `UserInfo` to keep consistency with `getUser` in `src/apis/user.ts`
    getSignedInUser(): UserInfo | null {
      if (!this.isSignedIn()) return null
      return jwtDecode<UserInfo>(this.accessToken!)
    }
  },
  persist: true
})

// TODO: we may get rid of pinia as it offers almost nothing.
export function initUserStore(app: App) {
  const store = createPinia()
  store.use(piniaPluginPersistedstate)
  app.use(store)
}
