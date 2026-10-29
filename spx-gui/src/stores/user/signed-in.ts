import { computed, inject, markRaw, ref, shallowRef, type App, type InjectionKey, type ObjectPlugin } from 'vue'
import { useQueryCache, type Loadable } from '@/utils/query'
import { ActionException, Cancelled, capture } from '@/utils/exception'
import { Disposable } from '@/utils/disposable'
import { OAuthErrorCode, OAuthFlow, type OAuthTokenResponse } from '@/utils/oauth'
import { normalizeLang, useI18n, type I18n } from '@/utils/i18n'
import { OAuthException } from '@/apis/common/exception'
import * as userApis from '@/apis/user'
import { accountOAuthApisForXBuilder as oauthApis } from '@/apis/account/oauth'
import { getUserQueryKey } from './query-keys'

export type SignedInUser = userApis.SignedInUser
export type SignedInState = { isSignedIn: false; user: null } | { isSignedIn: true; user: SignedInUser }

export type SignedInOptions = { clientId: string }

type Credentials = {
  accessToken: string | null
  accessTokenExpiresAt: number | null
  refreshToken: string | null
  username: string | null
}

const emptyCredentials: Credentials = {
  accessToken: null,
  accessTokenExpiresAt: null,
  refreshToken: null,
  username: null
}
const storageKey = 'builder-user'
const accessTokenLockName = 'builder-user-access-token'
const tokenExpiryDelta = 60 * 1000
const signedInKey: InjectionKey<SignedIn> = Symbol('signed-in')
const loadFailureMessage = { en: 'Failed to load signed-in user information', zh: '加载当前用户信息失败' }

/** Owns the app's credentials and current user. Credential rotation does not publish reactive changes. */
export class SignedIn extends Disposable implements ObjectPlugin<[]> {
  private credentials = this.readCredentials()
  private oauthFlow: OAuthFlow<{ returnTo: string }>
  private version = 0
  private loading: object | null = null
  private i18n: I18n | null = null
  private invalidateUser: (username: string) => void = () => {}
  private data = shallowRef<SignedInState | null>(null)
  private error = shallowRef<ActionException | null>(null)
  private isLoading = ref(true)

  readonly state: Loadable<SignedInState> = {
    data: computed(() => this.data.value),
    error: computed(() => this.error.value),
    isLoading: computed(() => this.isLoading.value)
  }
  private signedIn = ref(this.credentials.refreshToken != null || this.accessTokenValid())
  private usernameRef = ref(this.credentials.username)
  private userRef = computed(() => this.data.value?.user ?? null)
  private adminConsoleAllowed = computed(() => {
    if (this.data.value == null) return null
    const capabilities = this.data.value?.user?.capabilities
    return capabilities?.canManageAccount === true || capabilities?.canManageAuthorization === true
  })

  constructor({ clientId }: SignedInOptions) {
    super()
    markRaw(this)
    this.oauthFlow = new OAuthFlow(oauthApis, {
      clientId,
      redirectUri: `${window.location.origin}/sign-in/callback`
    })
    const restore = (event: StorageEvent) => {
      if (event.key == null || event.key === storageKey) this.restoreCredentials()
    }
    window.addEventListener('storage', restore)
    this.addDisposer(() => window.removeEventListener('storage', restore))
    this.addDisposer(() => {
      this.version++
      this.loading = null
    })
  }

  install(app: App) {
    const { i18n, queryCache } = app.runWithContext(() => ({ i18n: useI18n(), queryCache: useQueryCache() }))
    this.i18n = i18n
    this.invalidateUser = (username) => {
      void queryCache.invalidate(getUserQueryKey(username))
    }
    app.provide(signedInKey, this)
    app.onUnmount(() => this.dispose())
    this.reload()
  }

  /** Judges locally available credentials synchronously, independently of user loading.
   * Expiry is checked at call time; time passing alone does not trigger reactive consumers.
   */
  isSignedIn(): boolean {
    return this.signedIn.value && (this.credentials.refreshToken != null || this.accessTokenValid())
  }
  /** Locally stored username, available before user information loads. */
  get username() {
    return this.isSignedIn() ? this.usernameRef.value : null
  }
  get user() {
    return this.userRef.value
  }

  canUseAdminConsole() {
    return this.adminConsoleAllowed.value
  }

  private readCredentials(): Credentials {
    const stored = localStorage.getItem(storageKey)
    try {
      return stored == null ? { ...emptyCredentials } : JSON.parse(stored)
    } catch {
      localStorage.removeItem(storageKey)
      return { ...emptyCredentials }
    }
  }

  private persist(credentials: Credentials) {
    this.credentials = credentials
    this.usernameRef.value = credentials.username
    this.signedIn.value = credentials.refreshToken != null || this.accessTokenValid()
    localStorage.setItem(storageKey, JSON.stringify(credentials))
  }

  private restoreCredentials() {
    const next = this.readCredentials()
    const changed =
      next.username !== this.credentials.username ||
      (next.accessToken == null) !== (this.credentials.accessToken == null)
    this.credentials = next
    this.usernameRef.value = next.username
    this.signedIn.value = next.refreshToken != null || this.accessTokenValid()
    if (!changed) return
    const signedOut = next.accessToken == null && next.refreshToken == null
    this.resetSession(signedOut ? { isSignedIn: false, user: null } : null)
    if (!signedOut) this.reload()
  }

  private publish(state: SignedInState | null) {
    this.loading = null
    this.data.value = state
    this.error.value = null
    this.isLoading.value = state == null
  }

  private resetSession(state: SignedInState | null) {
    this.version++
    this.publish(state)
  }

  private clearCredentials() {
    this.persist({ ...emptyCredentials })
    this.resetSession({ isSignedIn: false, user: null })
  }

  private assertCurrent(version: number) {
    if (version !== this.version || this.isDisposed) throw new Cancelled('signed-in identity changed')
  }

  /** Starts a shared user load; consume its result or error through state. */
  reload(): void {
    if (this.loading != null) return
    const task = {}
    this.loading = task
    this.isLoading.value = true
    this.error.value = null
    void this.load(task)
  }

  private async load(task: object) {
    try {
      const token = await this.ensureAccessToken()
      if (this.loading !== task) return
      const state: SignedInState =
        token == null
          ? { isSignedIn: false, user: null }
          : { isSignedIn: true, user: await userApis.getSignedInUser(token) }
      if (this.loading !== task) return
      this.publish(state)
    } catch (e) {
      if (this.loading !== task) return
      this.loading = null
      this.error.value = new ActionException(e, loadFailureMessage)
      this.isLoading.value = false
      capture(e, 'Failed to load signed-in state')
    }
  }

  private accessTokenValid() {
    const state = this.credentials
    return (
      state.accessToken != null &&
      (state.accessTokenExpiresAt == null || state.accessTokenExpiresAt - tokenExpiryDelta > Date.now())
    )
  }

  /** Returns a valid token without collecting reactive dependencies; invalid credentials resolve null. */
  async ensureAccessToken(): Promise<string | null> {
    if (this.accessTokenValid()) return this.credentials.accessToken
    if (this.credentials.accessToken == null && this.credentials.refreshToken == null) return null
    await navigator.locks.request(accessTokenLockName, async () => {
      this.restoreCredentials()
      if (this.accessTokenValid()) return
      const { refreshToken, username } = this.credentials
      if (refreshToken == null) {
        this.clearCredentials()
        return
      }
      const version = this.version
      try {
        const token = await this.oauthFlow.refreshToken(refreshToken)
        this.assertCurrent(version)
        this.persist({ ...this.credentialsFromToken(token), username })
      } catch (e) {
        this.assertCurrent(version)
        capture(e, 'Failed to refresh access token')
        if (e instanceof OAuthException && e.error === OAuthErrorCode.InvalidGrant) {
          this.clearCredentials()
          return
        }
        throw e
      }
    })
    return this.credentials.accessToken
  }

  private credentialsFromToken(token: OAuthTokenResponse): Omit<Credentials, 'username'> {
    return {
      accessToken: token.access_token,
      accessTokenExpiresAt: token.expires_in == null ? null : Date.now() + token.expires_in * 1000,
      refreshToken: token.refresh_token ?? null
    }
  }

  async signIn(returnTo = window.location.pathname + window.location.search + window.location.hash) {
    if (this.i18n == null) throw new Error('SignedIn is not installed')
    const { authorizeUrl } = await this.oauthFlow.createAuthorization({
      data: { returnTo },
      uiLocales: normalizeLang(this.i18n.lang.value)
    })
    window.location.assign(authorizeUrl)
  }

  async completeSignIn(search: string) {
    const version = this.version
    const { token, extraData } = await this.oauthFlow.completeAuthorization(search)
    this.assertCurrent(version)
    const credentials = this.credentialsFromToken(token)
    const user = await userApis.getSignedInUser(token.access_token)
    this.assertCurrent(version)
    this.persist({ ...credentials, username: user.username })
    this.resetSession({ isSignedIn: true, user })
    return extraData
  }

  async signOut() {
    const { accessToken, refreshToken } = this.credentials
    this.clearCredentials()
    await Promise.all(
      [accessToken, refreshToken].filter((token) => token != null).map((token) => this.oauthFlow.revokeToken(token))
    ).catch((e) => capture(e, 'Failed to revoke tokens during sign out'))
  }

  private applyUser(user: SignedInUser, version: number) {
    this.assertCurrent(version)
    this.publish({ isSignedIn: true, user })
    this.invalidateUser(user.username)
    return user
  }

  async updateProfile(params: Pick<userApis.UpdateSignedInUserParams, 'displayName' | 'description'>) {
    const version = this.version
    try {
      return this.applyUser(await userApis.updateSignedInUser(params), version)
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, { en: 'Failed to update profile', zh: '更新个人信息失败' })
    }
  }

  async updateAvatar(file: File) {
    const version = this.version
    try {
      await userApis.updateSignedInUserAvatar(file)
      this.assertCurrent(version)
      return this.applyUser(await userApis.getSignedInUser(), version)
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, { en: 'Failed to update avatar', zh: '更新头像失败' })
    }
  }

  /** Changing username signs out the current user. */
  async modifyUsername(username: string) {
    const version = this.version
    const oldUsername = this.username
    try {
      const user = await userApis.updateSignedInUser({ username })
      this.assertCurrent(version)
      if (oldUsername != null && oldUsername !== user.username) this.invalidateUser(oldUsername)
      this.invalidateUser(user.username)
      await this.signOut()
      return user
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, { en: 'Failed to modify username', zh: '修改用户名失败' })
    }
  }
}

export function createSignedIn(options: SignedInOptions) {
  return new SignedIn(options)
}

export function useSignedIn() {
  const signedIn = inject(signedInKey)
  if (signedIn == null) throw new Error('SignedIn is not installed')
  return signedIn
}
