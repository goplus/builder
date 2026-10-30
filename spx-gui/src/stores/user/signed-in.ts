import { inject, ref, shallowRef, watch, type App, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import { useQueryCache } from '@/utils/query'
import { ActionException, Cancelled, capture } from '@/utils/exception'
import { Disposable } from '@/utils/disposable'
import { OAuthErrorCode, OAuthFlow, type OAuthTokenResponse } from '@/utils/oauth'
import { normalizeLang, useI18n, type I18n } from '@/utils/i18n'
import { OAuthException } from '@/apis/common/exception'
import * as userApis from '@/apis/user'
import { accountOAuthApisForXBuilder as oauthApis } from '@/apis/account/oauth'
import { getUserQueryKey } from './query-keys'

export type SignedInUser = userApis.SignedInUser
export type SignedInOptions = { oauthClientId: string }

type Credentials = {
  accessToken: string
  accessTokenExpiresAt: number
  refreshToken: string | null
  username: string
}

/** Storage key for user credentials. */
const credentialsStorageKey = 'builder-user'
/** Lock name for user token refresh. */
const tokenRefreshLockName = 'builder-user-access-token'
/** Time buffer for token refresh, in milliseconds. */
const tokenRefreshBuffer = 60 * 1000
/** Injection key for the signed-in store. */
const signedInKey: InjectionKey<SignedIn> = Symbol('signed-in')

/** Owns app credentials, current user information and their asynchronous operations. */
export class SignedIn extends Disposable {
  private readonly oauthFlow: OAuthFlow<{ returnTo: string }>

  constructor(
    private readonly i18n: I18n,
    private readonly queryCache: ReturnType<typeof useQueryCache>,
    { oauthClientId }: SignedInOptions
  ) {
    super()
    const credentials = this.readStoredCredentials()
    this.credentials = credentials
    const isSignedIn =
      credentials != null && (credentials.refreshToken != null || this.validateCredentials(credentials))
    this.isSignedInRef = ref(isSignedIn)
    this.usernameRef = ref(isSignedIn ? credentials.username : null)

    this.identityScope = new Disposable()
    this.cachedUserRef = shallowRef(null)
    this.pendingUserRequest = null

    this.oauthFlow = new OAuthFlow(oauthApis, {
      clientId: oauthClientId,
      redirectUri: `${window.location.origin}/sign-in/callback`
    })
    const restore = (event: StorageEvent) => {
      if (event.key == null || event.key === credentialsStorageKey) this.syncStoredCredentials()
    }
    window.addEventListener('storage', restore)
    this.addDisposer(() => window.removeEventListener('storage', restore))
    this.addDisposer(() => this.identityScope.dispose())
    this.addDisposer(
      watch(
        this.usernameRef,
        (username) => {
          if (username == null || this.cachedUserRef.value != null) return
          void this.getUser().catch((e) => {
            if (!(e instanceof Cancelled)) capture(e, 'Failed to load signed-in user information')
          })
        },
        { immediate: true, flush: 'sync' }
      )
    )
  }

  private credentials: Credentials | null

  private readStoredCredentials(): Credentials | null {
    const stored = localStorage.getItem(credentialsStorageKey)
    try {
      const credentials: Credentials | null = stored == null ? null : JSON.parse(stored)
      return credentials?.accessToken == null ? null : credentials
    } catch {
      localStorage.removeItem(credentialsStorageKey)
      return null
    }
  }

  private updateCredentials(credentials: Credentials | null) {
    this.credentials = credentials
    const isSignedIn =
      credentials != null && (credentials.refreshToken != null || this.validateCredentials(credentials))
    this.isSignedInRef.value = isSignedIn
    this.usernameRef.value = isSignedIn ? credentials.username : null
  }

  private writeStoredCredentials(credentials: Credentials | null) {
    if (credentials == null) localStorage.removeItem(credentialsStorageKey)
    else localStorage.setItem(credentialsStorageKey, JSON.stringify(credentials))
  }

  private syncStoredCredentials() {
    const next = this.readStoredCredentials()
    const previous = this.credentials
    const changed = next?.username !== previous?.username || (next == null) !== (previous == null)
    if (!changed) {
      this.updateCredentials(next)
      return
    }
    this.resetIdentity(next)
  }

  private clearCredentials() {
    this.resetIdentity(null)
    this.writeStoredCredentials(null)
  }

  private validateCredentials(credentials: Credentials | null) {
    return credentials != null && credentials.accessTokenExpiresAt - tokenRefreshBuffer > Date.now()
  }

  /**
   * Returns a valid access token without collecting reactive dependencies, or null when signed out.
   * When refresh is needed, missing or invalid refresh tokens clear the session and resolve null.
   * Other refresh failures preserve credentials and reject so callers can retry.
   */
  async ensureAccessToken(): Promise<string | null> {
    const credentials = this.credentials
    if (this.validateCredentials(credentials)) return credentials!.accessToken
    if (credentials == null) return null
    await navigator.locks.request(tokenRefreshLockName, async () => {
      // Another tab may have refreshed the token while this request waited for the lock.
      this.syncStoredCredentials()
      const credentials = this.credentials
      if (this.validateCredentials(credentials)) return
      const refreshToken = credentials?.refreshToken
      if (refreshToken == null) {
        this.clearCredentials()
        return
      }
      const signal = this.identityScope.getSignal()
      try {
        const token = await this.oauthFlow.refreshToken(refreshToken)
        signal.throwIfAborted()
        // Persist rotated tokens without requiring a successful profile request.
        const next = { ...this.parseTokenResponse(token), username: this.credentials!.username }
        this.updateCredentials(next)
        this.writeStoredCredentials(next)
      } catch (e) {
        signal.throwIfAborted()
        capture(e, 'Failed to refresh access token')
        if (e instanceof OAuthException && e.error === OAuthErrorCode.InvalidGrant) {
          this.clearCredentials()
          return
        }
        throw e
      }
    })
    return this.credentials?.accessToken ?? null
  }

  private parseTokenResponse(token: OAuthTokenResponse): Omit<Credentials, 'username'> {
    return {
      accessToken: token.access_token,
      accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
      refreshToken: token.refresh_token ?? null
    }
  }

  /** Stable reactive login result, recomputed when credentials change. */
  private readonly isSignedInRef: Ref<boolean>

  /** Reads the maintained login state; elapsed time alone does not change it. */
  get isSignedIn(): boolean {
    return this.isSignedInRef.value
  }

  private readonly usernameRef: Ref<string | null>

  /** Current session username, available before the profile loads; null when signed out. */
  get username() {
    return this.usernameRef.value
  }

  /** Cancels operations from the previous identity on sign-in, sign-out or account switching. */
  private identityScope: Disposable

  private resetIdentity(credentials: Credentials | null, user: SignedInUser | null = null) {
    this.identityScope.dispose()
    this.identityScope = new Disposable()
    this.cancelPendingUserRequest()
    this.cachedUserRef.value = user
    this.updateCredentials(credentials)
  }

  async signIn(returnTo = window.location.pathname + window.location.search + window.location.hash) {
    const { authorizeUrl } = await this.oauthFlow.createAuthorization({
      data: { returnTo },
      uiLocales: normalizeLang(this.i18n.lang.value)
    })
    window.location.assign(authorizeUrl)
  }

  async completeSignIn(search: string) {
    const signal = this.identityScope.getSignal()
    const { token, extraData } = await this.oauthFlow.completeAuthorization(search)
    signal.throwIfAborted()
    const credentials = this.parseTokenResponse(token)
    const user = await userApis.getSignedInUser(token.access_token)
    signal.throwIfAborted()
    const next = { ...credentials, username: user.username }
    this.writeStoredCredentials(next)
    this.resetIdentity(next, user)
    return extraData
  }

  async signOut() {
    const credentials = this.credentials
    this.clearCredentials()
    await Promise.all(
      [credentials?.accessToken, credentials?.refreshToken]
        .filter((token) => token != null)
        .map((token) => this.oauthFlow.revokeToken(token))
    ).catch((e) => capture(e, 'Failed to revoke tokens during sign out'))
  }

  /** Last successful profile for the current identity, shared by getUser consumers. */
  private readonly cachedUserRef: ShallowRef<SignedInUser | null>

  /** Loaded user information, or null when signed out, still loading or a load has failed. */
  get user(): SignedInUser | null {
    return this.cachedUserRef.value
  }

  /** Shares an in-flight profile read; profile mutations cancel it to prevent stale writes. */
  private pendingUserRequest: { scope: Disposable; promise: Promise<SignedInUser | null> } | null

  /** Gets shared, cached user information. */
  async getUser({ signal }: { signal?: AbortSignal } = {}) {
    signal?.throwIfAborted()
    const username = this.username
    const cached = this.cachedUserRef.value
    if (username == null) return null
    if (cached != null) return cached
    if (this.pendingUserRequest == null) {
      const scope = new Disposable()
      scope.disposeOnSignal(this.identityScope.getSignal())
      const promise = this.fetchAndCacheUser(scope.getSignal())
      const request = { scope, promise }
      this.pendingUserRequest = request
      const cleanup = () => {
        if (this.pendingUserRequest === request) this.cancelPendingUserRequest()
      }
      void promise.then(cleanup, cleanup)
    }
    const user = await this.pendingUserRequest.promise
    signal?.throwIfAborted()
    return user
  }

  private async fetchAndCacheUser(signal: AbortSignal) {
    try {
      const token = await this.ensureAccessToken()
      signal.throwIfAborted()
      const user = token == null ? null : await userApis.getSignedInUser(token)
      signal.throwIfAborted()
      this.setCachedUser(user)
      return user
    } catch (e) {
      signal.throwIfAborted()
      throw new ActionException(e, {
        en: 'Failed to load signed-in user information',
        zh: '加载当前用户信息失败'
      })
    }
  }

  private cancelPendingUserRequest() {
    this.pendingUserRequest?.scope.dispose()
    this.pendingUserRequest = null
  }

  private setCachedUser(user: SignedInUser | null) {
    this.getSignal().throwIfAborted()
    const credentials = this.credentials
    if (user != null && credentials != null && user.username !== credentials.username) {
      void this.signOut()
      throw new Cancelled('Signed-in username changed')
    }
    this.cancelPendingUserRequest()
    this.cachedUserRef.value = user
  }

  private applyUserUpdate(user: SignedInUser, signal: AbortSignal) {
    signal.throwIfAborted()
    this.setCachedUser(user)
    void this.queryCache.invalidate(getUserQueryKey(user.username))
    return user
  }

  async updateProfile(params: Pick<userApis.UpdateSignedInUserParams, 'displayName' | 'description'>) {
    const signal = this.identityScope.getSignal()
    try {
      return this.applyUserUpdate(await userApis.updateSignedInUser(params), signal)
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, { en: 'Failed to update profile', zh: '更新个人信息失败' })
    }
  }

  async updateAvatar(file: File) {
    const signal = this.identityScope.getSignal()
    try {
      await userApis.updateSignedInUserAvatar(file)
      signal.throwIfAborted()
      return this.applyUserUpdate(await userApis.getSignedInUser(), signal)
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, { en: 'Failed to update avatar', zh: '更新头像失败' })
    }
  }

  /**
   * Changes the username and signs out the current user.
   * Callers can reload the route to trigger navigation checks or initiate sign-in again.
   */
  async modifyUsername(username: string) {
    const signal = this.identityScope.getSignal()
    const oldUsername = this.username
    try {
      const user = await userApis.updateSignedInUser({ username })
      signal.throwIfAborted()
      if (oldUsername != null && oldUsername !== user.username)
        void this.queryCache.invalidate(getUserQueryKey(oldUsername))
      void this.queryCache.invalidate(getUserQueryKey(user.username))
      await this.signOut()
      return user
    } catch (e) {
      if (e instanceof Cancelled) throw e
      throw new ActionException(e, { en: 'Failed to modify username', zh: '修改用户名失败' })
    }
  }

  /** Returns null when signed in but the profile is unavailable, including after a load failure. */
  get canUseAdminConsole(): boolean | null {
    const user = this.cachedUserRef.value
    if (user == null) return this.isSignedInRef.value ? null : false
    return (
      user.capabilities.canManageAccount === true ||
      user.capabilities.canManageAuthorization === true ||
      user.capabilities.canManageFeedback === true
    )
  }
}

/** Creates and provides the signed-in store after its app dependencies have been installed. */
export function initSignedIn(app: App, options: SignedInOptions) {
  const { i18n, queryCache } = app.runWithContext(() => ({ i18n: useI18n(), queryCache: useQueryCache() }))
  const signedIn = new SignedIn(i18n, queryCache, options)
  app.provide(signedInKey, signedIn)
  app.onUnmount(() => signedIn.dispose())
  return signedIn
}

export function useSignedIn() {
  const signedIn = inject(signedInKey)
  if (signedIn == null) throw new Error('SignedIn is not installed')
  return signedIn
}
