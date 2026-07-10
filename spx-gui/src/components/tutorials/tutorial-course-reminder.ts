import type { ICopilotContextProvider } from '@/components/copilot/copilot'
import { tagName as tutorialCourseSuccessTagName } from './TutorialCourseSuccess.vue'
import { tagName as workspaceHiddenAreasTagName } from './workspace-hidden-areas'
import { tagName as apiReferenceFilterTagName } from './api-reference-filter'

/**
 * Repeats the two rules the copilot most often forgets, in the context of every round rather
 * than once in the (long) course topic: the model reliably follows them at the point of
 * decision, while it drifts from the same rules stated far away.
 *
 * - Completion is checked every round, or a course whose goal is already met drags on.
 * - Setup elements are re-emitted on later rounds, which crowds out the actual reply.
 */
export const tutorialCourseReminder: ICopilotContextProvider = {
  provideContext() {
    return `# Before you reply

1. Read the course completion criteria (in the course topic) and check them against everything that has happened, \
INCLUDING the message you are reading right now. If they are met, emit \
<${tutorialCourseSuccessTagName} comment="..." /> in THIS reply, with the comment as your reply to the user. Do not \
ask for more than the criteria require, and never tell the user to do something they have already done.
2. The workspace setup you did at the course start is still in effect. Do NOT emit \
<${workspaceHiddenAreasTagName}> or <${apiReferenceFilterTagName}> again. This reply is for the user.`
  }
}
