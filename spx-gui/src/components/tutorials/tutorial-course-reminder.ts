import type { ICopilotContextProvider } from '@/components/copilot/copilot'
import { tagName as tutorialCourseSuccessTagName } from './TutorialCourseSuccess.vue'

/**
 * Repeats the rule the copilot most often forgets, in the context of every round rather than
 * once in the (long) course topic: the model reliably follows it at the point of decision, while
 * it drifts from the same rule stated far away. Without this, a course whose goal is already met
 * drags on, telling the user to do what they have just done.
 */
export const tutorialCourseReminder: ICopilotContextProvider = {
  provideContext() {
    return `# Before you reply

Read the course completion criteria (in the course topic) and check them against everything that has happened, \
INCLUDING the message you are reading right now. If they are met, emit \
<${tutorialCourseSuccessTagName} comment="..." /> in THIS reply, with the comment as your reply to the user. Do not \
ask for more than the criteria require, and never tell the user to do something they have already done.`
  }
}
