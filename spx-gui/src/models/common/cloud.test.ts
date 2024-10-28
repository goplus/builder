import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { universalUrlToWebUrl } from './cloud'
import { makeObjectUrls } from '@/apis/util'

vi.mock('@/apis/util', () => ({
  makeObjectUrls: vi.fn()
}))

describe('universalUrlToWebUrl', () => {
  const batchDelay = 15 + 1 // 15ms + 1ms
  const cacheTtl = 60 * 60 * 1000 + 1 // 1 hour in milliseconds + 1ms

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    universalUrlToWebUrl.clearCache()
  })

  it('should return original URL for non-kodo protocol', async () => {
    const httpUrl = 'https://example.com/image.jpg'
    const result = await universalUrlToWebUrl(httpUrl)
    expect(result).toBe(httpUrl)
    expect(makeObjectUrls).not.toHaveBeenCalled()
  })

  it('should transform kodo URL correctly', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1'
    }
    vi.mocked(makeObjectUrls).mockResolvedValue(mockObjectUrls)

    const universalUrl = 'kodo://bucket/key1'
    const promise = universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    const webUrl = await promise

    expect(makeObjectUrls).toHaveBeenCalledWith([universalUrl])
    expect(webUrl).toBe(mockObjectUrls[universalUrl])
  })

  it('should use cache for repeated calls', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1'
    }
    vi.mocked(makeObjectUrls).mockResolvedValue(mockObjectUrls)

    const universalUrl = 'kodo://bucket/key1'

    const promise1 = universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    const webUrl1 = await promise1

    const promise2 = universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    const webUrl2 = await promise2

    expect(makeObjectUrls).toHaveBeenCalledTimes(1)
    expect(webUrl1).toBe(webUrl2)
  })

  it('should invalidate cache after TTL', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1'
    }
    vi.mocked(makeObjectUrls).mockResolvedValue(mockObjectUrls)

    const universalUrl = 'kodo://bucket/key1'

    const promise1 = universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    await promise1

    vi.advanceTimersByTime(cacheTtl)

    const promise2 = universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    await promise2

    expect(makeObjectUrls).toHaveBeenCalledTimes(2)
  })

  it('should batch multiple calls', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1',
      'kodo://bucket/key2': 'https://bucket.example.com/key2'
    }
    vi.mocked(makeObjectUrls).mockResolvedValue(mockObjectUrls)

    const universalUrl1 = 'kodo://bucket/key1'
    const universalUrl2 = 'kodo://bucket/key2'
    const promise1 = universalUrlToWebUrl(universalUrl1)
    const promise2 = universalUrlToWebUrl(universalUrl2)
    vi.advanceTimersByTime(batchDelay)
    const webUrl1 = await promise1
    const webUrl2 = await promise2

    expect(makeObjectUrls).toHaveBeenCalledTimes(1)
    expect(makeObjectUrls).toHaveBeenCalledWith([universalUrl1, universalUrl2])
    expect(webUrl1).toBe(mockObjectUrls[universalUrl1])
    expect(webUrl2).toBe(mockObjectUrls[universalUrl2])
  })

  it('should handle errors correctly', async () => {
    const error = new Error('network error')
    vi.mocked(makeObjectUrls).mockRejectedValue(error)

    const universalUrl = 'kodo://bucket/key1'
    const promise = universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)

    await expect(promise).rejects.toThrow(error)
  })
})
