import { onScopeDispose } from 'vue'
import { Disposable } from '@/utils/disposable'
import { useCopilot } from '@/components/copilot/context'
import type { ICopilotContextProvider } from '@/components/copilot/copilot'
import { skillTutorialCourse } from '@/components/copilot/skills/built-in'
import type { TutorialProject } from '@/models/tutorial/project'
import type { OpenView } from '../course-views'

/**
 * How many characters of the course program are passed as context. A course program is short by nature, so this
 * only guards against a pathological one crowding out the rest of the context.
 */
const programMaxLength = 20000

/**
 * Silence a provider while the course is being previewed. The Course Editor stays mounted through a preview, but
 * the Copilot there belongs to the learner's session, which must see what a learner would and nothing of the author's.
 */
function whileAuthoring(isPreviewing: () => boolean, provider: ICopilotContextProvider): ICopilotContextProvider {
  return {
    provideContext: () => (isPreviewing() ? '' : provider.provideContext?.() ?? ''),
    providePreloadSkills: () => (isPreviewing() ? [] : provider.providePreloadSkills?.() ?? [])
  }
}

class CourseContextProvider implements ICopilotContextProvider {
  constructor(private getProject: () => TutorialProject) {}

  provideContext(): string {
    const project = this.getProject()
    const config = project.config
    if (config == null) return ''
    const videos = project.videos.length === 0 ? 'None' : project.videos.map((video) => video.name).join(', ')
    const copilotContext = config.copilotContext.trim()
    return `# Current course
The user is authoring the Playground Course "${project.title}" (course ${project.id}). \
They are the course author: the Course Editor edits the course itself, not a learner's attempt at it.
Embedded project: type ${config.project.type}, root \`${config.project.root}\`.
Where the learner's editor opens when the course starts: ${config.inEditorPath === '' ? 'not set' : `\`${config.inEditorPath}\``}.
Instructions this course gives the learner's own Copilot: ${copilotContext === '' ? 'none yet' : JSON.stringify(copilotContext)}.
Videos the course program can play by name: ${videos}.`
  }
}

/** The course program is what the author actually writes, so it is given in full rather than sampled around a cursor. */
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

/** Tell Copilot about the course being authored and preload the course-authoring skill, for the calling scope. */
export function useCourseEditorCopilot(
  getProject: () => TutorialProject,
  getOpen: () => OpenView,
  /** Everything registered here goes quiet while this returns true. */
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
