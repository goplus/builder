import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { Resource, validateResourceName } from './resource'

function makeFiles(): Files {
  return {
    'assets/videos/step-to/index.json': fromConfig('index.json', { path: 'step-to.mp4', builder_id: 'video-id' }),
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video')
  }
}

describe('Resource', () => {
  it('loads and exports a named resource package', async () => {
    const video = await Resource.load('videos', 'step-to', makeFiles())
    if (video == null) throw new Error('resource expected')

    expect(video.id).toBe('video-id')
    expect(video.kind).toBe('videos')
    expect(await toText(video.file)).toBe('video')

    const exported = video.export()
    expect(await toConfig(exported['assets/videos/step-to/index.json']!)).toEqual({
      path: 'step-to.mp4',
      builder_id: 'video-id'
    })
    expect(await toText(exported['assets/videos/step-to/step-to.mp4']!)).toBe('video')
  })

  it('loads every package under assets, whatever its kind', async () => {
    const files = makeFiles()
    files['assets/videos/another/index.json'] = fromConfig('index.json', { path: 'another.mp4' })
    files['assets/videos/another/another.mp4'] = fromText('another.mp4', 'another video')
    files['assets/images/hint/index.json'] = fromConfig('index.json', { path: 'hint.png' })
    files['assets/images/hint/hint.png'] = fromText('hint.png', 'png')
    // A directory without a manifest is not a package.
    files['assets/videos/orphan/orphan.mp4'] = fromText('orphan.mp4', 'orphan')

    const resources = await Resource.loadAll(files)
    expect(resources.map((resource) => `${resource.kind}/${resource.name}`).sort()).toEqual([
      'images/hint',
      'videos/another',
      'videos/step-to'
    ])
  })

  it('carries unknown records of the package directory along, also when renamed', async () => {
    const files = makeFiles()
    files['assets/videos/step-to/captions.vtt'] = fromText('captions.vtt', 'WEBVTT')
    const video = await Resource.load('videos', 'step-to', files)
    if (video == null) throw new Error('resource expected')

    expect(Object.keys(video.extraFiles)).toEqual(['captions.vtt'])
    expect(video.export()['assets/videos/step-to/captions.vtt']).toBe(files['assets/videos/step-to/captions.vtt'])

    video.setName('intro')
    const exported = video.export()
    expect(Object.keys(exported).sort()).toEqual([
      'assets/videos/intro/captions.vtt',
      'assets/videos/intro/index.json',
      'assets/videos/intro/intro.mp4'
    ])
  })

  it('rejects names that cannot identify a package directory', () => {
    const video = new Resource('videos', 'step-to', fromText('step-to.mp4', 'video'))

    expect(() => video.setName('assets/step-to')).toThrow('The name must not contain /')
    expect(() => new Resource('a/b', 'x', fromText('x.png', 'png'))).toThrow('must not contain /')
  })

  it('limits names to 100 code points', () => {
    expect(validateResourceName('videos', 'a'.repeat(101), null)?.en).toContain('maximum is 100 characters')
  })
})
