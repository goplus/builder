/**
 * Copilot setup for the Course Editor: what the assistant is told about the course being authored, and which
 * skill it starts with. The Project Editor does the same for a project (`components/editor/copilot`); when the
 * author opens the embedded project, that subtree mounts and adds its own context, and unmounts with it.
 *
 * Everything here is registered for the lifetime of the calling scope and disposed with it, so a second course
 * opened in the same session never inherits the first one's context.
 *
 * None of it applies while the course is being previewed. The Course Editor stays mounted through a preview, but
 * the Copilot there belongs to the learner's session that the playground runner started, and the whole point of
 * Preview is to see what a learner sees: an assistant told it is helping an author, handed the course program
 * and the authoring skill, is not that. `whileAuthoring` is where that rule lives.
 */

import { onScopeDispose } from 'vue'
import { Disposable } from '@/utils/disposable'
import { useCopilot } from '@/components/copilot/context'
import type { ICopilotContextProvider } from '@/components/copilot/copilot'
import { skillTutorialCourse } from '@/components/copilot/skills/built-in'
import type { TutorialProject } from '@/models/tutorial/project'
import type { OpenView } from '../course-views'

/**
 * How much of the course program is passed as context, in characters. A course program is short by nature (it
 * reacts to events and says a few things), so this only guards against a pathological one crowding out the rest
 * of the context.
 */
const programMaxLength = 20000

/**
 * Wrap a provider so it says nothing while the course is being previewed: the learner's session must see what a
 * learner's would, and nothing of the author's.
 *
 * @param isPreviewing - Whether the editor is showing the preview rather than the editing surface.
 * @param provider - The provider to gate.
 * @returns A provider that delegates while authoring and is silent while previewing.
 *
 * Called by: components/course-editor/copilot/index.ts#useCourseEditorCopilot (for every registration)
 */
function whileAuthoring(isPreviewing: () => boolean, provider: ICopilotContextProvider): ICopilotContextProvider {
  return {
    provideContext: () => (isPreviewing() ? '' : provider.provideContext?.() ?? ''),
    providePreloadSkills: () => (isPreviewing() ? [] : provider.providePreloadSkills?.() ?? [])
  }
}

/**
 * What the author is working on: the course's identity, its settings, and what it carries. Read at the start of
 * every round, so it follows the working copy including unsaved edits.
 */
class CourseContextProvider implements ICopilotContextProvider {
  constructor(private getProject: () => TutorialProject) {}

  provideContext(): string {
    const project = this.getProject()
    const config = project.config
    // Before the course is loaded there is nothing to say about it.
    if (config == null) return ''
    const resources =
      project.resources.length === 0
        ? 'None'
        : project.resources.map((resource) => `${resource.name} (${resource.kind})`).join(', ')
    const copilotContext = config.copilotContext.trim()
    return `# Current course
The user is authoring the Playground Course "${project.title}" (course ${project.id}). \
They are the course author: the Course Editor edits the course itself, not a learner's attempt at it.
Embedded project: type ${config.project.type}, root \`${config.project.root}\`.
Where the learner's editor opens when the course starts: ${config.inEditorPath === '' ? 'not set' : `\`${config.inEditorPath}\``}.
Instructions this course gives the learner's own Copilot: ${copilotContext === '' ? 'none yet' : JSON.stringify(copilotContext)}.
Resources the course program can address by name: ${resources}.
Records kept with the course but unused by it: ${project.extraFiles.size}.`
  }
}

/**
 * The course program as it stands, unsaved edits included. It is the thing the author actually writes, so it is
 * given in full rather than sampled around a cursor.
 */
class CourseProgramContextProvider implements ICopilotContextProvider {
  constructor(private getProject: () => TutorialProject) {}

  provideContext(): string {
    const code = this.getProject().mainCourse.code
    if (code.trim() === '')
      return `# Course program
The course program (\`main_course.gox\`) is still empty.`
    const shown = code.length > programMaxLength ? code.slice(0, programMaxLength) : code
    const note = shown.length < code.length ? ` (first ${programMaxLength} characters of ${code.length})` : ''
    return `# Course program
The course program (\`main_course.gox\`) as it stands now, including unsaved edits${note}:
${JSON.stringify(shown)}`
  }
}

/**
 * Which view of the course the author has open, so the assistant can tell "fix this video's name" from "fix the
 * program".
 */
class OpenViewContextProvider implements ICopilotContextProvider {
  constructor(private getOpen: () => OpenView) {}

  provideContext(): string {
    const open = this.getOpen()
    switch (open.view) {
      case 'course':
        return `# Open view
The author is looking at the course settings.`
      case 'project':
        return `# Open view
The author is working inside the embedded project, which the learner will edit during the course.`
      case 'videos':
        return `# Open view
The author is looking at the course's videos, which the course program plays by name.`
      case 'images':
        return `# Open view
The author is looking at the course's pictures.`
      case 'program':
        return `# Open view
The author is editing the course program.`
    }
  }
}

/**
 * Set up Copilot for the Course Editor: register what it should know about this course and preload the
 * course-authoring skill.
 *
 * @param getProject - The course being edited; read on every round, so it follows the working copy.
 * @param getOpen - The view the author has open, from the route.
 * @param isPreviewing - Whether the editor is previewing the course; everything registered here goes quiet then.
 * @returns Nothing; every registration is disposed with the calling scope.
 *
 * Called by: components/course-editor/CourseEditor.vue (setup)
 */
export function useCourseEditorCopilot(
  getProject: () => TutorialProject,
  getOpen: () => OpenView,
  isPreviewing: () => boolean
): void {
  const d = new Disposable()
  onScopeDispose(() => d.dispose())

  const copilot = useCopilot()

  for (const provider of [
    new CourseContextProvider(getProject),
    new CourseProgramContextProvider(getProject),
    new OpenViewContextProvider(getOpen),
    { providePreloadSkills: () => [skillTutorialCourse] }
  ]) {
    d.addDisposer(copilot.registerContextProvider(whileAuthoring(isPreviewing, provider)))
  }
}
