import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiException, ApiExceptionCode, OAuthException, isQuotaExceededMeta, isRetryAfterMeta } from './exception'
import { Client } from './client'

function makeJsonResponse(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  })
}

function makeMovedResponse(canonicalPath: string) {
  return makeJsonResponse(
    {
      code: ApiExceptionCode.errorResourceMoved,
      msg: 'Resource moved',
      canonical: {
        path: canonicalPath
      }
    },
    409
  )
}

function makeQuotaExceededResponse(retryAfter: string) {
  return makeJsonResponse(
    {
      code: ApiExceptionCode.errorQuotaExceeded,
      msg: 'Quota exceeded'
    },
    403,
    {
      'Retry-After': retryAfter
    }
  )
}

function makeRateLimitExceededResponse(retryAfter: string) {
  return makeJsonResponse(
    {
      code: ApiExceptionCode.errorRateLimitExceeded,
      msg: 'Rate limit exceeded'
    },
    429,
    {
      'Retry-After': retryAfter
    }
  )
}

function makeOAuthErrorResponse() {
  return makeJsonResponse(
    {
      error: 'invalid_request',
      error_description: 'invalid form body'
    },
    400
  )
}

async function expectApiException(promise: Promise<unknown>, code: ApiExceptionCode) {
  try {
    await promise
  } catch (e) {
    expect(e).toBeInstanceOf(ApiException)
    const exception = e as ApiException
    expect(exception).toMatchObject({ code })
    return exception
  }
  throw new Error(`expected API error ${code}`)
}

async function expectOAuthException(promise: Promise<unknown>, error: string) {
  try {
    await promise
  } catch (e) {
    expect(e).toBeInstanceOf(OAuthException)
    const exception = e as OAuthException
    expect(exception).toMatchObject({ error })
    return exception
  }
  throw new Error(`expected OAuth error ${error}`)
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

      const e = await expectApiException(client.post('/projects/John/demo/views'), ApiExceptionCode.errorResourceMoved)
      expect(e.meta).toMatchObject({
        path: '/projects/john/demo/views'
      })

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(new URL((fetchMock.mock.calls[0]![0] as Request).url).pathname).toBe('/projects/John/demo/views')
    })
  })

  describe('quota exceeded metadata', () => {
    it('should parse retry-after metadata from headers', async () => {
      const retryAfter = 'Wed, 09 Apr 2026 08:00:00 GMT'
      fetchMock.mockResolvedValueOnce(makeQuotaExceededResponse(retryAfter))

      const e = await expectApiException(client.get('/quota'), ApiExceptionCode.errorQuotaExceeded)
      expect(isQuotaExceededMeta(e.code, e.meta)).toBe(true)
      expect(e.meta).toMatchObject({
        retryAfter: new Date(retryAfter).valueOf()
      })
    })
  })

  describe('retry-after metadata', () => {
    it('should parse retry-after metadata for rate limits', async () => {
      fetchMock.mockResolvedValueOnce(makeRateLimitExceededResponse('2'))

      const e = await expectApiException(client.get('/rate-limited'), ApiExceptionCode.errorRateLimitExceeded)
      expect(isRetryAfterMeta(e.code, e.meta)).toBe(true)
      expect(e.meta).toMatchObject({
        retryAfter: expect.any(Number)
      })
    })

    it('should treat empty retry-after headers as no retry time', async () => {
      fetchMock.mockResolvedValueOnce(makeRateLimitExceededResponse('   '))

      const e = await expectApiException(client.get('/rate-limited'), ApiExceptionCode.errorRateLimitExceeded)
      expect(isRetryAfterMeta(e.code, e.meta)).toBe(true)
      expect(e.meta).toMatchObject({
        retryAfter: null
      })
    })

    it('should reject retry-after metadata without a retryAfter field', () => {
      expect(isRetryAfterMeta(ApiExceptionCode.errorRateLimitExceeded, {})).toBe(false)
    })
  })

  describe('OAuth errors', () => {
    it('should parse OAuth error payloads', async () => {
      fetchMock.mockResolvedValueOnce(makeOAuthErrorResponse())

      const e = await expectOAuthException(client.postForm('/account/oauth/token', {}), 'invalid_request')
      expect(e.errorDescription).toBe('invalid form body')
      expect(e.errorUri).toBeNull()
      expect(e.message).toContain('[invalid_request] invalid form body')
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
