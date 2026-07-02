import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cloudHelpers } from './cloud'
import { createFileURLSignatures } from '@/apis/file'

vi.mock('@/apis/file', () => ({
  createFileURLSignatures: vi.fn()
}))

describe('universalUrlToWebUrl', () => {
  const batchDelay = 15 + 1 // 15ms + 1ms
  const cacheTtl = 60 * 60 * 1000 + 1 // 1 hour in milliseconds + 1ms

  beforeEach(() => {
    vi.useFakeTimers()
    cloudHelpers.setConfig({
      baseUrl: 'https://bucket.example.com',
      bucket: 'bucket'
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    cloudHelpers.clearUniversalUrlCache()
  })

  it('should return original URL for non-kodo protocol', async () => {
    const httpUrl = 'https://example.com/image.jpg'
    const result = await cloudHelpers.universalUrlToWebUrl(httpUrl)
    expect(result).toBe(httpUrl)
    expect(createFileURLSignatures).not.toHaveBeenCalled()
  })

  it('should transform kodo URL correctly', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1'
    }
    vi.mocked(createFileURLSignatures).mockResolvedValue(mockObjectUrls)

    const universalUrl = 'kodo://bucket/key1'
    const promise = cloudHelpers.universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    const webUrl = await promise

    expect(createFileURLSignatures).toHaveBeenCalledWith([universalUrl], {
      baseUrl: 'https://bucket.example.com',
      bucket: 'bucket'
    })
    expect(webUrl).toBe(mockObjectUrls[universalUrl])
  })

  it('should use cache for repeated calls', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1'
    }
    vi.mocked(createFileURLSignatures).mockResolvedValue(mockObjectUrls)

    const universalUrl = 'kodo://bucket/key1'

    const promise1 = cloudHelpers.universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    const webUrl1 = await promise1

    const promise2 = cloudHelpers.universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    const webUrl2 = await promise2

    expect(createFileURLSignatures).toHaveBeenCalledTimes(1)
    expect(webUrl1).toBe(webUrl2)
  })

  it('should invalidate cache after TTL', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1'
    }
    vi.mocked(createFileURLSignatures).mockResolvedValue(mockObjectUrls)

    const universalUrl = 'kodo://bucket/key1'

    const promise1 = cloudHelpers.universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    await promise1

    vi.advanceTimersByTime(cacheTtl)

    const promise2 = cloudHelpers.universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)
    await promise2

    expect(createFileURLSignatures).toHaveBeenCalledTimes(2)
  })

  it('should batch multiple calls', async () => {
    const mockObjectUrls = {
      'kodo://bucket/key1': 'https://bucket.example.com/key1',
      'kodo://bucket/key2': 'https://bucket.example.com/key2'
    }
    vi.mocked(createFileURLSignatures).mockResolvedValue(mockObjectUrls)

    const universalUrl1 = 'kodo://bucket/key1'
    const universalUrl2 = 'kodo://bucket/key2'
    const promise1 = cloudHelpers.universalUrlToWebUrl(universalUrl1)
    const promise2 = cloudHelpers.universalUrlToWebUrl(universalUrl2)
    vi.advanceTimersByTime(batchDelay)
    const webUrl1 = await promise1
    const webUrl2 = await promise2

    expect(createFileURLSignatures).toHaveBeenCalledTimes(1)
    expect(createFileURLSignatures).toHaveBeenCalledWith([universalUrl1, universalUrl2], {
      baseUrl: 'https://bucket.example.com',
      bucket: 'bucket'
    })
    expect(webUrl1).toBe(mockObjectUrls[universalUrl1])
    expect(webUrl2).toBe(mockObjectUrls[universalUrl2])
  })

  it('should handle errors correctly', async () => {
    const error = new Error('network error')
    vi.mocked(createFileURLSignatures).mockRejectedValue(error)

    const universalUrl = 'kodo://bucket/key1'
    const promise = cloudHelpers.universalUrlToWebUrl(universalUrl)
    vi.advanceTimersByTime(batchDelay)

    await expect(promise).rejects.toThrow(error)
  })
})
