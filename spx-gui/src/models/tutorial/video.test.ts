import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { getVideoName, validateVideoName } from './asset-name'
import { Video } from './video'

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
