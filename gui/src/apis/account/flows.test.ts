import { describe, expect, it, vi } from 'vitest'

import { Client } from '@/apis/common/client'
import { AccountWebAPI, type AccountAuthorizationContext, type AccountAuthenticationRequest } from './flows'

function createAPI(response: Response) {
  const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(response)
  const client = new Client({ baseUrl: 'https://account.example.com/api', fetchFn })
  return { api: new AccountWebAPI(client), fetchFn }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('AccountWebAPI', () => {
  it('prepares the flow cookie without exposing a credential to JavaScript', async () => {
    const { api, fetchFn } = createAPI(new Response(null, { status: 204 }))

    expect(await api.prepareFlow()).toBeUndefined()

    const request = fetchFn.mock.calls[0][0] as Request
    expect(request.url).toBe('https://account.example.com/api/flow-tokens')
    expect(await request.json()).toEqual({ facade: 'web' })
    expect(request.headers.has('Authorization')).toBe(false)
    expect(request.headers.has('Account-Flow-Token')).toBe(false)
  })

  it('binds entry data in the request body and uses the backend context', async () => {
    const context: AccountAuthorizationContext = {
      requestURI: 'urn:ietf:params:oauth:request_uri:reference',
      version: 3,
      status: 'pending',
      state: 'original-state',
      expiresAt: '2026-11-08T12:10:00Z',
      app: { id: '2', displayName: 'XAtom', avatar: null },
      scope: 'account:user:read',
      facade: 'web',
      wechatReturnTarget: null,
      authenticationRequestID: null,
      authenticationOptions: [{ method: 'password', acquisition: 'password' }],
      session: null,
      uiLocales: null
    }
    const { api, fetchFn } = createAPI(jsonResponse(context))
    const entry = { clientID: 'client', requestURI: context.requestURI, entryToken: 'private-entry-token' }

    expect(await api.openAuthorization(entry)).toEqual(context)

    const request = fetchFn.mock.calls[0][0] as Request
    expect(await request.json()).toEqual({ ...entry, facade: 'web' })
    expect(request.url).not.toContain(entry.entryToken)
  })

  it('cancels only the selected authentication and preserves its expected version', async () => {
    const response: AccountAuthenticationRequest = {
      authenticationRequestID: 'attempt/with?query',
      status: 'cancelled',
      version: 6,
      method: 'password',
      acquisition: 'password',
      purpose: 'sign_in',
      comparisonCode: '123456',
      expiresAt: '2026-11-08T12:05:00Z'
    }
    const { api, fetchFn } = createAPI(jsonResponse(response))

    expect(await api.cancelAuthentication('attempt/with?query', 5)).toEqual(response)

    expect(fetchFn).toHaveBeenCalledOnce()
    const request = fetchFn.mock.calls[0][0] as Request
    expect(request.url).toBe('https://account.example.com/api/authentication-requests/attempt%2Fwith%3Fquery/cancel')
    expect(await request.json()).toEqual({ expectedVersion: 5 })
  })

  it('propagates cancellation before sending authentication credentials', async () => {
    const { api, fetchFn } = createAPI(jsonResponse({}))
    const abort = new AbortController()
    abort.abort()

    await expect(
      api.submitCredentials(
        'request',
        { expectedVersion: 1, type: 'password', username: 'alice', password: 'password' },
        abort.signal
      )
    ).rejects.toThrow()
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
