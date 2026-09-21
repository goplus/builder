import { describe, expect, it } from 'vitest'

import { fromConfig, toText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { configFilePath, TutorialProject } from '@/models/tutorial/project'
import { buildCourseTree, getNodeLabel } from './course-tree'
import { createStarterCourseFiles } from './starter'

/** The smallest SPX project that loads, standing in for the default project the app builds. */
function projectFiles(): Files {
  return { 'assets/index.json': fromConfig('index.json', {}) }
}

describe('createStarterCourseFiles', () => {
  it('produces a course the editor can open', async () => {
    const files = createStarterCourseFiles(projectFiles())

    const project = new TutorialProject()
    await project.loadFiles(files)

    expect(project.config).toEqual({
      project: { type: 'spx', root: 'project' },
      inEditorPath: '',
      copilotContext: ''
    })
    // The tree of a new course: its program, the two resource groups, and the embedded project. Nothing is
    // unclaimed, so there is no heading for records the course does not use.
    expect(buildCourseTree(project).map((node) => getNodeLabel(node).en)).toEqual([
      'Course program',
      'Videos',
      'Pictures',
      'Project'
    ])
  })

  it('starts the author with a program that only uses calls a course can rely on', async () => {
    const files = createStarterCourseFiles(projectFiles())
    const program = await toText(files[mainCourseFilePath]!)

    expect(program).toContain('onStart')
    expect(program).toContain('showMessage')
    expect(program).toContain('completeWith')
    // Calls no host implements yet would make the first Preview fail on a course the author never wrote.
    for (const unsupported of ['showPrelude', 'showVideo', 'filterAPIs', 'Spotlight.', 'Copilot.']) {
      expect(program).not.toContain(unsupported)
    }
  })

  it('gives the learner a project to work in', async () => {
    const files = createStarterCourseFiles(projectFiles())
    const paths = Object.keys(files)

    expect(paths).toContain(configFilePath)
    expect(paths).toContain(mainCourseFilePath)
    expect(paths.some((path) => path.startsWith('project/'))).toBe(true)
  })
})
