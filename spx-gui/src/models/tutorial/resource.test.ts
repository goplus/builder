import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { getResourceName, Resource, validateResourceLayout, validateResourceName } from './resource'

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

  it('keeps a package record named __proto__', async () => {
    const files = makeFiles()
    // Assigning this key to a plain object would set its prototype and drop the record.
    files['assets/videos/step-to/__proto__'] = fromText('__proto__', 'helper')
    const video = await Resource.load('videos', 'step-to', files)
    if (video == null) throw new Error('resource expected')

    expect([...video.extraFiles.keys()]).toContain('__proto__')
    expect(await toText(video.export()['assets/videos/step-to/__proto__']!)).toBe('helper')
  })

  it('carries unknown records of the package directory along, also when renamed', async () => {
    const files = makeFiles()
    files['assets/videos/step-to/captions.vtt'] = fromText('captions.vtt', 'WEBVTT')
    const video = await Resource.load('videos', 'step-to', files)
    if (video == null) throw new Error('resource expected')

    expect([...video.extraFiles.keys()]).toEqual(['captions.vtt'])
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

    expect(() => video.setName('assets/step-to')).toThrow('must not contain /')
    expect(() => new Resource('a/b', 'x', fromText('x.png', 'png'))).toThrow('must not contain /')
  })

  it('limits names to 100 code points', () => {
    expect(validateResourceName('videos', 'a'.repeat(101), null)?.en).toContain('maximum is 100 characters')
  })

  describe('package layout guard', () => {
    it('keeps the payload path clear of the manifest', () => {
      const data = new Resource('data', 'config', fromText('config.json', '{}'))

      expect(() => data.setName('index')).toThrow('conflicts with the package manifest')
      expect(
        validateResourceLayout({ kind: 'data', name: 'index', file: data.file, extraFiles: new Map() }, null)?.en
      ).toContain('manifest')
      // Another extension is fine: only `index` + `.json` would be the manifest path.
      expect(() => new Resource('data', 'index', fromText('index.txt', 'x')).setName('index')).not.toThrow()
    })

    it('keeps the payload path clear of the extra records of the package', async () => {
      const files = makeFiles()
      files['assets/videos/step-to/captions.vtt'] = fromText('captions.vtt', 'WEBVTT')
      const video = await Resource.load('videos', 'step-to', files)
      if (video == null) throw new Error('resource expected')

      // Renaming to `captions` is fine while the payload is `.mp4`, but not once the payload becomes `.vtt`.
      video.setName('captions')
      expect(() => video.setFile(fromText('subs.vtt', 'WEBVTT'))).toThrow('conflicts with file captions.vtt')
      expect(Object.keys(video.export()).sort()).toEqual([
        'assets/videos/captions/captions.mp4',
        'assets/videos/captions/captions.vtt',
        'assets/videos/captions/index.json'
      ])
    })

    it('rejects names and kinds that cannot be a path segment', () => {
      // `.` and `..` would make `export()` write paths that `Resource.load` resolves to other keys, leaving a
      // course that cannot be loaded at all; the shared `validatePathSegment` covers them.
      const video = new Resource('videos', 'step-to', fromText('step-to.mp4', 'video'))
      for (const name of ['', '.', '..', 'a/b', 'a\0b']) {
        expect(validateResourceName('videos', name, null), `name ${JSON.stringify(name)}`).not.toBeNull()
        expect(() => video.setName(name)).toThrow()
      }
      for (const kind of ['', '.', '..', 'a/b']) {
        expect(() => new Resource(kind, 'x', fromText('x.png', 'png')), `kind ${JSON.stringify(kind)}`).toThrow()
      }
    })

    it('keeps the payload path clear of folders in the package', async () => {
      const files = makeFiles()
      // A folder `intro.mp4` inside the package: renaming to `intro` would make the payload that same path.
      files['assets/videos/step-to/intro.mp4/child.txt'] = fromText('child.txt', 'child')
      const video = await Resource.load('videos', 'step-to', files)
      if (video == null) throw new Error('resource expected')

      expect(() => video.setName('intro')).toThrow('conflicts with folder intro.mp4')
      // So would a payload whose extension turns its path into such a folder.
      files['assets/videos/step-to/step-to.txt/child.txt'] = fromText('child.txt', 'child')
      const other = await Resource.load('videos', 'step-to', files)
      expect(() => other!.setFile(fromText('new.txt', 'x'))).toThrow('conflicts with folder step-to.txt')
    })

    it('derives names that satisfy the whole layout, so index.json becomes the resource index2', () => {
      const file = fromText('index.json', '{}')
      expect(getResourceName(null, 'data', 'index', { file, extraFiles: new Map() })).toBe('index2')
      expect(getResourceName(null, 'data', 'index')).toBe('index')
    })

    it('refuses to export a layout that would overwrite a record', () => {
      // The constructor is lenient (loaded packages are tolerated as they are); export is where it must not lie.
      const broken = new Resource('data', 'index', fromText('index.json', '{}'))
      expect(() => broken.export()).toThrow('would overwrite another record')
    })
  })
})
