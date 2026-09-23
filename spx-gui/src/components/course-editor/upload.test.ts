import { describe, expect, it, vi } from 'vitest'

import { fromConfig, fromText, toText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import { addUploadedResources, validateResourceUpload } from './upload'

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

async function loadProject(files = makeFiles()) {
  const project = new TutorialProject()
  await project.loadFiles(files)
  return project
}

function nativeFile(name: string, content = 'content') {
  return new File([content], name)
}

function pathsOf(resources: { assetPath: string }[]) {
  return resources.map((resource) => resource.assetPath)
}

describe('validateResourceUpload', () => {
  it('accepts videos and pictures, including before the course has any', async () => {
    const files = makeFiles()
    for (const path of Object.keys(files)) if (path.startsWith('assets/')) delete files[path]
    const project = await loadProject(files)

    expect(validateResourceUpload(project, 'videos')).toBeNull()
    expect(validateResourceUpload(project, 'images')).toBeNull()
  })

  it('refuses a kind whose folder a file occupies', async () => {
    const files = makeFiles()
    files['assets/images'] = fromText('images', 'not a folder')
    const project = await loadProject(files)

    expect(validateResourceUpload(project, 'images')?.en).toContain('assets/images is a file')
    expect(validateResourceUpload(project, 'videos')).toBeNull()
  })

  it('refuses a kind whose folder the embedded project occupies', async () => {
    const files = makeFiles()
    files['index.json'] = fromConfig('index.json', {
      project: { type: 'spx', root: 'assets' },
      inEditorPath: '',
      copilotContext: ''
    })
    for (const path of Object.keys(files))
      if (path.startsWith('assets/') || path.startsWith('project/')) delete files[path]
    files['assets/assets/index.json'] = fromConfig('index.json', {})
    const project = await loadProject(files)

    expect(validateResourceUpload(project, 'videos')?.en).toContain('embedded project')
  })
})

describe('addUploadedResources', () => {
  it('packages each file as a resource of the kind, whatever its extension', async () => {
    const project = await loadProject()

    const videos = addUploadedResources(project, 'videos', [nativeFile('step-to.mov'), nativeFile('Intro clip.mkv')])
    const images = addUploadedResources(project, 'images', [nativeFile('hint.png')])

    expect(pathsOf(videos)).toEqual(['assets/videos/step-to2', 'assets/videos/Intro clip'])
    expect(pathsOf(images)).toEqual(['assets/images/hint'])
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

    const added = addUploadedResources(project, 'images', [nativeFile('index.json')])

    expect(pathsOf(added)).toEqual(['assets/images/index2'])
    const exported = project.exportFiles()
    expect(exported['assets/images/index2/index2.json']).toBeDefined()
    expect(exported['assets/images/index2/index.json']).toBeDefined()
    const reloaded = new TutorialProject()
    await reloaded.loadFiles(exported)
    expect(reloaded.getResource('images', 'index2')).not.toBeNull()
  })

  it('picks a free directory when an unclaimed record occupies the obvious one', async () => {
    const files = makeFiles()
    files['assets/images/orphan/orphan.png'] = fromText('orphan.png', 'precious original')
    const project = await loadProject(files)

    const added = addUploadedResources(project, 'images', [nativeFile('orphan.png')])

    expect(pathsOf(added)).toEqual(['assets/images/orphan2'])
    const exported = project.exportFiles()
    expect(await toText(exported['assets/images/orphan/orphan.png']!)).toBe('precious original')
    expect(exported['assets/images/orphan2/orphan2.png']).toBeDefined()
  })

  it('de-duplicates a name at the length limit instead of giving up', async () => {
    const project = await loadProject()
    const long = 'a'.repeat(100)

    addUploadedResources(project, 'images', [nativeFile(long + '.png')])
    const [added] = addUploadedResources(project, 'images', [nativeFile(long + '.png')])

    expect(added.name).not.toBe(long)
    expect(Array.from(added.name).length).toBeLessThanOrEqual(100)
    expect(project.resources.filter((r) => r.kind === 'images')).toHaveLength(2)
  })

  it('adds nothing when one of the files fails', async () => {
    const project = await loadProject()
    const addResource = project.addResource.bind(project)
    let calls = 0
    vi.spyOn(project, 'addResource').mockImplementation((resource) => {
      if (++calls === 2) throw new Error('boom')
      addResource(resource)
    })

    expect(() => addUploadedResources(project, 'images', [nativeFile('one.png'), nativeFile('two.png')])).toThrow(
      'boom'
    )
    expect(project.resources.filter((r) => r.kind === 'images')).toEqual([])
  })
})
