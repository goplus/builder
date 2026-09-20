import { effectScope } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { fromConfig, fromText, type Files } from '@/models/common/file'
import { mainCourseFilePath } from '@/models/tutorial/course'
import { TutorialProject } from '@/models/tutorial/project'
import type { ICopilotContextProvider } from '@/components/copilot/copilot'
import { skillTutorialCourse } from '@/components/copilot/skills/built-in'
import { buildCourseTree, resolveCourseDoc, type CourseDoc } from '../course-tree'
import { useCourseEditorCopilot } from '.'

// The registered providers, captured from the fake Copilot the composable injects.
const { providers } = vi.hoisted(() => ({ providers: [] as ICopilotContextProvider[] }))

vi.mock('@/components/copilot/context', () => ({
  useCopilot: () => ({
    registerContextProvider(provider: ICopilotContextProvider) {
      providers.push(provider)
      return () => {
        const index = providers.indexOf(provider)
        if (index !== -1) providers.splice(index, 1)
      }
    }
  })
}))

function makeFiles(): Files {
  return {
    'index.json': fromConfig('index.json', {
      project: { type: 'spx', root: 'project' },
      inEditorPath: '/sprites/Lita/code',
      copilotContext: 'Help the learner find stepTo.'
    }),
    [mainCourseFilePath]: fromText(mainCourseFilePath, 'onStart => {\n\tshowVideo "step-to"\n}'),
    'project/assets/index.json': fromConfig('index.json', {}),
    'assets/videos/step-to/index.json': fromConfig('index.json', { path: 'step-to.mp4', builder_id: 'video-id' }),
    'assets/videos/step-to/step-to.mp4': fromText('step-to.mp4', 'video'),
    'notes.md': fromText('notes.md', '# notes')
  }
}

async function loadProject() {
  const project = new TutorialProject()
  await project.loadFiles(makeFiles())
  project.setMetadata({ id: '2337', title: 'Move Lita to Mushroom' })
  return project
}

/** Everything the registered providers would put into one round's context. */
function currentContext() {
  return providers
    .map((provider) => provider.provideContext?.() ?? '')
    .filter((context) => context !== '')
    .join('\n\n')
}

/** Every skill the registered providers ask to preload. */
function preloadedSkills() {
  return providers.flatMap((provider) => provider.providePreloadSkills?.() ?? [])
}

/** Run the composable in its own scope, as a mounted `CourseEditor` would. */
function runInScope(project: TutorialProject, doc: () => CourseDoc) {
  const scope = effectScope()
  scope.run(() => useCourseEditorCopilot(() => project, doc))
  return scope
}

describe('useCourseEditorCopilot', () => {
  it('tells the assistant which course this is, what its program says and what is open', async () => {
    const project = await loadProject()
    const tree = buildCourseTree(project)
    const scope = runInScope(project, () => resolveCourseDoc(tree, 'project', mainCourseFilePath))

    const context = currentContext()
    expect(context).toContain('Move Lita to Mushroom')
    expect(context).toContain('/sprites/Lita/code')
    expect(context).toContain('Help the learner find stepTo.')
    // Resources are listed by the name the course program addresses, not by path.
    expect(context).toContain('step-to (videos)')
    expect(context).not.toContain('assets/videos/step-to')
    expect(context).toContain('showVideo')
    expect(context).toContain('The author has "Course program" open.')

    scope.stop()
  })

  it('follows the working copy rather than a snapshot taken at registration', async () => {
    const project = await loadProject()
    const scope = runInScope(project, () => ({ type: 'root' }))

    expect(currentContext()).toContain('looking at the course settings')

    project.mainCourse.setCode('onStart => {\n\tshowMessage "Rewritten."\n}')
    project.setConfig({ inEditorPath: '/stage/code' })

    const context = currentContext()
    expect(context).toContain('Rewritten.')
    expect(context).toContain('/stage/code')

    scope.stop()
  })

  it('starts the assistant with the course-authoring skill', async () => {
    const project = await loadProject()
    const scope = runInScope(project, () => ({ type: 'root' }))

    expect(preloadedSkills()).toEqual([skillTutorialCourse])

    scope.stop()
  })

  it('takes its context away when the editor goes', async () => {
    const project = await loadProject()
    const scope = runInScope(project, () => ({ type: 'root' }))
    expect(providers.length).toBeGreaterThan(0)

    scope.stop()

    expect(providers).toEqual([])
  })
})
