import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createPendingOAuthAuthorizationStorage,
  createPKCEAuthorizationRequest,
  OAuthFlow,
  parseOAuthCallbackParams,
  type OAuthAPIs,
  type PendingOAuthAuthorization
} from './index'

type PendingSignInData = {
  returnTo: string
}

const storageKey = 'test-pending-oauth-authorization'
const pendingAuthorizationStorage = createPendingOAuthAuthorizationStorage<PendingSignInData>(storageKey)

function createOAuthAPIs(): OAuthAPIs {
  return {
    createPAR: vi.fn(async () => ({ request_uri: 'urn:test:request-uri' })),
    buildAuthorizeUrl: vi.fn(() => 'https://account.example.com/oauth/authorize?request_uri=urn:test:request-uri'),
    exchangeToken: vi.fn(async () => ({ access_token: 'access-token', expires_in: 3600 })),
    refreshToken: vi.fn(async () => ({ access_token: 'refreshed-access-token', expires_in: 3600 })),
    revokeToken: vi.fn(async () => {})
  }
}

function createOAuthFlow(apis: OAuthAPIs) {
  return new OAuthFlow<PendingSignInData>(apis, {
    clientId: 'client-1',
    redirectUri: 'https://app.example.com/sign-in/callback',
    pendingAuthorizationStorageKey: storageKey
  })
}

describe('oauth utils', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('creates PKCE authorization request values', async () => {
    const request = await createPKCEAuthorizationRequest()

    expect(request.state).toMatch(/^[\w-]+$/)
    expect(request.codeVerifier).toMatch(/^[\w-]+$/)
    expect(request.codeChallenge).toMatch(/^[\w-]+$/)
    expect(request.state).not.toBe(request.codeVerifier)
    expect(request.codeVerifier).not.toBe(request.codeChallenge)
  })

  it('parses oauth callback params', () => {
    expect(parseOAuthCallbackParams('?code=abc&state=xyz')).toEqual({ code: 'abc', state: 'xyz' })
  })

  it('rejects oauth callback params without code or state', () => {
    expect(() => parseOAuthCallbackParams('?code=abc')).toThrow('Missing OAuth callback parameters')
    expect(() => parseOAuthCallbackParams('?state=xyz')).toThrow('Missing OAuth callback parameters')
  })

  it('stores pending oauth authorization state in session storage', () => {
    const pending: PendingOAuthAuthorization<PendingSignInData> = {
      state: 'state-1',
      codeVerifier: 'verifier-1',
      data: { returnTo: '/projects' }
    }

    pendingAuthorizationStorage.write(pending)
    expect(pendingAuthorizationStorage.read()).toEqual(pending)

    pendingAuthorizationStorage.clear()
    expect(pendingAuthorizationStorage.read()).toBe(null)
  })

  it('clears invalid pending oauth authorization state', () => {
    sessionStorage.setItem(storageKey, '{')

    expect(pendingAuthorizationStorage.read()).toBe(null)
    expect(sessionStorage.getItem(storageKey)).toBe(null)
  })

  it('creates oauth authorization through PAR and stores pending authorization state', async () => {
    const apis = createOAuthAPIs()
    const flow = createOAuthFlow(apis)

    const result = await flow.createAuthorization({ returnTo: '/projects' })
    const pending = pendingAuthorizationStorage.read()
    if (pending == null) throw new Error('missing test pending authorization')

    expect(result).toEqual({
      authorizeUrl: 'https://account.example.com/oauth/authorize?request_uri=urn:test:request-uri'
    })
    expect(apis.createPAR).toHaveBeenCalledWith({
      client_id: 'client-1',
      redirect_uri: 'https://app.example.com/sign-in/callback',
      state: pending.state,
      code_challenge: expect.any(String)
    })
    expect(apis.buildAuthorizeUrl).toHaveBeenCalledWith({
      client_id: 'client-1',
      request_uri: 'urn:test:request-uri'
    })
    expect(pending.data).toEqual({ returnTo: '/projects' })
  })

  it('completes oauth authorization by exchanging callback code for token', async () => {
    const apis = createOAuthAPIs()
    const flow = createOAuthFlow(apis)
    await flow.createAuthorization({ returnTo: '/projects' })
    const pending = pendingAuthorizationStorage.read()
    if (pending == null) throw new Error('missing test pending authorization')

    const result = await flow.completeAuthorization(`?code=code-1&state=${pending.state}`)

    expect(apis.exchangeToken).toHaveBeenCalledWith({
      client_id: 'client-1',
      redirect_uri: 'https://app.example.com/sign-in/callback',
      code: 'code-1',
      code_verifier: pending.codeVerifier
    })
    expect(result).toEqual({
      token: { access_token: 'access-token', expires_in: 3600 },
      extraData: { returnTo: '/projects' }
    })
    expect(pendingAuthorizationStorage.read()).toBe(null)
  })

  it('rejects oauth callback when state does not match pending authorization', async () => {
    const flow = createOAuthFlow(createOAuthAPIs())
    await flow.createAuthorization({ returnTo: '/projects' })

    await expect(flow.completeAuthorization('?code=code-1&state=other-state')).rejects.toThrow('OAuth state mismatch')
  })
})
