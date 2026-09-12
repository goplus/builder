import { createDirectUploadTask } from 'qiniu-js'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { createFileURLSignatures, createUploadSession } from '@/apis/file'
import { fromBlob } from './file'
import { cloudHelpers, saveFile } from './cloud'

vi.mock('qiniu-js', () => ({
  createDirectUploadTask: vi.fn()
}))

vi.mock('@/apis/file', () => ({
  createFileURLSignatures: vi.fn(),
  createUploadSession: vi.fn()
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

describe('saveFile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cloudHelpers.setConfig({
      baseUrl: 'https://bucket.example.com',
      bucket: 'bucket'
    })
    vi.mocked(createFileURLSignatures).mockImplementation(async (objects) =>
      Object.fromEntries(
        objects.map((object) => [object, object.replace('kodo://bucket/', 'https://bucket.example.com/')])
      )
    )
    vi.mocked(createUploadSession).mockResolvedValue({
      token: 'token',
      expiresAt: '2099-01-01T00:00:00Z',
      maxSize: 20 * 1024 * 1024,
      bucket: 'bucket',
      region: 'z0'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cloudHelpers.clearUniversalUrlCache()
  })

  it('reuses an existing content-addressed Kodo object', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    const file = fromBlob('font.ttf', new Blob([new Uint8Array(4 * 1024 * 1024 + 1).fill(1)], { type: 'font/ttf' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/lm4W-B9xRnQqLLX9MP8Yafji4gmr-4194305.ttf')
    expect(fetch).toHaveBeenCalledWith(
      'https://bucket.example.com/files/lm4W-B9xRnQqLLX9MP8Yafji4gmr-4194305.ttf',
      expect.objectContaining({ method: 'HEAD' })
    )
    expect(createDirectUploadTask).not.toHaveBeenCalled()
  })

  it('uploads the file when the content-addressed object does not exist', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))
    vi.mocked(createDirectUploadTask).mockReturnValue({
      start: vi.fn(),
      cancel: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn((callback) => callback('{"key":"files/uploaded.png","hash":"hash"}'))
    } as unknown as ReturnType<typeof createDirectUploadTask>)
    const file = fromBlob('asset.png', new Blob([new Uint8Array(1024 * 1024).fill(1)], { type: 'image/png' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/uploaded.png')
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: 'HEAD' }))
    expect(createDirectUploadTask).toHaveBeenCalledOnce()
  })

  it('uploads the file when checking the content-addressed object fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network error'))
    vi.mocked(createDirectUploadTask).mockReturnValue({
      start: vi.fn(),
      cancel: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn((callback) => callback('{"key":"files/uploaded.bin","hash":"hash"}'))
    } as unknown as ReturnType<typeof createDirectUploadTask>)
    const file = fromBlob('asset.bin', new Blob([new Uint8Array(1024 * 1024)], { type: 'application/octet-stream' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/uploaded.bin')
    expect(createDirectUploadTask).toHaveBeenCalledOnce()
  })

  it('uploads a small file without checking for reuse', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('unexpected fetch'))
    vi.mocked(createDirectUploadTask).mockReturnValue({
      start: vi.fn(),
      cancel: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn((callback) => callback('{"key":"files/uploaded.png","hash":"hash"}'))
    } as unknown as ReturnType<typeof createDirectUploadTask>)
    const file = fromBlob('asset.png', new Blob([new Uint8Array(1024 * 1024 - 1)], { type: 'image/png' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/uploaded.png')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(createDirectUploadTask).toHaveBeenCalledOnce()
  })
})
