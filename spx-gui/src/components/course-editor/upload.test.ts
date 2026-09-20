import { describe, expect, it, vi } from 'vitest'

import { fromConfig, fromText, toText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import {
  addUploadedFiles,
  addUploadedFilesOfType,
  getUploadConflicts,
  getUploadDir,
  getUploadTypeAt,
  validateUpload,
  validateUploadDir,
  validateUploadPath
} from './upload'

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '',
      copilotContext: ''
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {}'),
    'project/assets/index.json': fromConfig('index.json', {}),
    'assets/videos/step-to/index.json': fromConfig('index.json', { path: 'step-to.mp4', builder_id: 'video-id' }),
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video'),
    'notes.md': fromText('notes.md', '# notes')
  }
}

async function loadProject() {
  const project = new TutorialProject()
  await project.loadFiles(makeFiles())
  return project
}

function nativeFile(name: string, content = 'content') {
  return new File([content], name)
}

describe('validateUploadDir', () => {
  it('accepts the course root, workspace folders and any resource type folder', async () => {
    const project = await loadProject()
    expect(validateUploadDir(project, '')).toBeNull()
    expect(validateUploadDir(project, 'docs/notes')).toBeNull()
    expect(validateUploadDir(project, 'assets/videos')).toBeNull()
    expect(validateUploadDir(project, 'assets/images')).toBeNull()
  })

  it('refuses the project, assets itself and package directories', async () => {
    const project = await loadProject()
    expect(validateUploadDir(project, 'project')?.en).toContain('Project Editor')
    expect(validateUploadDir(project, 'project/assets')?.en).toContain('Project Editor')
    expect(validateUploadDir(project, 'assets')?.en).toContain('resource type folder')
    expect(validateUploadDir(project, 'assets/videos/step-to')?.en).toContain('managed by the editor')
    expect(validateUploadDir(project, 'assets/videos/new-package')?.en).toContain('managed by the editor')
  })
})

describe('validateUploadPath', () => {
  it('refuses fixed-path records and accepts anything else in the workspace', async () => {
    const project = await loadProject()
    expect(validateUploadPath(project, '', 'index.json')?.en).toContain('its own editor')
    expect(validateUploadPath(project, '', mainCourseFilePath)?.en).toContain('its own editor')
    expect(validateUploadPath(project, '', 'readme.md')).toBeNull()
    expect(validateUploadPath(project, 'assets/videos', 'index.json')).toBeNull()
  })
})

describe('addUploadedFiles', () => {
  it('packages files uploaded into assets/<kind>, whatever the kind and extension', async () => {
    const project = await loadProject()

    const videos = addUploadedFiles(project, 'assets/videos', [nativeFile('step-to.mov'), nativeFile('Intro clip.mkv')])
    const images = addUploadedFiles(project, 'assets/images', [nativeFile('hint.png')])

    expect(videos).toEqual(['assets/videos/step-to2', 'assets/videos/Intro clip'])
    expect(images).toEqual(['assets/images/hint'])
    expect(project.resources.map((r) => `${r.kind}/${r.name}`)).toEqual([
      'videos/step-to',
      'videos/step-to2',
      'videos/Intro clip',
      'images/hint'
    ])
    const exported = project.exportFiles()
    expect(exported['assets/videos/step-to2/index.json']).toBeDefined()
    expect(exported['assets/videos/step-to2/step-to2.mov']).toBeDefined()
    expect(exported['assets/videos/Intro clip/Intro clip.mkv']).toBeDefined()
    expect(exported['assets/images/hint/index.json']).toBeDefined()
    expect(exported['assets/images/hint/hint.png']).toBeDefined()
  })

  it('packages a file named index.json without shadowing the manifest, and the course reloads', async () => {
    const project = await loadProject()

    const paths = addUploadedFiles(project, 'assets/data', [nativeFile('index.json')])

    expect(paths).toEqual(['assets/data/index2'])
    const exported = project.exportFiles()
    expect(exported['assets/data/index2/index2.json']).toBeDefined()
    expect(exported['assets/data/index2/index.json']).toBeDefined()
    const reloaded = new TutorialProject()
    await reloaded.loadFiles(exported)
    expect(reloaded.getResource('data', 'index2')).not.toBeNull()
  })

  it('picks a free directory when an unclaimed record occupies the obvious one', async () => {
    const files = makeFiles()
    files['assets/texts/orphan/orphan.txt'] = fromText('orphan.txt', 'precious original')
    const project = new TutorialProject()
    await project.loadFiles(files)

    const paths = addUploadedFiles(project, 'assets/texts', [nativeFile('orphan.txt')])

    expect(paths).toEqual(['assets/texts/orphan2'])
    const exported = project.exportFiles()
    expect(await toText(exported['assets/texts/orphan/orphan.txt']!)).toBe('precious original')
    expect(exported['assets/texts/orphan2/orphan2.txt']).toBeDefined()
  })

  it('de-duplicates a name at the length limit instead of giving up', async () => {
    const project = await loadProject()
    const long = 'a'.repeat(100)

    addUploadedFiles(project, 'assets/texts', [nativeFile(long + '.txt')])
    const [path] = addUploadedFiles(project, 'assets/texts', [nativeFile(long + '.txt')])

    const name = path.slice('assets/texts/'.length)
    expect(name).not.toBe(long)
    expect(Array.from(name).length).toBeLessThanOrEqual(100)
    expect(project.resources.filter((r) => r.kind === 'texts')).toHaveLength(2)
  })

  it('adds no package when one of the files fails', async () => {
    const project = await loadProject()
    const addResource = project.addResource.bind(project)
    let calls = 0
    vi.spyOn(project, 'addResource').mockImplementation((resource) => {
      if (++calls === 2) throw new Error('boom')
      addResource(resource)
    })

    expect(() => addUploadedFiles(project, 'assets/texts', [nativeFile('one.txt'), nativeFile('two.txt')])).toThrow(
      'boom'
    )
    expect(project.resources.filter((r) => r.kind === 'texts')).toEqual([])
  })

  it('adds no record when one of the files fails, and restores the ones it replaced', async () => {
    const project = await loadProject()
    project.setExtraFile('docs/a.md', fromText('a.md', 'A'))
    // `docs` is a folder, so the second file cannot be written; the first one must not stay behind.
    expect(() => addUploadedFiles(project, '', [nativeFile('notes.md', 'NEW'), nativeFile('docs')])).toThrow()

    expect(await toText(project.getExtraFile('notes.md')!)).toBe('# notes')
  })

  it('refuses a target folder that is a file, and a file where a folder is', async () => {
    const project = await loadProject()
    project.setExtraFile('docs/a.md', fromText('a.md', 'A'))

    expect(validateUploadDir(project, 'notes.md')?.en).toContain('notes.md is a file')
    expect(validateUploadDir(project, 'notes.md/deeper')?.en).toContain('notes.md is a file')
    expect(validateUploadPath(project, '', 'docs')?.en).toContain('docs is a folder')
    expect(validateUploadDir(project, 'docs')).toBeNull()
  })

  it('refuses a file named like a folder the course keeps, even in a course without resources', async () => {
    const files = makeFiles()
    for (const path of Object.keys(files)) if (path.startsWith('assets/')) delete files[path]
    const project = new TutorialProject()
    await project.loadFiles(files)

    expect(validateUploadPath(project, '', 'assets')?.en).toContain('a folder the course keeps')
    // And video uploads stay possible.
    expect(validateUploadDir(project, 'assets/videos')).toBeNull()
  })

  it('refuses __proto__ and keeps files named like other object properties', async () => {
    const project = await loadProject()
    expect(validateUploadPath(project, '', '__proto__')?.en).toContain('cannot be used as a file name')
    expect(validateUploadPath(project, '', 'constructor')).toBeNull()

    addUploadedFiles(project, '', [nativeFile('constructor', 'C')])
    expect(await toText(project.exportFiles()['constructor']!)).toBe('C')
  })

  it('stores files uploaded elsewhere as plain records, creating folders implicitly', async () => {
    const project = await loadProject()

    const paths = addUploadedFiles(project, 'docs/extra', [nativeFile('guide.pdf')])

    expect(paths).toEqual(['docs/extra/guide.pdf'])
    expect(project.getExtraFile('docs/extra/guide.pdf')).not.toBeNull()
    expect(project.exportFiles()['docs/extra/guide.pdf']).toBeDefined()
  })

  it('reports plain records that would be replaced', async () => {
    const project = await loadProject()
    expect(getUploadConflicts(project, '', ['notes.md', 'new.md'])).toEqual(['notes.md'])
    expect(getUploadConflicts(project, 'assets/videos', ['step-to.mp4'])).toEqual([])
  })
})

describe('upload types', () => {
  it('sends each type where its files belong', () => {
    expect(getUploadDir('video')).toBe('assets/videos')
    expect(getUploadDir('picture')).toBe('assets/images')
    // Anything else is kept next to the course, which is the only place the author never has to name.
    expect(getUploadDir('other')).toBe('')
  })

  it('starts from the group the author is in', () => {
    expect(getUploadTypeAt('')).toBe('video')
    expect(getUploadTypeAt('assets/images')).toBe('picture')
    expect(getUploadTypeAt('assets/images/hint')).toBe('picture')
    expect(getUploadTypeAt('notes.md')).toBe('video')
  })

  it('refuses a name only where the name becomes the record', async () => {
    const project = await loadProject()

    // As a plain record the file would take a path the course already claims.
    expect(validateUpload(project, 'other', ['index.json'])?.en).toContain('its own editor')
    // The same file as a picture is packaged under a derived name, so nothing collides.
    expect(validateUpload(project, 'picture', ['index.json'])).toBeNull()
    expect(validateUpload(project, 'video', ['step-to.mp4', 'index.json'])).toBeNull()
  })

  it('packages a picture and keeps another file as it is', async () => {
    const project = await loadProject()

    expect(addUploadedFilesOfType(project, 'picture', [nativeFile('hint.png', 'png')])).toEqual(['assets/images/hint'])
    expect(addUploadedFilesOfType(project, 'other', [nativeFile('handout.txt')])).toEqual(['handout.txt'])

    const files = project.exportFiles()
    expect(Object.keys(files)).toContain('assets/images/hint/index.json')
    expect(Object.keys(files)).toContain('assets/images/hint/hint.png')
    expect(await toText(files['handout.txt']!)).toBe('content')
  })
})
