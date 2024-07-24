import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeObjectUrls } from './util'
import { client, type UniversalToWebUrlMap } from './common'

vi.mock('./common', () => ({
  client: {
    post: vi.fn()
  }
}))

describe('makeObjectUrls', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('should make object URLs correctly with immediate flag', async () => {
    const mockResponse = {
      objectUrls: {
        'kodo://bucket/key1': 'https://bucket.example.com/key1',
        'kodo://bucket/key2': 'https://bucket.example.com/key2'
      } as UniversalToWebUrlMap
    }
    vi.mocked(client.post).mockResolvedValue(mockResponse)

    const objects = ['kodo://bucket/key1', 'kodo://bucket/key2']
    const objectUrls = await makeObjectUrls(objects, true)

    expect(client.post).toHaveBeenCalledWith('/util/fileurls', { objects })
    expect(objectUrls).toEqual(mockResponse.objectUrls)
  })

  it('should make multiple requests when immediate flag is true', async () => {
    const mockResponse1 = {
      objectUrls: {
        'kodo://bucket/key1': 'https://bucket.example.com/key1',
        'kodo://bucket/key2': 'https://bucket.example.com/key2'
      } as UniversalToWebUrlMap
    }
    const mockResponse2 = {
      objectUrls: {
        'kodo://bucket/key3': 'https://bucket.example.com/key3'
      } as UniversalToWebUrlMap
    }
    vi.mocked(client.post).mockResolvedValueOnce(mockResponse1).mockResolvedValueOnce(mockResponse2)

    const objects1 = ['kodo://bucket/key1', 'kodo://bucket/key2']
    const objects2 = ['kodo://bucket/key3']
    const [objectUrls1, objectUrls2] = await Promise.all([
      makeObjectUrls(objects1, true),
      makeObjectUrls(objects2, true)
    ])

    expect(client.post).toHaveBeenCalledTimes(2)
    expect(client.post).toHaveBeenNthCalledWith(1, '/util/fileurls', { objects: objects1 })
    expect(client.post).toHaveBeenNthCalledWith(2, '/util/fileurls', { objects: objects2 })
    expect(objectUrls1).toEqual(mockResponse1.objectUrls)
    expect(objectUrls2).toEqual(mockResponse2.objectUrls)
  })

  it('should batch requests when immediate flag is false', async () => {
    const mockResponse = {
      objectUrls: {
        'kodo://bucket/key1': 'https://bucket.example.com/key1',
        'kodo://bucket/key2': 'https://bucket.example.com/key2',
        'kodo://bucket/key3': 'https://bucket.example.com/key3'
      } as UniversalToWebUrlMap
    }
    vi.mocked(client.post).mockResolvedValue(mockResponse)

    const objects1 = ['kodo://bucket/key1', 'kodo://bucket/key2']
    const objects2 = ['kodo://bucket/key3']
    const promise1 = makeObjectUrls(objects1)
    const promise2 = makeObjectUrls(objects2)
    vi.advanceTimersByTime(16)
    const [objectUrls1, objectUrls2] = await Promise.all([promise1, promise2])

    expect(client.post).toHaveBeenCalledTimes(1)
    expect(client.post).toHaveBeenCalledWith('/util/fileurls', {
      objects: [...objects1, ...objects2]
    })
    expect(objectUrls1).toEqual(
      Object.fromEntries(objects1.map((key) => [key, mockResponse.objectUrls[key]]))
    )
    expect(objectUrls2).toEqual(
      Object.fromEntries(objects2.map((key) => [key, mockResponse.objectUrls[key]]))
    )
  })

  it('should handle errors correctly', async () => {
    const error = new Error('network error')
    vi.mocked(client.post).mockRejectedValue(error)

    const objects = ['kodo://bucket/key']
    await expect(makeObjectUrls(objects, true)).rejects.toThrow(error)
  })
})
