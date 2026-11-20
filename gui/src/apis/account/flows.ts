import type { Client, OAuthExceptionPayload } from '@/apis/common/client'
import type { AccountFacade, AccountIdentityProviderName, AccountUser, AccountWeChatReturnTarget } from './common'
import type { CurrentAccountSession } from '.'

export type AccountOAuthError = OAuthExceptionPayload

type AuthorizationCorrelation = {
  requestURI: string
  version: number
  state: string
}

export type AccountAuthorizationStatus = AuthorizationCorrelation &
  (
    | { status: 'pending'; expiresAt: string }
    | { status: 'authorized'; codeAvailable: true; codeExpiresAt: string }
    | {
        status: 'authorized'
        codeAvailable: false
        codeExpiresAt: string
        unavailableReason: 'consumed' | 'expired' | 'revoked'
      }
    | { status: 'denied' | 'cancelled'; oauthError: AccountOAuthError & { error: 'access_denied' } }
    | { status: 'expired'; oauthError: AccountOAuthError & { error: 'invalid_request' } }
  )

export type AccountAuthorizationResult = AccountAuthorizationStatus & {
  redirectURI: string
  wechatReturnTarget: AccountWeChatReturnTarget | null
} & ({ status: 'authorized'; codeAvailable: true; code: string } | { codeAvailable?: false; code?: never })

export type AccountRequestingApp = {
  id: string
  displayName: string
  avatar: string | null
}

export type AccountAuthenticationOption =
  | { method: 'password'; acquisition: 'password' }
  | {
      method: 'wechat'
      acquisition: 'wechat_login' | 'wechat_website' | 'wechat_service_account' | 'wechat_url_link'
    }
  | {
      method: Exclude<AccountIdentityProviderName, 'wechat'>
      acquisition: 'provider_redirect' | 'external_browser'
    }

export type AccountAuthorizationContext = AccountAuthorizationStatus & {
  app: AccountRequestingApp
  scope: string
  authenticationRequestID: string | null
  authenticationOptions: AccountAuthenticationOption[]
  session: CurrentAccountSession | null
  uiLocales: string | null
} & (
    | { facade: 'web'; wechatReturnTarget: null }
    | { facade: 'wechat'; wechatReturnTarget: AccountWeChatReturnTarget }
  ) &
  (
    | { status: 'authorized'; authorizedUser: AccountUser }
    | { status: Exclude<AccountAuthorizationStatus['status'], 'authorized'>; authorizedUser?: never }
  )

export type AccountAuthorizationDecision = {
  requestURI: string
  expectedVersion: number
} & ({ decision: 'approve'; expectedUserID: string; expectedSessionID: string } | { decision: 'deny' | 'cancel' })

export type AccountUserCreationProfile = {
  username?: string
  displayName?: string
}

export type CompleteAccountAuthentication = {
  expectedVersion: number
  expectedSessionID: string | null
} & (
  | { action: 'sign_in'; expectedUserID: string }
  | { action: 'create_user'; expectedUserID: null; profile?: AccountUserCreationProfile }
  | { action: 'link_identity'; expectedUserID: string; accountProofRequestID: string }
)

export type AccountAuthenticationAction =
  | { type: 'confirm_account' | 'identity_conflict'; allowedActions: 'sign_in'[]; user: AccountUser }
  | {
      type: 'create_account'
      allowedActions: ('create_user' | 'link_identity')[]
      profile: Pick<AccountUser, 'username' | 'displayName' | 'avatar'>
      accountProofOptions: AccountAuthenticationOption[]
    }
  | { type: 'confirm_link'; allowedActions: 'link_identity'[]; user: AccountUser; accountProofRequestID: string }

export type AccountAuthenticationFailure = {
  reason:
    | 'invalid_credentials'
    | 'provider_error'
    | 'provider_unavailable'
    | 'missing_identity'
    | 'verification_unknown'
    | 'configuration_changed'
  allowedActions: ('retry' | 'choose_method')[]
}

type AuthenticationCorrelation = {
  authenticationRequestID: string
  version: number
  expiresAt: string
  comparisonCode: string
} & AccountAuthenticationOption &
  (
    | { acquisition: 'external_browser'; helperURL: string }
    | { acquisition: Exclude<AccountAuthenticationOption['acquisition'], 'external_browser'> }
  )

export type AccountAuthenticationRequest = AuthenticationCorrelation &
  (
    | ({ purpose: 'sign_in'; accountProofRequestID?: string } & (
        | { status: 'pending' | 'verifying' | 'cancelled' | 'expired' }
        | { status: 'failed'; failure: AccountAuthenticationFailure }
        | { status: 'verified'; accountAction: AccountAuthenticationAction }
        | { status: 'completed'; completionAvailable: false }
        | { status: 'completed'; completionAvailable: true; completion: CompleteAccountAuthentication }
      ))
    | ({ purpose: 'account_proof'; parentAuthenticationRequestID: string } & (
        | { status: 'verified'; user: AccountUser }
        | { status: 'failed'; failure: AccountAuthenticationFailure; user?: AccountUser }
        | { status: 'pending' | 'verifying' | 'completed' | 'cancelled' | 'expired'; user?: AccountUser }
      ))
  )

export type AccountAuthenticationStatus = AccountAuthenticationRequest['status']

export type CreateAccountAuthentication = {
  requestURI: string
  expectedVersion: number
  parentAuthenticationRequestID?: string
} & AccountAuthenticationOption

export type SubmitAccountAuthenticationCredentials = { expectedVersion: number } & (
  | { type: 'password'; username: string; password: string }
  | { type: 'wechat_code'; code: string }
)

export type AccountAuthenticationStart = {
  authenticationRequestID: string
  version: number
  entry: { type: 'provider_redirect' | 'wechat_url_link'; url: string }
  expiresAt: string
}

export type AccountAuthenticationCompletion = {
  authenticationRequestID: string
  version: number
  status: 'completed'
} & (
  | { session: CurrentAccountSession & { facade: 'web' }; sessionToken?: never }
  | { session: CurrentAccountSession & { facade: 'wechat' }; sessionToken?: string }
)

export type AccountAuthenticationHelper = {
  authenticationRequestID: string
  version: number
  status: AccountAuthenticationStatus
  app: AccountRequestingApp
  method: AccountAuthenticationOption['method']
  purpose: 'sign_in' | 'account_proof'
  initiatingFacade: AccountFacade
  executingFacade: AccountFacade
  comparisonCode: string
  expiresAt: string
  uiLocales: string | null
}

/** Account Web owns the flow cookie. Its JavaScript never reads the credential. */
export class AccountWebAPI {
  constructor(private readonly client: Client) {}

  async prepareFlow(signal?: AbortSignal): Promise<void> {
    await this.client.post('/flow-tokens', { facade: 'web' }, { signal })
  }

  openAuthorization(request: { clientID: string; requestURI: string; entryToken: string }, signal?: AbortSignal) {
    return this.client.post(
      '/authorization-requests/open',
      { ...request, facade: 'web' },
      { signal }
    ) as Promise<AccountAuthorizationContext>
  }

  getAuthorizationContext(requestURI: string, signal?: AbortSignal) {
    return this.client.post(
      '/authorization-requests/context',
      { requestURI },
      { signal }
    ) as Promise<AccountAuthorizationContext>
  }

  decideAuthorization(request: AccountAuthorizationDecision, signal?: AbortSignal) {
    return this.client.post('/authorization-requests/decision', request, {
      signal
    }) as Promise<AccountAuthorizationResult>
  }

  recoverAuthorizationReturn(requestURI: string, signal?: AbortSignal) {
    return this.client.post(
      '/authorization-requests/return',
      { requestURI },
      { signal }
    ) as Promise<AccountAuthorizationResult>
  }

  createAuthentication(request: CreateAccountAuthentication, signal?: AbortSignal) {
    return this.client.post('/authentication-requests', request, { signal }) as Promise<AccountAuthenticationRequest>
  }

  getAuthentication(requestID: string, signal?: AbortSignal) {
    return this.client.get(`/authentication-requests/${encodeURIComponent(requestID)}`, undefined, {
      signal
    }) as Promise<AccountAuthenticationRequest>
  }

  submitCredentials(requestID: string, request: SubmitAccountAuthenticationCredentials, signal?: AbortSignal) {
    return this.client.post(`/authentication-requests/${encodeURIComponent(requestID)}/credentials`, request, {
      signal
    }) as Promise<AccountAuthenticationRequest>
  }

  startAuthentication(requestID: string, expectedVersion: number, signal?: AbortSignal) {
    return this.client.post(
      `/authentication-requests/${encodeURIComponent(requestID)}/start`,
      { expectedVersion },
      { signal }
    ) as Promise<AccountAuthenticationStart>
  }

  completeAuthentication(requestID: string, request: CompleteAccountAuthentication, signal?: AbortSignal) {
    return this.client.post(`/authentication-requests/${encodeURIComponent(requestID)}/complete`, request, {
      signal
    }) as Promise<AccountAuthenticationCompletion>
  }

  cancelAuthentication(requestID: string, expectedVersion: number, signal?: AbortSignal) {
    return this.client.post(
      `/authentication-requests/${encodeURIComponent(requestID)}/cancel`,
      { expectedVersion },
      { signal }
    ) as Promise<AccountAuthenticationRequest>
  }

  getAuthenticationHelper(requestID: string, signal?: AbortSignal) {
    return this.client.get(`/authentication-requests/${encodeURIComponent(requestID)}/helper`, undefined, {
      signal
    }) as Promise<AccountAuthenticationHelper>
  }

  startAuthenticationHelper(requestID: string, expectedVersion: number, signal?: AbortSignal) {
    return this.client.post(
      `/authentication-requests/${encodeURIComponent(requestID)}/helper/start`,
      { expectedVersion },
      { signal }
    ) as Promise<AccountAuthenticationStart>
  }

  cancelAuthenticationHelper(requestID: string, expectedVersion: number, signal?: AbortSignal) {
    return this.client.post(
      `/authentication-requests/${encodeURIComponent(requestID)}/helper/cancel`,
      { expectedVersion },
      { signal }
    ) as Promise<AccountAuthenticationHelper>
  }
}
