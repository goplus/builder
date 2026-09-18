import { createDirectUploadTask } from 'qiniu-js'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { ApiException, ApiExceptionCode } from '@/apis/common/exception'
import { createFileURLSignatures, createUploadSession, getFileObject } from '@/apis/file'
import { capture } from '@/utils/exception'
import { cloudHelpers, saveFile } from './cloud'
import { fromBlob } from './file'

vi.mock('qiniu-js', () => ({
  createDirectUploadTask: vi.fn()
}))

vi.mock('@/apis/file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/apis/file')>()),
  createFileURLSignatures: vi.fn(),
  createUploadSession: vi.fn(),
  getFileObject: vi.fn()
}))

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  capture: vi.fn()
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
  })

  it('reuses an existing content-addressed Kodo object', async () => {
    vi.mocked(getFileObject).mockResolvedValue({
      url: 'kodo://bucket/files/lm4W-B9xRnQqLLX9MP8Yafji4gmr-4194305.ttf'
    })
    const file = fromBlob('font.ttf', new Blob([new Uint8Array(4 * 1024 * 1024 + 1).fill(1)], { type: 'font/ttf' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/lm4W-B9xRnQqLLX9MP8Yafji4gmr-4194305.ttf')
    expect(getFileObject).toHaveBeenCalledWith(
      'lm4W-B9xRnQqLLX9MP8Yafji4gmr',
      4 * 1024 * 1024 + 1,
      'font.ttf',
      undefined
    )
    expect(createUploadSession).not.toHaveBeenCalled()
    expect(createDirectUploadTask).not.toHaveBeenCalled()
  })

  it('uploads the file when the content-addressed object is unavailable', async () => {
    const error = new Error('not found')
    vi.mocked(getFileObject).mockRejectedValue(error)
    vi.mocked(createDirectUploadTask).mockReturnValue({
      start: vi.fn(),
      cancel: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn((callback) => callback('{"key":"files/uploaded.png","hash":"hash"}'))
    } as unknown as ReturnType<typeof createDirectUploadTask>)
    const file = fromBlob('asset.png', new Blob([new Uint8Array(1024 * 1024).fill(1)], { type: 'image/png' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/uploaded.png')
    expect(getFileObject).toHaveBeenCalledWith('FlndqgEuxWByGI9JFdTZ9rM1JLMX', 1024 * 1024, 'asset.png', undefined)
    expect(capture).toHaveBeenCalledWith(error, 'Failed to get existing Kodo file object')
    expect(createDirectUploadTask).toHaveBeenCalledOnce()
  })

  it('uploads the file without reporting an expected lookup miss', async () => {
    vi.mocked(getFileObject).mockRejectedValue(
      new ApiException(ApiExceptionCode.errorNotFound, 'not found', {
        req: new Request('https://example.com/file-objects/hash')
      })
    )
    vi.mocked(createDirectUploadTask).mockReturnValue({
      start: vi.fn(),
      cancel: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn((callback) => callback('{"key":"files/uploaded.png","hash":"hash"}'))
    } as unknown as ReturnType<typeof createDirectUploadTask>)
    const file = fromBlob('asset.png', new Blob([new Uint8Array(1024 * 1024).fill(1)], { type: 'image/png' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/uploaded.png')
    expect(capture).not.toHaveBeenCalled()
  })

  it('uploads a small file without checking for reuse', async () => {
    vi.mocked(createDirectUploadTask).mockReturnValue({
      start: vi.fn(),
      cancel: vi.fn(),
      onError: vi.fn(),
      onComplete: vi.fn((callback) => callback('{"key":"files/uploaded.png","hash":"hash"}'))
    } as unknown as ReturnType<typeof createDirectUploadTask>)
    const file = fromBlob('asset.png', new Blob([new Uint8Array(1024 * 1024 - 1)], { type: 'image/png' }))

    await expect(saveFile(file)).resolves.toBe('kodo://bucket/files/uploaded.png')
    expect(getFileObject).not.toHaveBeenCalled()
    expect(createDirectUploadTask).toHaveBeenCalledOnce()
  })
})
