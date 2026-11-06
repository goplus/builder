import { describe, expect, it } from 'vitest'

import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import { courseViews, getChangedPaths, getDirtyViews, getViewPath, resolveView } from './course-views'

const root = 'project'

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root },
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

describe('resolveView', () => {
  it('opens each view at its own path', () => {
    for (const view of courseViews) {
      const path = getViewPath(view)
      const resolved = resolveView(path)
      expect(resolved.open.view).toBe(view)
      expect(resolved.path).toEqual(path)
    }
  })

  it('hands the rest of a project path to the Project Editor', () => {
    expect(resolveView(['project', 'sprites', 'Lita', 'code'])).toEqual({
      open: { view: 'project' },
      path: ['project', 'sprites', 'Lita', 'code']
    })
  })

  it('normalizes paths within non-project views', () => {
    expect(resolveView(['videos', 'step-to'])).toEqual({ open: { view: 'videos' }, path: ['videos'] })
    expect(resolveView(['program', 'extra'])).toEqual({ open: { view: 'program' }, path: ['program'] })
  })

  it('opens the course settings for an unknown view', () => {
    expect(resolveView(['unknown'])).toEqual({ open: { view: 'course' }, path: [] })
  })
})

describe('unsaved changes', () => {
  it('marks the views whose records changed since the baseline', async () => {
    const project = new TutorialProject()
    await project.loadFiles(makeFiles())
    const baseline = project.exportFiles()

    expect(getChangedPaths(baseline, project.exportFiles()).size).toBe(0)

    project.mainCourse.setCode('onStart => { showVideo "step-to" }')
    project.setConfig({ copilotContext: 'Changed.' })
    project.videos[0].setName('step-back')
    const changed = getChangedPaths(baseline, project.exportFiles())

    expect([...getDirtyViews(changed, root)].sort()).toEqual(['course', 'program', 'videos'])
  })

  it('marks no view for records no view shows', () => {
    const changed = new Set(['notes.md', 'assets/texts/lines/lines.txt'])
    expect(getDirtyViews(changed, root).size).toBe(0)
  })

  it('marks the project for anything under its root', () => {
    expect([...getDirtyViews(new Set(['project/assets/sprites/Lita/index.json']), root)]).toEqual(['project'])
  })
})
