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
      fetchMock.mockResolvedValueOnce(makeMovedResponse('/project/john/demo/view'))

      try {
        await client.post('/project/John/demo/view')
        throw new Error('expected moved conflict')
      } catch (e) {
        expect(e).toBeInstanceOf(ApiException)
        expect(e).toMatchObject({
          code: ApiExceptionCode.errorResourceMoved,
          meta: {
            path: '/project/john/demo/view'
          }
        })
      }

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(new URL((fetchMock.mock.calls[0]![0] as Request).url).pathname).toBe('/project/John/demo/view')
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
})
