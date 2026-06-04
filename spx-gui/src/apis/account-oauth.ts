import { Client } from '@/apis/common/client'
import { accountOAuthClientId, apiBaseUrl } from '@/utils/env'

const client = new Client()

export interface PushedAuthorizationRequestResponse {
  request_uri: string
  expires_in?: number | null
}

export interface AccountOAuthTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string | null
  token_type?: string
  scope?: string
}

function getAccountOAuthRedirectUri() {
  return `${window.location.origin}/sign-in/callback`
}

export function getAccountOAuthAuthorizeUrl(requestUri: string) {
  const url = new URL('/account/oauth/authorize', new URL(apiBaseUrl, window.location.origin))
  url.searchParams.set('client_id', accountOAuthClientId)
  url.searchParams.set('request_uri', requestUri)
  return url.toString()
}

export function createPushedAuthorizationRequest(params: { state: string; codeChallenge: string }) {
  return client.postForm('/account/oauth/par', {
    client_id: accountOAuthClientId,
    response_type: 'code',
    redirect_uri: getAccountOAuthRedirectUri(),
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    scope: 'account:user:read'
  }) as Promise<PushedAuthorizationRequestResponse>
}

export function exchangeAuthorizationCode(code: string, codeVerifier: string) {
  return client.postForm('/account/oauth/token', {
    grant_type: 'authorization_code',
    client_id: accountOAuthClientId,
    code,
    redirect_uri: getAccountOAuthRedirectUri(),
    code_verifier: codeVerifier
  }) as Promise<AccountOAuthTokenResponse>
}

export function exchangeRefreshToken(refreshToken: string) {
  return client.postForm('/account/oauth/token', {
    grant_type: 'refresh_token',
    client_id: accountOAuthClientId,
    refresh_token: refreshToken
  }) as Promise<AccountOAuthTokenResponse>
}

export async function revokeOAuthToken(token: string | null) {
  if (token == null) return
  await client.postForm('/account/oauth/revoke', {
    client_id: accountOAuthClientId,
    token
  })
}
