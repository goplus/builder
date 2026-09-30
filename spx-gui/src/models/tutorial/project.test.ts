import { describe, expect, it, vi } from 'vitest'
import { nextTick, watch } from 'vue'

import type { TutorialProjectMetadata } from './project'
import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { mainCourseFilePath } from './course'
import { TutorialProject } from './project'
import { Resource } from './resource'

function makeMetadata(): TutorialProjectMetadata {
  return {
    id: 'course-id',
    owner: 'teacher',
    kind: 'playground',
    title: 'Move Lita',
    thumbnail: 'https://example.com/thumbnail.png'
  }
}

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '/simple/sprites/Lita',
      copilotContext: 'Help the learner.'
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}'),
    'project/assets/index.json': fromConfig('index.json', {}),
    'assets/videos/step-to/index.json': fromConfig('index.json', { path: 'step-to.mp4', builder_id: 'video-id' }),
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video')
  }
}

async function loadProject() {
  const project = new TutorialProject()
  await project.load({ metadata: makeMetadata(), files: makeFiles() })
  return project
}

describe('TutorialProject', () => {
  it('releases the SPX project it built when the course cannot be loaded', async () => {
    const dispose = vi.spyOn(SpxProject.prototype, 'dispose')
    // Content with no records at all: `loadFiles` rejects, and the caller never gets the instance to release.
    const course = { ...makeMetadata(), content: {} } as unknown as Parameters<typeof TutorialProject.load>[0]

    await expect(TutorialProject.load(course)).rejects.toThrow()

    expect(dispose).toHaveBeenCalled()
    dispose.mockRestore()
  })

  it('loads course metadata, code, project and videos', async () => {
    const tutorial = await loadProject()

    expect(tutorial.id).toBe('course-id')
    expect(tutorial.project.owner).toBeUndefined()
    expect(tutorial.mainCourse.code).toBe('onStart => {}')
    expect(tutorial.resources.map((resource) => resource.name)).toEqual(['step-to'])
    expect(tutorial.resources[0]._project).toBe(tutorial)
  })

  it('writes course code and owned SPX project state', async () => {
    const tutorial = await loadProject()
    tutorial.mainCourse.setCode('onStart => { showVideo "step-to" }')
    tutorial.project.addSprite(new Sprite('Lita'))

    const files = tutorial.exportFiles()
    expect(await toText(files[mainCourseFilePath]!)).toBe('onStart => { showVideo "step-to" }')
    expect(await toConfig(files['project/assets/index.json']!)).toBeDefined()

    const reloaded = new TutorialProject()
    await reloaded.loadFiles(files)
    expect(reloaded.project.sprites.map((sprite) => sprite.name)).toEqual(['Lita'])
  })

  it('keeps the embedded SPX project while reloading files', async () => {
    const tutorial = await loadProject()
    const project = tutorial.project

    await tutorial.loadFiles(makeFiles())

    expect(tutorial.project).toBe(project)
  })

  it('loads and exports metadata with files', async () => {
    const tutorial = await loadProject()
    tutorial.setMetadata({ title: 'Updated title' })

    const serialized = tutorial.export()
    expect(serialized.metadata.title).toBe('Updated title')
    expect(await toText(serialized.files[mainCourseFilePath]!)).toBe('onStart => {}')
  })

  it('adds and removes resources using the resource ID', async () => {
    const tutorial = await loadProject()
    const video = new Resource('videos', 'another', fromText('another.mp4', 'another'))
    tutorial.addResource(video)
    expect(video._project).toBe(tutorial)
    expect(tutorial.getResource('videos', 'another')).toBe(video)

    tutorial.removeResource(video.id)
    expect(video._project).toBeNull()
  })

  it('gives an added resource a name that does not conflict within its kind', async () => {
    const tutorial = await loadProject()
    const video = new Resource('videos', 'step-to', fromText('step-to.mp4', 'another'))
    const image = new Resource('images', 'step-to', fromText('step-to.png', 'png'))

    tutorial.addResource(video)
    tutorial.addResource(image)

    expect(video.name).toBe('step-to2')
    expect(image.name).toBe('step-to')
    expect(Object.keys(tutorial.exportFiles())).toContain('assets/images/step-to/step-to.png')
  })

  it('replaces the payload of a resource that belongs to the project', async () => {
    const tutorial = await loadProject()
    const note = new Resource('texts', 'note', fromText('note.txt', 'original'))
    tutorial.addResource(note)

    // Uniqueness must not treat the resource itself as a clash, or no payload could ever be edited.
    note.setFile(fromText('note.txt', 'edited'))

    expect(await toText(tutorial.exportFiles()['assets/texts/note/note.txt']!)).toBe('edited')
    // Renaming to the name it already has is the same situation.
    expect(() => note.setName('note')).not.toThrow()
  })

  it('refuses to give a package the directory of a record nobody claims', async () => {
    const files = makeFiles()
    // A directory under `assets` without a manifest: not a package, kept as an extra file.
    files['assets/texts/orphan/orphan.txt'] = fromText('orphan.txt', 'precious original')
    const tutorial = new TutorialProject()
    await tutorial.load({ metadata: makeMetadata(), files })
    const note = new Resource('texts', 'note', fromText('note.txt', 'resource payload'))
    tutorial.addResource(note)

    expect(() => note.setName('orphan')).toThrow('conflicts with file assets/texts/orphan/orphan.txt')

    // The record is still the author's, with its own content.
    expect(await toText(tutorial.exportFiles()['assets/texts/orphan/orphan.txt']!)).toBe('precious original')
  })

  it('refuses to export a path claimed by both a package and an extra file', async () => {
    const tutorial = await loadProject()
    // Every mutation validates the directory is free, so this state is only reachable by reaching in; the check
    // exists so that such a bug fails loudly instead of dropping one of the two records.
    tutorial.extraFiles.set('assets/videos/step-to/step-to.mp4', fromText('step-to.mp4', 'other'))

    expect(() => tutorial.exportFiles()).toThrow('claimed by more than one part')
  })

  it('reloads a course whose resources were renamed, added and edited', async () => {
    const tutorial = await loadProject()
    tutorial.getResource('videos', 'step-to')!.setName('intro')
    tutorial.addResource(new Resource('texts', 'note', fromText('note.txt', 'hello')))

    const reloaded = new TutorialProject()
    await reloaded.loadFiles(tutorial.exportFiles())

    expect(reloaded.resources.map((r) => `${r.kind}/${r.name}`).sort()).toEqual(['texts/note', 'videos/intro'])
    expect(await toText(reloaded.getResource('texts', 'note')!.file)).toBe('hello')
    expect(await toText(reloaded.getResource('videos', 'intro')!.file)).toBe('video')
  })

  describe('naming packages on load', () => {
    it('renames a package around the unclaimed records of the course being loaded', async () => {
      const files = makeFiles()
      // `data/index` with a .json payload would export its payload as `index.json`, over its own manifest, so it
      // has to be renamed; `index2` is taken by a record nobody claims.
      files['assets/data/index/index.json'] = fromConfig('index.json', { path: 'payload.json' })
      files['assets/data/index/payload.json'] = fromText('payload.json', '{"a":1}')
      files['assets/data/index2/index2.json'] = fromText('index2.json', 'orphan')
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files })

      expect(tutorial.getResource('data', 'index3')).not.toBeNull()
      const exported = tutorial.exportFiles()
      expect(await toText(exported['assets/data/index2/index2.json']!)).toBe('orphan')
      expect(await toText(exported['assets/data/index3/index3.json']!)).toBe('{"a":1}')
    })

    it('does not let the previous load rename a valid package when reloading', async () => {
      const first = makeFiles()
      first['assets/texts/note/note.txt'] = fromText('note.txt', 'an orphan') // no manifest: an extra file
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files: first })

      const second = makeFiles()
      second['assets/texts/note/index.json'] = fromConfig('index.json', { path: 'note.txt' }) // now a real package
      second['assets/texts/note/note.txt'] = fromText('note.txt', 'a package')
      await tutorial.loadFiles(second)

      expect(tutorial.getResource('texts', 'note')).not.toBeNull()
      expect(tutorial.resources.map((r) => r.name)).not.toContain('note2')
    })

    it('keeps the name of a valid package that a renamed one would otherwise take', async () => {
      const files = makeFiles()
      // Listed first (keys are sorted), `index` needs renaming and would pick `index2` if it came first.
      files['assets/data/index/index.json'] = fromConfig('index.json', { path: 'payload.json' })
      files['assets/data/index/payload.json'] = fromText('payload.json', 'renamed')
      files['assets/data/index2/index.json'] = fromConfig('index.json', { path: 'index2.txt' })
      files['assets/data/index2/index2.txt'] = fromText('index2.txt', 'valid')
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files })

      expect(await toText(tutorial.getResource('data', 'index2')!.file)).toBe('valid')
      expect(await toText(tutorial.getResource('data', 'index3')!.file)).toBe('renamed')
      // Still in the order the course lists them.
      expect(tutorial.resources.filter((r) => r.kind === 'data').map((r) => r.name)).toEqual(['index3', 'index2'])
    })
  })

  describe('package identity', () => {
    function withDuplicateIds() {
      // A package directory copied along with its manifest: both carry the same `builder_id`.
      const files = makeFiles()
      files['assets/texts/first/index.json'] = fromConfig('index.json', { path: 'first.txt', builder_id: 'DUP' })
      files['assets/texts/first/first.txt'] = fromText('first.txt', 'FIRST')
      files['assets/texts/second/index.json'] = fromConfig('index.json', { path: 'second.txt', builder_id: 'DUP' })
      files['assets/texts/second/second.txt'] = fromText('second.txt', 'SECOND')
      return files
    }

    it('gives packages that share an id distinct ids on load', async () => {
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files: withDuplicateIds() })

      const ids = tutorial.resources.map((r) => r.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('removes the package that was asked for', async () => {
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files: withDuplicateIds() })

      tutorial.removeResource(tutorial.getResource('texts', 'second')!.id)

      expect(tutorial.resources.filter((r) => r.kind === 'texts').map((r) => r.name)).toEqual(['first'])
    })

    it('refuses a rename onto another package even when they came with the same id', async () => {
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files: withDuplicateIds() })

      expect(() => tutorial.getResource('texts', 'second')!.setName('first')).toThrow('already exists')
      expect(await toText(tutorial.exportFiles()['assets/texts/first/first.txt']!)).toBe('FIRST')
    })

    it('refuses to export two packages in one directory', async () => {
      const tutorial = await loadProject()
      // Only reachable by reaching past `addResource`: the check makes such a bug fail loudly instead of
      // silently keeping one of the two packages.
      tutorial.resources.push(new Resource('videos', 'step-to', fromText('step-to.mp4', 'other')))

      expect(() => tutorial.exportFiles()).toThrow('claimed by more than one part')
    })
  })

  describe('records named like object properties', () => {
    it('keeps a package record named __proto__ through a save and a reload', async () => {
      const files = makeFiles()
      files['assets/videos/step-to/__proto__'] = fromText('__proto__', 'helper')
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files })

      const reloaded = new TutorialProject()
      await reloaded.loadFiles(tutorial.exportFiles())

      expect(await toText(reloaded.exportFiles()['assets/videos/step-to/__proto__']!)).toBe('helper')
    })

    it('keeps and exports records named constructor or toString', async () => {
      const files = makeFiles()
      files['constructor'] = fromText('constructor', 'C')
      files['toString'] = fromText('toString', 'T')
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files })

      const exported = tutorial.exportFiles()
      expect(await toText(exported['constructor']!)).toBe('C')
      expect(await toText(exported['toString']!)).toBe('T')
    })

    it('does not report inherited properties as records', async () => {
      const tutorial = await loadProject()
      expect(tutorial.getExtraFile('toString')).toBeNull()
      expect(tutorial.getExtraFile('constructor')).toBeNull()
      expect(() => tutorial.removeExtraFile('toString')).toThrow('not found')
    })

    it('refuses __proto__, which a plain object would swallow', async () => {
      const tutorial = await loadProject()
      expect(() => tutorial.setExtraFile('__proto__', fromText('__proto__', 'x'))).toThrow('reserved')
    })
  })

  describe("records named after Vue's internal flags", () => {
    // On a reactive object these names are Vue's: reading one returns a flag, and a truthy `__v_skip` makes Vue
    // stop wrapping the object, so later changes go unnoticed.
    const flags = ['__v_isReactive', '__v_isReadonly', '__v_isShallow', '__v_raw', '__v_skip']

    it('keeps them as ordinary records', async () => {
      // One course per name: a `__v_skip` in the same course would stop Vue wrapping the map and hide the others.
      for (const name of flags) {
        const tutorial = await loadProject()
        tutorial.setExtraFile(name, fromText(name, name))

        const exported = tutorial.exportFiles()[name]
        expect(exported instanceof Object && 'arrayBuffer' in exported, name).toBe(true)
        expect(await toText(exported!), name).toBe(name)
      }
    })

    it('keeps tracking changes after a record named __v_skip', async () => {
      const tutorial = await loadProject()
      let changes = 0
      watch(
        () => tutorial.exportFiles(),
        () => changes++
      )
      tutorial.setExtraFile('__v_skip', fromText('__v_skip', 'x'))
      await nextTick()
      const before = changes

      // What decides whether the course shows as unsaved.
      tutorial.setExtraFile('notes.txt', fromText('notes.txt', 'x'))
      await nextTick()

      expect(changes).toBeGreaterThan(before)
    })

    it('keeps them inside a package', async () => {
      const files = makeFiles()
      files['assets/videos/step-to/__v_isReactive'] = fromText('__v_isReactive', 'helper')
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files })

      expect(await toText(tutorial.exportFiles()['assets/videos/step-to/__v_isReactive']!)).toBe('helper')
    })
  })

  describe('files and folders', () => {
    it('refuses a file where the course keeps a folder, even while it is empty', async () => {
      const files = makeFiles()
      delete files['assets/videos/step-to/index.json']
      delete files['assets/videos/step-to/step-to.mp4']
      const tutorial = new TutorialProject()
      await tutorial.load({ metadata: makeMetadata(), files })

      // Nothing is under `assets` yet, but the editor has a page for videos and uploads go to `assets/videos`.
      expect(() => tutorial.setExtraFile('assets', fromText('assets', 'x'))).toThrow('a folder the course keeps')
      expect(() => tutorial.setExtraFile('assets/videos', fromText('videos', 'x'))).toThrow('a folder the course keeps')
    })

    it('refuses a record below a file', async () => {
      const tutorial = await loadProject()
      tutorial.setExtraFile('notes.md', fromText('notes.md', 'NOTES'))
      expect(() => tutorial.setExtraFile('notes.md/child.txt', fromText('child.txt', 'x'))).toThrow(
        'conflicts with record notes.md'
      )
      // `index.json` and `main_course.gox` are files too.
      expect(() => tutorial.setExtraFile('index.json/x', fromText('x', 'x'))).toThrow('conflicts with record')
    })

    it('refuses a file where a folder is', async () => {
      const tutorial = await loadProject()
      tutorial.setExtraFile('docs/a.md', fromText('a.md', 'A'))
      expect(() => tutorial.setExtraFile('docs', fromText('docs', 'x'))).toThrow('conflicts with record docs/a.md')
      // The embedded project's root and resource folders are folders as well.
      expect(() => tutorial.setExtraFile('project', fromText('project', 'x'))).toThrow('conflicts with record')
      expect(() => tutorial.setExtraFile('assets/videos', fromText('videos', 'x'))).toThrow('a folder the course keeps')
    })

    it('still lets a record be replaced at its own path', async () => {
      const tutorial = await loadProject()
      tutorial.setExtraFile('notes.md', fromText('notes.md', 'OLD'))
      tutorial.setExtraFile('notes.md', fromText('notes.md', 'NEW'))
      expect(await toText(tutorial.getExtraFile('notes.md')!)).toBe('NEW')
    })
  })

  it('keeps records nobody claims and writes them back', async () => {
    const files = makeFiles()
    files['notes.md'] = fromText('notes.md', '# notes')
    // A directory under `assets/videos` without a manifest is not a video package.
    files['assets/videos/orphan/orphan.mp4'] = fromText('orphan.mp4', 'orphan')
    const tutorial = new TutorialProject()
    await tutorial.load({ metadata: makeMetadata(), files })

    expect(tutorial.resources.map((resource) => resource.name)).toEqual(['step-to'])
    expect([...tutorial.extraFiles.keys()].sort()).toEqual(['assets/videos/orphan/orphan.mp4', 'notes.md'])

    const exported = tutorial.exportFiles()
    expect(exported['notes.md']).toBe(files['notes.md'])
    expect(exported['assets/videos/orphan/orphan.mp4']).toBe(files['assets/videos/orphan/orphan.mp4'])
  })

  it('refuses extra files on claimed paths and removes extra files', async () => {
    const tutorial = await loadProject()

    expect(() => tutorial.setExtraFile(mainCourseFilePath, fromText(mainCourseFilePath, ''))).toThrow('claimed')
    expect(() => tutorial.setExtraFile('project/extra.txt', fromText('extra.txt', ''))).toThrow('claimed')
    expect(() => tutorial.setExtraFile('assets/videos/step-to/x.txt', fromText('x.txt', ''))).toThrow('claimed')

    tutorial.setExtraFile('notes.md', fromText('notes.md', '# notes'))
    expect(tutorial.getExtraFile('notes.md')).not.toBeNull()
    expect(tutorial.exportFiles()['notes.md']).toBe(tutorial.getExtraFile('notes.md'))

    tutorial.removeExtraFile('notes.md')
    expect(tutorial.getExtraFile('notes.md')).toBeNull()
    expect(tutorial.exportFiles()['notes.md']).toBeUndefined()
  })

  it('keeps the identity of generated files while their source is unchanged', async () => {
    const tutorial = await loadProject()
    const first = tutorial.exportFiles()
    const second = tutorial.exportFiles()

    expect(second['index.json']).toBe(first['index.json'])
    expect(second[mainCourseFilePath]).toBe(first[mainCourseFilePath])
    expect(second['assets/videos/step-to/index.json']).toBe(first['assets/videos/step-to/index.json'])

    tutorial.mainCourse.setCode('onStart => { showVideo "step-to" }')
    tutorial.setConfig({ copilotContext: 'Changed.' })
    const third = tutorial.exportFiles()
    expect(third[mainCourseFilePath]).not.toBe(first[mainCourseFilePath])
    expect(third['index.json']).not.toBe(first['index.json'])
    expect(third['assets/videos/step-to/index.json']).toBe(first['assets/videos/step-to/index.json'])
  })
})
