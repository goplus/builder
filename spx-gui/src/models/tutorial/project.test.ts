import { describe, expect, it } from 'vitest'

import type { TutorialProjectMetadata } from './project'
import { fromConfig, fromText, toConfig, toText, type Files } from '@/models/common/file'
import { Sprite } from '@/models/spx/sprite'
import { mainCourseFilePath } from './course'
import { TutorialProject } from './project'
import { Video } from './video'

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
  it('loads course metadata, code, project and videos', async () => {
    const tutorial = await loadProject()

    expect(tutorial.id).toBe('course-id')
    expect(tutorial.project.owner).toBeUndefined()
    expect(tutorial.mainCourse.code).toBe('onStart => {}')
    expect(tutorial.videos.map((video) => video.name)).toEqual(['step-to'])
    expect(tutorial.videos[0]._project).toBe(tutorial)
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

  it('adds and removes videos using the resource ID', async () => {
    const tutorial = await loadProject()
    const video = new Video('another', fromText('another.mp4', 'another'))
    tutorial.addVideo(video)
    expect(video._project).toBe(tutorial)

    tutorial.removeVideo(video.id)
    expect(video._project).toBeNull()
  })

  it('gives an added video a non-conflicting name', async () => {
    const tutorial = await loadProject()
    const video = new Video('step-to', fromText('step-to.mp4', 'another'))

    tutorial.addVideo(video)

    expect(video.name).toBe('step-to2')
  })
})
