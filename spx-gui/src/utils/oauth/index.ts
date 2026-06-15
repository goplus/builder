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

export type PKCEAuthorizationRequest = {
  /** CSRF protection value echoed by the authorization callback. */
  state: string
  /** PKCE code verifier kept on the client and later sent to the token endpoint. */
  codeVerifier: string
  /** S256 PKCE code challenge sent with the authorization request. */
  codeChallenge: string
}

/** Creates the browser-side state and PKCE values for an OAuth authorization request. */
export async function createPKCEAuthorizationRequest(): Promise<PKCEAuthorizationRequest> {
  const state = createRandomString()
  const codeVerifier = createRandomString(48)
  const codeChallenge = await createCodeChallenge(codeVerifier)
  return { state, codeVerifier, codeChallenge }
}

export type OAuthCallbackParams = {
  /** Authorization code returned by the authorization server. */
  code: string
  /** State returned by the authorization server; must match the pending authorization state. */
  state: string
}

/** Parses and validates required OAuth authorization callback query parameters. */
export function parseOAuthCallbackParams(search: string): OAuthCallbackParams {
  const params = new URLSearchParams(search)
  const code = params.get('code')?.trim() ?? ''
  const state = params.get('state')?.trim() ?? ''
  if (code === '' || state === '') throw new Error('Missing OAuth callback parameters')
  return { code, state }
}

export type PendingOAuthAuthorization<TData extends object> = {
  /** State sent with the authorization request. */
  state: string
  /** PKCE verifier paired with the challenge sent in the authorization request. */
  codeVerifier: string
  /** App-specific data that needs to survive the redirect round trip. */
  data: TData
}

export function createPendingOAuthAuthorizationStorage<TData extends object>(storageKey: string) {
  return {
    read(): PendingOAuthAuthorization<TData> | null {
      const stored = sessionStorage.getItem(storageKey)
      if (stored == null) return null
      try {
        return JSON.parse(stored) as PendingOAuthAuthorization<TData>
      } catch {
        sessionStorage.removeItem(storageKey)
        return null
      }
    },

    write(value: PendingOAuthAuthorization<TData>) {
      sessionStorage.setItem(storageKey, JSON.stringify(value))
    },

    clear() {
      sessionStorage.removeItem(storageKey)
    }
  }
}

export type OAuthPARParams = {
  /** OAuth client id issued by the authorization server. */
  client_id: string
  /** Exact redirect URI used for both authorization and token exchange. */
  redirect_uri: string
  /** CSRF protection value to be returned by the authorization callback. */
  state: string
  /** S256 PKCE code challenge. */
  code_challenge: string
  /** UI locales hint, formatted as a space-separated BCP47 language tag list. */
  ui_locales?: string
}

export type OAuthPARResponse = {
  /** PAR request URI used as request_uri in the front-channel authorization request. */
  request_uri: string
  /** Seconds until the request_uri expires, if provided by the authorization server. */
  expires_in?: number | null
}

export type OAuthAuthorizeParams = {
  /** OAuth client id issued by the authorization server. */
  client_id: string
  /** PAR request URI returned by the pushed authorization request endpoint. */
  request_uri: string
}

export type OAuthExchangeTokenParams = {
  /** OAuth client id issued by the authorization server. */
  client_id: string
  /** Redirect URI from the authorization request; OAuth servers usually require an exact match. */
  redirect_uri: string
  /** Authorization code returned by the callback. */
  code: string
  /** PKCE verifier paired with the original code challenge. */
  code_verifier: string
}

export type OAuthRefreshTokenParams = {
  /** OAuth client id issued by the authorization server. */
  client_id: string
  /** Refresh token previously returned by the token endpoint. */
  refresh_token: string
}

export type OAuthTokenResponse = {
  /** Access token returned by the token endpoint. */
  access_token: string
  /** Access token lifetime in seconds. */
  expires_in: number
  /** Refresh token, when the authorization server issues one. */
  refresh_token?: string | null
  /** OAuth token type, usually Bearer. */
  token_type?: string
  /** Granted scope string, if returned by the authorization server. */
  scope?: string
}

export type OAuthRevokeTokenParams = {
  /** OAuth client id issued by the authorization server. */
  client_id: string
  /** Access or refresh token to revoke. */
  token: string
}

export type OAuthAPIs = {
  /** Create a pushed authorization request and return the request URI for the authorize URL. */
  createPAR(params: OAuthPARParams): Promise<OAuthPARResponse>
  /** Build the browser-facing authorization URL. */
  buildAuthorizeUrl(params: OAuthAuthorizeParams): string
  /** Exchange an authorization callback code for tokens. */
  exchangeToken(params: OAuthExchangeTokenParams): Promise<OAuthTokenResponse>
  /** Refresh an access token using a refresh token. */
  refreshToken(params: OAuthRefreshTokenParams): Promise<OAuthTokenResponse>
  /** Revoke an access or refresh token. */
  revokeToken(params: OAuthRevokeTokenParams): Promise<void>
}

export type OAuthFlowConfig = {
  /** OAuth client id issued by the authorization server. */
  clientId: string
  /** Redirect URI registered with the authorization server and used during token exchange. */
  redirectUri: string
  /** Session storage key used for pending authorization state. */
  pendingAuthorizationStorageKey?: string
}

export type OAuthAuthorizationResult = {
  /** URL that the browser should navigate to in order to continue authorization. */
  authorizeUrl: string
}

export type CreateOAuthAuthorizationOptions<ExtraData extends object> = {
  /** Extra data to store until the OAuth callback returns */
  data: ExtraData
  /** Preferred UI locales for hosted sign-in */
  uiLocales?: string
}

export type OAuthCallbackResult<ExtraData extends object> = {
  /** Token response obtained from the authorization server. */
  token: OAuthTokenResponse
  /** Extra data associated with the OAuth authorization */
  extraData: ExtraData
}

export class OAuthFlow<ExtraData extends object = object> {
  private pas: ReturnType<typeof createPendingOAuthAuthorizationStorage<ExtraData>>

  constructor(
    private apis: OAuthAPIs,
    private config: OAuthFlowConfig
  ) {
    const pendingAuthorizationStorageKey =
      config.pendingAuthorizationStorageKey ?? 'builder-pending-oauth-authorization'
    this.pas = createPendingOAuthAuthorizationStorage(pendingAuthorizationStorageKey)
  }

  async createAuthorization(options: CreateOAuthAuthorizationOptions<ExtraData>): Promise<OAuthAuthorizationResult> {
    const { data, uiLocales } = options
    const { state, codeVerifier, codeChallenge } = await createPKCEAuthorizationRequest()
    const response = await this.apis.createPAR({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: codeChallenge,
      ui_locales: uiLocales
    })
    this.pas.write({ state, codeVerifier, data })
    const authorizeUrl = this.apis.buildAuthorizeUrl({
      client_id: this.config.clientId,
      request_uri: response.request_uri
    })
    return { authorizeUrl }
  }

  async completeAuthorization(search: string): Promise<OAuthCallbackResult<ExtraData>> {
    const { code, state } = parseOAuthCallbackParams(search)
    const pendingAuthorization = this.pas.read()
    if (pendingAuthorization == null) throw new Error('Missing pending OAuth authorization state')
    if (pendingAuthorization.state !== state) throw new Error('OAuth state mismatch')

    try {
      const token = await this.apis.exchangeToken({
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri,
        code,
        code_verifier: pendingAuthorization.codeVerifier
      })
      return { token, extraData: pendingAuthorization.data }
    } finally {
      this.pas.clear()
    }
  }

  refreshToken(refreshToken: string) {
    return this.apis.refreshToken({
      client_id: this.config.clientId,
      refresh_token: refreshToken
    })
  }

  revokeToken(token: string) {
    return this.apis.revokeToken({
      client_id: this.config.clientId,
      token
    })
  }
}
