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
    const file = fromText('video.mp4', 'video')
    const pending = readVideoDimensions(file)
    await vi.waitFor(() => expect(video.src).toBe('https://example.com/video.mp4'))
    video.dispatchEvent(new Event('loadedmetadata'))
    expect(await pending).toEqual({ width: 1080, height: 1920 })
    expect(file.meta.videoSize).toEqual({ width: 1080, height: 1920 })
    expect(await readVideoDimensions(file)).toEqual({ width: 1080, height: 1920 })
    expect(video.getAttribute('src')).toBeNull()
    expect(vi.mocked(getFileMediaUrl).mock.calls.at(-1)![1].aborted).toBe(true)
  })

  it('reuses cached dimensions without loading media', async () => {
    const file = fromText('video.mp4', 'video')
    file.meta.videoSize = { width: 640, height: 480 }
    const createElement = vi.spyOn(document, 'createElement')
    expect(await readVideoDimensions(file)).toEqual({ width: 640, height: 480 })
    expect(createElement).not.toHaveBeenCalled()
  })

  it('propagates URL acquisition errors', async () => {
    setup()
    const error = new Error('URL unavailable')
    vi.mocked(getFileMediaUrl).mockRejectedValueOnce(error)
    await expect(readVideoDimensions(fromText('video.mp4', 'video'))).rejects.toBe(error)
  })

  it('rejects on a media error', async () => {
    const video = setup()
    const pending = readVideoDimensions(fromText('video.mp4', 'video'))
    await vi.waitFor(() => expect(video.src).toBe('https://example.com/video.mp4'))
    const rejected = expect(pending).rejects.toThrow('Failed to load video metadata')
    video.dispatchEvent(new Event('error'))
    await rejected
  })

  it('rejects with a timeout error', async () => {
    vi.useFakeTimers()
    setup()
    const pending = readVideoDimensions(fromText('video.mp4', 'video'))
    const rejected = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
    await vi.advanceTimersByTimeAsync(10000)
    await rejected
  })

  it('cancels pending metadata loading', async () => {
    const video = setup()
    const controller = new AbortController()
    const pending = readVideoDimensions(fromText('video.mp4', 'video'), controller.signal)
    await vi.waitFor(() => expect(video.src).toBe('https://example.com/video.mp4'))
    const reason = new Error('Cancelled by caller')
    const rejected = expect(pending).rejects.toBe(reason)
    controller.abort(reason)
    await rejected
  })
})
