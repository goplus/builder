import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiException, ApiExceptionCode } from '@/apis/common/exception'

import { getPasswordSignInRetryAfter } from '.'

function makeApiException(code: ApiExceptionCode, meta: unknown) {
  return new ApiException(code, 'request failed', {
    req: new Request('https://account.example.com/session', { method: 'POST' }),
    meta
  })
}

describe('getPasswordSignInRetryAfter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns a future retry time for generic request throttling', () => {
    const retryAfter = Date.now() + 30_000

    expect(getPasswordSignInRetryAfter(makeApiException(ApiExceptionCode.errorTooManyRequests, { retryAfter }))).toBe(
      retryAfter
    )
  })

  it('rejects unrelated and invalid retry metadata', () => {
    expect(
      getPasswordSignInRetryAfter(
        makeApiException(ApiExceptionCode.errorRateLimitExceeded, { retryAfter: Date.now() + 30_000 })
      )
    ).toBeNull()
    expect(
      getPasswordSignInRetryAfter(makeApiException(ApiExceptionCode.errorTooManyRequests, { retryAfter: null }))
    ).toBeNull()
    expect(
      getPasswordSignInRetryAfter(makeApiException(ApiExceptionCode.errorTooManyRequests, { retryAfter: Date.now() }))
    ).toBeNull()
  })
})
