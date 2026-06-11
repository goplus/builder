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
  state: string
  codeVerifier: string
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
  code: string
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
  state: string
  codeVerifier: string
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
  client_id: string
  redirect_uri: string
  state: string
  code_challenge: string
}

export type OAuthPARResponse = {
  request_uri: string
  expires_in?: number | null
}

export type OAuthAuthorizeParams = {
  client_id: string
  request_uri: string
}

export type OAuthExchangeTokenParams = {
  client_id: string
  redirect_uri: string
  code: string
  code_verifier: string
}

export type OAuthRefreshTokenParams = {
  client_id: string
  refresh_token: string
}

export type OAuthTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string | null
  token_type?: string
  scope?: string
}

export type OAuthRevokeTokenParams = {
  client_id: string
  token: string
}

export type OAuthAPIs = {
  createPAR(params: OAuthPARParams): Promise<OAuthPARResponse>
  buildAuthorizeUrl(params: OAuthAuthorizeParams): string
  exchangeToken(params: OAuthExchangeTokenParams): Promise<OAuthTokenResponse>
  refreshToken(params: OAuthRefreshTokenParams): Promise<OAuthTokenResponse>
  revokeToken(params: OAuthRevokeTokenParams): Promise<void>
}

export type OAuthFlowConfig = {
  clientId: string
  redirectUri: string
  pendingAuthorizationStorageKey?: string
}

export type OAuthAuthorizationResult = {
  authorizeUrl: string
}

export type OAuthCallbackResult<ExtraData extends object> = {
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
    const pendingAuthorizationStorageKey = config.pendingAuthorizationStorageKey ?? 'spx-gui-pending-authorization'
    this.pas = createPendingOAuthAuthorizationStorage(pendingAuthorizationStorageKey)
  }

  async createAuthorization(data: ExtraData): Promise<OAuthAuthorizationResult> {
    const { state, codeVerifier, codeChallenge } = await createPKCEAuthorizationRequest()
    const response = await this.apis.createPAR({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: codeChallenge
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
