import { beforeEach, describe, expect, it, vi } from 'vitest'

const postForm = vi.fn()
const Client = vi.fn(function MockClient(this: { postForm: typeof postForm }) {
  this.postForm = postForm
})

vi.mock('@/apis/common/client', () => ({
  Client
}))

vi.mock('@/utils/env', () => ({
  accountOAuthClientId: 'client-123',
  apiBaseUrl: '/api'
}))

describe('account oauth apis', () => {
  beforeEach(() => {
    vi.resetModules()
    Client.mockClear()
    postForm.mockReset()
    window.history.replaceState({}, '', '/')
  })

  it('should create pushed authorization requests with form-encoded oauth params', async () => {
    postForm.mockResolvedValueOnce({ request_uri: 'urn:request:1' })
    const { createPushedAuthorizationRequest } = await import('./account-oauth')

    await expect(createPushedAuthorizationRequest({ state: 'state-1', codeChallenge: 'challenge-1' })).resolves.toEqual(
      {
        request_uri: 'urn:request:1'
      }
    )
    expect(postForm).toHaveBeenCalledWith('/account/oauth/par', {
      client_id: 'client-123',
      response_type: 'code',
      redirect_uri: 'http://localhost:3000/sign-in/callback',
      state: 'state-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256',
      scope: 'account:user:read'
    })
  })

  it('should exchange authorization codes with form-encoded oauth params', async () => {
    postForm.mockResolvedValueOnce({ access_token: 'token-1', expires_in: 3600 })
    const { exchangeAuthorizationCode } = await import('./account-oauth')

    await exchangeAuthorizationCode('code-1', 'verifier-1')

    expect(postForm).toHaveBeenCalledWith('/account/oauth/token', {
      grant_type: 'authorization_code',
      client_id: 'client-123',
      code: 'code-1',
      redirect_uri: 'http://localhost:3000/sign-in/callback',
      code_verifier: 'verifier-1'
    })
  })

  it('should exchange refresh tokens with form-encoded oauth params', async () => {
    postForm.mockResolvedValueOnce({ access_token: 'token-1', expires_in: 3600 })
    const { exchangeRefreshToken } = await import('./account-oauth')

    await exchangeRefreshToken('refresh-1')

    expect(postForm).toHaveBeenCalledWith('/account/oauth/token', {
      grant_type: 'refresh_token',
      client_id: 'client-123',
      refresh_token: 'refresh-1'
    })
  })

  it('should revoke oauth tokens with form-encoded oauth params', async () => {
    postForm.mockResolvedValueOnce(null)
    const { revokeOAuthToken } = await import('./account-oauth')

    await revokeOAuthToken('token-1')

    expect(postForm).toHaveBeenCalledWith('/account/oauth/revoke', {
      client_id: 'client-123',
      token: 'token-1'
    })
  })

  it('should skip revoke when token is null', async () => {
    const { revokeOAuthToken } = await import('./account-oauth')

    await expect(revokeOAuthToken(null)).resolves.toBeUndefined()
    expect(postForm).not.toHaveBeenCalled()
  })

  it('should use a dedicated client instance for oauth endpoints', async () => {
    await import('./account-oauth')
    expect(Client).toHaveBeenCalledTimes(1)
    expect(Client).toHaveBeenCalledWith()
  })

  it('should build the authorize URL against the main-site api origin', async () => {
    const { getAccountOAuthAuthorizeUrl } = await import('./account-oauth')

    expect(getAccountOAuthAuthorizeUrl('urn:request:1')).toBe(
      'http://localhost:3000/account/oauth/authorize?client_id=client-123&request_uri=urn%3Arequest%3A1'
    )
  })
})
