import { describe, expect, it, vi } from 'vitest'

import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { getVideoName, validateVideoName } from './asset-name'
import { Video } from './video'
import { readVideoDimensions } from '@/utils/video'

vi.mock('@/utils/video', () => ({ readVideoDimensions: vi.fn() }))

function makeFiles(): Files {
  return {
    'assets/videos/step-to/index.json': fromConfig('index.json', { path: 'step-to.mp4', builder_id: 'video-id' }),
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video')
  }
}

describe('Video', () => {
  it('loads and exports a named video resource', async () => {
    const video = await Video.load('step-to', makeFiles())
    if (video == null) throw new Error('video expected')

    expect(video.id).toBe('video-id')
    expect(await toText(video.file)).toBe('video')

    const exported = video.export()
    expect(await toConfig(exported['assets/videos/step-to/index.json']!)).toEqual({
      path: 'step-to.mp4',
      builder_id: 'video-id'
    })
    expect(await toText(exported['assets/videos/step-to/step-to.mp4']!)).toBe('video')
  })

  it('loads every declared video', async () => {
    const files = makeFiles()
    files['assets/videos/another/index.json'] = fromConfig('index.json', { path: 'another.mp4' })
    files['assets/videos/another/another.mp4'] = fromText('another.mp4', 'another video')

    expect((await Video.loadAll(files)).map((video) => video.name)).toEqual(['step-to', 'another'])
  })

  it('exports under its new name after a rename', async () => {
    const video = new Video('step-to', fromText('original.mp4', 'video'))
    video.setName('intro')

    const exported = video.export()
    expect(Object.keys(exported).sort()).toEqual(['assets/videos/intro/index.json', 'assets/videos/intro/intro.mp4'])
    expect(await toConfig(exported['assets/videos/intro/index.json']!)).toMatchObject({ path: 'intro.mp4' })
  })

  it('keeps its manifest file while unchanged', () => {
    const video = new Video('step-to', fromText('step-to.mp4', 'video'))
    const manifest = video.export()['assets/videos/step-to/index.json']

    expect(video.export()['assets/videos/step-to/index.json']).toBe(manifest)
    video.setFile(fromText('step-to.webm', 'video'))
    expect(video.export()['assets/videos/step-to/index.json']).not.toBe(manifest)
  })

  it('rejects names that cannot identify a video directory', () => {
    const video = new Video('step-to', fromText('step-to.mp4', 'video'))

    expect(() => video.setName('assets/step-to')).toThrow('must not contain /')
    expect(() => video.setName('..')).toThrow('cannot be . or ..')
  })

  it('limits names to 100 code points', () => {
    expect(validateVideoName('a'.repeat(101), null)?.en).toContain('maximum is 100 characters')
  })

  it('names a video after its file when it can', () => {
    expect(getVideoName(null, 'step-to')).toBe('step-to')
    expect(getVideoName(null, '')).toBe('video')
    expect(getVideoName(null, 'a'.repeat(101))).toBe('video')
  })
})

describe('optional video dimensions', () => {
  it('seeds the file cache from the manifest', async () => {
    const files = makeFiles()
    files['assets/videos/step-to/index.json'] = fromConfig('index.json', {
      path: 'step-to.mp4',
      width: 640,
      height: 480
    })
    await Video.load('step-to', files)
    expect(files['assets/videos/step-to/step-to.mp4']!.meta.videoSize).toEqual({ width: 640, height: 480 })
  })

  it('initializes reactive dimensions from an existing file cache', async () => {
    const file = fromText('intro.mp4', 'video')
    file.meta.videoSize = { width: 1080, height: 1920 }
    const video = new Video('intro', file)
    expect(video.aspectRatio).toBe(1080 / 1920)
    expect(await toConfig(video.export()['assets/videos/intro/index.json']!)).toMatchObject({
      width: 1080,
      height: 1920
    })
  })

  it('syncs dimensions when the same file gains a size cache', () => {
    const file = fromText('intro.mp4', 'video')
    const video = new Video('intro', file)
    file.meta.videoSize = { width: 640, height: 480 }
    video.setFile(file)
    expect(video.width).toBe(640)
    expect(video.height).toBe(480)
  })

  it('uses the replacement file cache and clears dimensions when it is absent', () => {
    const video = new Video('intro', fromText('intro.mp4', 'video'))
    video.setDimensions(1920, 1080)
    const replacement = fromText('portrait.mp4', 'portrait')
    replacement.meta.videoSize = { width: 1080, height: 1920 }
    video.setFile(replacement)
    expect(video.aspectRatio).toBe(1080 / 1920)
    video.setFile(fromText('unknown.mp4', 'unknown'))
    expect(video.width).toBeNull()
    expect(video.height).toBeNull()
  })

  it('preserves dimensions through export and reload', async () => {
    const video = new Video('intro', fromText('intro.mp4', 'video'))
    video.setDimensions(1080, 1920)
    const loaded = await Video.load('intro', video.export())
    expect(loaded?.width).toBe(1080)
    expect(loaded?.height).toBe(1920)
    expect(loaded?.aspectRatio).toBe(1080 / 1920)
  })

  it.each([
    {},
    { width: 640 },
    { width: 0, height: 480 },
    { width: -1, height: 480 },
    { width: 1.5, height: 480 },
    { width: Infinity, height: 480 },
    { width: '640', height: 480 }
  ])('loads unusable dimensions as unknown: %j', async (dimensions) => {
    const files = makeFiles()
    files['assets/videos/step-to/index.json'] = fromConfig('index.json', { path: 'step-to.mp4', ...dimensions })
    const video = await Video.load('step-to', files)
    expect(video?.aspectRatio).toBeNull()
    expect(await toConfig(video!.export()['assets/videos/step-to/index.json']!)).not.toHaveProperty('width')
  })

  it('extracts missing dimensions and clears them on media replacement', async () => {
    vi.mocked(readVideoDimensions).mockResolvedValue({ width: 640, height: 480 })
    const video = new Video('intro', fromText('intro.mp4', 'video'))
    await video.ensureDimensions()
    expect(video.aspectRatio).toBe(4 / 3)
    expect(video.file.meta.videoSize).toEqual({ width: 640, height: 480 })
    video.setFile(fromText('other.mp4', 'other'))
    expect(video.width).toBeNull()
    await video.ensureDimensions()
    expect(video.width).toBe(640)
  })

  it('ignores a result for replaced media', async () => {
    let complete!: (value: { width: number; height: number }) => void
    vi.mocked(readVideoDimensions).mockReturnValue(
      new Promise((resolve) => {
        complete = resolve
      })
    )
    const video = new Video('intro', fromText('intro.mp4', 'video'))
    const pending = video.ensureDimensions()
    video.setFile(fromText('other.mp4', 'other'))
    complete({ width: 640, height: 480 })
    await pending
    expect(video.width).toBeNull()
  })

  it('keeps failed extraction optional and retries later', async () => {
    vi.mocked(readVideoDimensions)
      .mockRejectedValueOnce(new Error('Metadata unavailable'))
      .mockResolvedValueOnce({ width: 640, height: 480 })
    const video = new Video('intro', fromText('intro.mp4', 'video'))
    await video.ensureDimensions()
    expect(video.aspectRatio).toBeNull()
    await video.ensureDimensions()
    expect(video.width).toBe(640)
  })
})
