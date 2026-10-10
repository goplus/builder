import { describe, expect, it, vi } from 'vitest'

import type { TutorialProjectMetadata } from './project'
import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { SpxProject } from '@/models/spx/project'
import { Sprite } from '@/models/spx/sprite'
import { mainCourseFilePath } from './course'
import { Image, TutorialProject, Video } from './project'

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
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video'),
    'assets/images/map/index.json': fromConfig('index.json', { path: 'map.png', builder_id: 'image-id' }),
    'assets/images/map/map.png': fromText('map.png', 'png')
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
    const course = { ...makeMetadata(), content: {} } as unknown as Parameters<typeof TutorialProject.load>[0]

    await expect(TutorialProject.load(course)).rejects.toThrow()

    expect(dispose).toHaveBeenCalled()
    dispose.mockRestore()
  })

  it('loads course metadata, code, project, videos and images', async () => {
    const tutorial = await loadProject()

    expect(tutorial.id).toBe('course-id')
    expect(tutorial.project.owner).toBeUndefined()
    expect(tutorial.mainCourse.code).toBe('onStart => {}')
    expect(tutorial.videos.map((video) => video.name)).toEqual(['step-to'])
    expect(tutorial.videos[0]._project).toBe(tutorial)
    expect(tutorial.images.map((image) => image.name)).toEqual(['map'])
    expect(tutorial.images[0]._project).toBe(tutorial)
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

    const serialized = await tutorial.export()
    expect(serialized.metadata.title).toBe('Updated title')
    expect(await toText(serialized.files[mainCourseFilePath]!)).toBe('onStart => {}')
  })

  it('exports after transactions of the course and of the embedded project', async () => {
    const tutorial = await loadProject()
    const order: string[] = []
    const courseEdit = tutorial.mutex.runExclusive(async () => {
      await Promise.resolve()
      tutorial.mainCourse.setCode('onStart => { showVideo "step-to" }')
      order.push('course')
    })
    const projectEdit = tutorial.project.mutex.runExclusive(async () => {
      await Promise.resolve()
      tutorial.project.addSprite(new Sprite('Lita'))
      order.push('project')
    })

    const { files } = await tutorial.export()
    await Promise.all([courseEdit, projectEdit])

    expect(order).toEqual(['course', 'project'])
    expect(await toText(files[mainCourseFilePath]!)).toBe('onStart => { showVideo "step-to" }')
    expect(Object.keys(files)).toContain('project/assets/sprites/Lita/index.json')
  })

  it('adds and removes videos and images using their IDs', async () => {
    const tutorial = await loadProject()
    const video = new Video('another', fromText('another.mp4', 'another'))
    const image = new Image('another', fromText('another.png', 'another'))
    tutorial.addVideo(video)
    tutorial.addImage(image)
    expect(video._project).toBe(tutorial)
    expect(image._project).toBe(tutorial)

    tutorial.removeVideo(video.id)
    tutorial.removeImage(image.id)
    expect(video._project).toBeNull()
    expect(image._project).toBeNull()
    expect(tutorial.videos.map((v) => v.name)).toEqual(['step-to'])
    expect(tutorial.images.map((i) => i.name)).toEqual(['map'])
  })

  it('checks names among resources of the same type only', async () => {
    const tutorial = await loadProject()
    const video = new Video('step-to', fromText('step-to.mp4', 'another'))
    const image = new Image('step-to', fromText('step-to.png', 'png'))

    tutorial.addVideo(video)
    tutorial.addImage(image)

    expect(video.name).toBe('step-to2')
    expect(image.name).toBe('step-to')
  })

  it('reloads a course whose resources were renamed, added and edited', async () => {
    const tutorial = await loadProject()
    tutorial.videos[0].setName('intro')
    tutorial.images[0].setFile(fromText('map.jpg', 'jpg'))
    tutorial.addVideo(new Video('outro', fromText('outro.webm', 'outro')))

    const reloaded = new TutorialProject()
    await reloaded.loadFiles(tutorial.exportFiles())

    expect(reloaded.videos.map((v) => v.name).sort()).toEqual(['intro', 'outro'])
    expect(await toText(reloaded.videos.find((v) => v.name === 'intro')!.file)).toBe('video')
    expect(await toText(reloaded.images[0].file)).toBe('jpg')
  })

  it('does not keep files it has no part for', async () => {
    const files = makeFiles()
    files['notes.md'] = fromText('notes.md', 'notes')
    files['assets/texts/note/index.json'] = fromConfig('index.json', { path: 'note.txt' })
    const tutorial = new TutorialProject()
    await tutorial.load({ metadata: makeMetadata(), files })

    const exported = Object.keys(tutorial.exportFiles())
    expect(exported).not.toContain('notes.md')
    expect(exported).not.toContain('assets/texts/note/index.json')
  })

  it('keeps the parts that did not change when reloading, the embedded project included', async () => {
    const tutorial = await loadProject()
    const files = tutorial.exportFiles()
    const video = tutorial.videos[0]
    const loadProjectFiles = vi.spyOn(tutorial.project, 'loadFiles')
    tutorial.mainCourse.setCode('onStart => { showVideo "step-to" }')

    await tutorial.loadFiles(files)

    expect(tutorial.mainCourse.code).toBe('onStart => {}')
    const reloaded = tutorial.exportFiles()
    expect(reloaded['index.json']).toBe(files['index.json'])
    expect(reloaded['assets/videos/step-to/index.json']).toBe(files['assets/videos/step-to/index.json'])
    expect(tutorial.videos[0]).toBe(video)
    expect(video._project).toBe(tutorial)
    expect(loadProjectFiles).not.toHaveBeenCalled()
  })

  it('reloads the embedded project when its files changed', async () => {
    const tutorial = await loadProject()
    const files = tutorial.exportFiles()
    tutorial.project.addSprite(new Sprite('Lita'))

    await tutorial.loadFiles(files)

    expect(tutorial.project.sprites).toEqual([])
  })

  it('updates the config', async () => {
    const tutorial = await loadProject()
    tutorial.setConfig({ inEditorPath: '/simple/sprites/Lita/code' })

    expect(await toConfig(tutorial.exportFiles()['index.json']!)).toEqual({
      project: { type: 'spx', root: 'project' },
      inEditorPath: '/simple/sprites/Lita/code',
      copilotContext: 'Help the learner.'
    })
  })

  it('keeps the identity of generated files while their source is unchanged', async () => {
    const tutorial = await loadProject()
    const first = tutorial.exportFiles()
    const second = tutorial.exportFiles()

    expect(second['index.json']).toBe(first['index.json'])
    expect(second[mainCourseFilePath]).toBe(first[mainCourseFilePath])
    expect(second['assets/videos/step-to/index.json']).toBe(first['assets/videos/step-to/index.json'])
    expect(second['assets/images/map/index.json']).toBe(first['assets/images/map/index.json'])

    tutorial.mainCourse.setCode('onStart => { showVideo "step-to" }')
    tutorial.setConfig({ copilotContext: 'Changed.' })
    const third = tutorial.exportFiles()
    expect(third[mainCourseFilePath]).not.toBe(first[mainCourseFilePath])
    expect(third['index.json']).not.toBe(first['index.json'])
    expect(third['assets/videos/step-to/index.json']).toBe(first['assets/videos/step-to/index.json'])
  })
})
