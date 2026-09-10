import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import { addUploadedFiles, getUploadConflicts, normalizeDir, validateUploadDir, validateUploadPath } from './upload'

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

function nativeFile(name: string) {
  return new File(['content'], name)
}

describe('validateUploadDir', () => {
  it('accepts the course root, workspace folders and resource type folders', async () => {
    const project = await loadProject()
    expect(validateUploadDir(project, '')).toBeNull()
    expect(validateUploadDir(project, 'docs/notes')).toBeNull()
    expect(validateUploadDir(project, 'assets/videos')).toBeNull()
  })

  it('refuses the project, assets itself, unknown resource types and package directories', async () => {
    const project = await loadProject()
    expect(validateUploadDir(project, 'project')?.en).toContain('Project Editor')
    expect(validateUploadDir(project, 'project/assets')?.en).toContain('Project Editor')
    expect(validateUploadDir(project, 'assets')?.en).toContain('resource type folder')
    expect(validateUploadDir(project, 'assets/images')?.en).toContain('resource type folders')
    expect(validateUploadDir(project, 'assets/videos/step-to')?.en).toContain('packages are managed')
    expect(validateUploadDir(project, 'assets/videos/new-package')?.en).toContain('packages are managed')
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
  it('packages files uploaded into the videos folder, whatever their extension', async () => {
    const project = await loadProject()

    const paths = addUploadedFiles(project, 'assets/videos', [nativeFile('step-to.mov'), nativeFile('Intro clip.mkv')])

    expect(paths).toEqual(['assets/videos/step-to2', 'assets/videos/Intro clip'])
    expect(project.videos.map((video) => video.name)).toEqual(['step-to', 'step-to2', 'Intro clip'])
    const exported = project.exportFiles()
    expect(exported['assets/videos/step-to2/index.json']).toBeDefined()
    expect(exported['assets/videos/step-to2/step-to2.mov']).toBeDefined()
    expect(exported['assets/videos/Intro clip/Intro clip.mkv']).toBeDefined()
  })

  it('stores files uploaded elsewhere as plain records, creating folders implicitly', async () => {
    const project = await loadProject()

    const paths = addUploadedFiles(project, normalizeDir('/docs/extra/'), [nativeFile('guide.pdf')])

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
