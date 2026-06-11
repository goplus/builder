/**
 * API client for the main xbuilder.com OAuth flow.
 *
 * These are used by the main site's sign-in flow (stores/user/signed-in.ts
 * and pages/sign-in/callback.vue) to interact with the Account OAuth
 * endpoints — pushed authorization request (PAR), authorization code
 * exchange, token refresh, and token revocation.
 *
 * This file is for the main site's OAuth client. For the Account Web sign-in
 * page session API, see index.ts.
 */

import { Client } from '@/apis/common/client'
import { apiBaseUrl } from '@/utils/env'
import type { OAuthAPIs } from '@/utils/oauth'
import { accountClient } from './common'

export type PARParams = {
  client_id: string
  redirect_uri: string
  state: string
  code_challenge: string
  ui_locales?: string
}

export type PARResponse = {
  request_uri: string
  expires_in?: number | null
}

export type AuthorizeParams = {
  client_id: string
  request_uri: string
}

export type ExchangeTokenParams = {
  client_id: string
  redirect_uri: string
  code: string
  code_verifier: string
}

export type RefreshTokenParams = {
  client_id: string
  refresh_token: string
}

export type TokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string | null
  token_type?: string
  scope?: string
}

export type RevokeTokenParams = {
  client_id: string
  token: string
}

class AccountOAuthApis implements OAuthAPIs {
  constructor(private client: Client) {}

  createPAR(params: PARParams) {
    return this.client.postForm('/oauth/par', {
      response_type: 'code',
      code_challenge_method: 'S256',
      scope: 'account:user:read',
      ...params
    }) as Promise<PARResponse>
  }

  buildAuthorizeUrl(params: AuthorizeParams) {
    const url = this.client.urlFor('/oauth/authorize')
    url.searchParams.set('client_id', params.client_id)
    url.searchParams.set('request_uri', params.request_uri)
    return url.toString()
  }

  exchangeToken(params: ExchangeTokenParams) {
    return this.client.postForm('/oauth/token', {
      grant_type: 'authorization_code',
      ...params
    }) as Promise<TokenResponse>
  }

  refreshToken(params: RefreshTokenParams) {
    return this.client.postForm('/oauth/token', {
      grant_type: 'refresh_token',
      ...params
    }) as Promise<TokenResponse>
  }

  async revokeToken(params: RevokeTokenParams) {
    await this.client.postForm('/oauth/revoke', params)
  }
}

/** Account OAuth APIs for use by app xbuilder. */
export const accountOAuthApisForXBuilder = new AccountOAuthApis(
  new Client({
    baseUrl: apiBaseUrl + '/account'
  })
)

/** Account OAuth APIs for use by app account. */
export const accountOAuthApis = new AccountOAuthApis(accountClient)
