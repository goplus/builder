import { afterEach, describe, expect, it, vi } from 'vitest'
import { fromText } from '@/models/common/file'
import { getFileMediaUrl } from './media'
import { readVideoDimensions } from './video'

vi.mock('./media', () => ({ getFileMediaUrl: vi.fn() }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('readVideoDimensions', () => {
  function setup() {
    const video = document.createElement('video')
    vi.spyOn(document, 'createElement').mockReturnValue(video)
    vi.spyOn(video, 'load').mockImplementation(() => {})
    vi.mocked(getFileMediaUrl).mockResolvedValue('https://example.com/video.mp4')
    return video
  }

  it('reads intrinsic dimensions and releases the media', async () => {
    const video = setup()
    Object.defineProperties(video, { videoWidth: { value: 1080 }, videoHeight: { value: 1920 } })
    const pending = readVideoDimensions(fromText('video.mp4', 'video'))
    await vi.waitFor(() => expect(video.src).toBe('https://example.com/video.mp4'))
    video.dispatchEvent(new Event('loadedmetadata'))
    expect(await pending).toEqual({ width: 1080, height: 1920 })
    expect(video.getAttribute('src')).toBeNull()
    expect(vi.mocked(getFileMediaUrl).mock.calls.at(-1)![1].aborted).toBe(true)
  })

  it('returns unknown dimensions on a media error', async () => {
    const video = setup()
    const pending = readVideoDimensions(fromText('video.mp4', 'video'))
    await vi.waitFor(() => expect(video.src).toBe('https://example.com/video.mp4'))
    video.dispatchEvent(new Event('error'))
    expect(await pending).toBeNull()
  })

  it('times out rather than blocking a save', async () => {
    vi.useFakeTimers()
    setup()
    const pending = readVideoDimensions(fromText('video.mp4', 'video'))
    await vi.advanceTimersByTimeAsync(10000)
    expect(await pending).toBeNull()
  })

  it('cancels pending metadata loading', async () => {
    const video = setup()
    const controller = new AbortController()
    const pending = readVideoDimensions(fromText('video.mp4', 'video'), controller.signal)
    await vi.waitFor(() => expect(video.src).toBe('https://example.com/video.mp4'))
    controller.abort()
    expect(await pending).toBeNull()
  })
})
