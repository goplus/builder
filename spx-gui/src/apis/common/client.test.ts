import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiException, ApiExceptionCode, isQuotaExceededMeta } from './exception'
import { Client } from './client'

function makeMovedResponse(canonicalPath: string) {
  return new Response(
    JSON.stringify({
      code: ApiExceptionCode.errorResourceMoved,
      msg: 'Resource moved',
      canonical: {
        path: canonicalPath
      }
    }),
    {
      status: 409,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

function makeQuotaExceededResponse(retryAfter: string) {
  return new Response(
    JSON.stringify({
      code: ApiExceptionCode.errorQuotaExceeded,
      msg: 'Quota exceeded'
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter
      }
    }
  )
}

describe('Client', () => {
  let client: Client
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    client = new Client({
      baseUrl: 'https://api.example.com',
      fetchFn: fetchMock
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('path-based moved conflicts', () => {
    it('should surface the moved conflict without retrying', async () => {
      fetchMock.mockResolvedValueOnce(makeMovedResponse('/projects/john/demo/views'))

      try {
        await client.post('/projects/John/demo/views')
        throw new Error('expected moved conflict')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiException)
        expect(e).toMatchObject({
          code: ApiExceptionCode.errorResourceMoved,
          meta: {
            path: '/projects/john/demo/views'
          }
        })
      }

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(new URL((fetchMock.mock.calls[0]![0] as Request).url).pathname).toBe('/projects/John/demo/views')
    })
  })

  describe('quota exceeded metadata', () => {
    it('should parse retry-after metadata from headers', async () => {
      const retryAfter = 'Wed, 09 Apr 2026 08:00:00 GMT'
      fetchMock.mockResolvedValueOnce(makeQuotaExceededResponse(retryAfter))

      try {
        await client.get('/quota')
        throw new Error('expected quota exceeded error')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiException)
        expect(e).toMatchObject({
          code: ApiExceptionCode.errorQuotaExceeded
        })
        expect(isQuotaExceededMeta((e as ApiException).code, (e as ApiException).meta)).toBe(true)
        expect((e as ApiException).meta).toMatchObject({
          retryAfter: new Date(retryAfter).valueOf()
        })
      }
    })
  })

  describe('form requests', () => {
    it('should submit application/x-www-form-urlencoded payloads', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))

      await client.postForm('/account/oauth/token', {
        grant_type: 'refresh_token',
        client_id: 'client-1',
        refresh_token: 'refresh-1'
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const request = fetchMock.mock.calls[0]![0] as Request
      expect(request.headers.get('Content-Type')).toBe('application/x-www-form-urlencoded')
      expect(await request.text()).toBe('grant_type=refresh_token&client_id=client-1&refresh_token=refresh-1')
    })
  })

  describe('default fetch binding', () => {
    it('should call the global fetch with the global receiver when fetchFn is not injected', async () => {
      const globalFetchMock = vi.fn(function (this: typeof globalThis, _req: RequestInfo | URL, _init?: RequestInit) {
        expect(this).toBe(globalThis)
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      })
      vi.stubGlobal('fetch', globalFetchMock)

      const defaultClient = new Client({
        baseUrl: 'https://api.example.com'
      })

      await defaultClient.get('/health')

      expect(globalFetchMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('explicit authorization headers', () => {
    it('should preserve an explicit Authorization header instead of overwriting it with the token provider', async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ username: 'alice' }), { status: 200 }))
      const tokenProvider = vi.fn(async () => 'shared-token')
      client.setTokenProvider(tokenProvider)

      await client.get('/user', undefined, {
        headers: new Headers({ Authorization: 'Bearer direct-token' })
      })

      const req = fetchMock.mock.calls[0]?.[0] as Request
      expect(req.headers.get('Authorization')).toBe('Bearer direct-token')
      expect(tokenProvider).toHaveBeenCalledTimes(0)
    })
  })
})
