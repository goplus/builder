import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { validateVideoName, Video } from './video'

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

  it('rejects names that cannot identify a video directory', () => {
    const video = new Video('step-to', fromText('step-to.mp4', 'video'))

    expect(() => video.setName('assets/step-to')).toThrow('The name must not contain /')
  })

  it('limits names to 100 code points', () => {
    expect(validateVideoName('a'.repeat(101), null)?.en).toContain('maximum is 100 characters')
  })
})
