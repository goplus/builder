import type { ICopilotContextProvider } from '@/components/copilot/copilot'
import { tagName as staySilentTagName } from '@/components/copilot/markdown-elements/StaySilent'
import { tagName as tutorialCourseSuccessTagName } from './TutorialCourseSuccess.vue'
import { tagName as apiReferenceFilterTagName } from './api-reference-filter'
import { progressAheadTagName, progressBackTagName, progressNeutralTagName } from './user-progress'

/**
 * Repeats the rules the copilot most often forgets, in the context of every round rather than
 * once in the (long) course topic: the model reliably follows them at the point of decision,
 * while it drifts from the same rules stated far away.
 *
 * - Completion is checked every round, or a course whose goal is already met drags on.
 * - The per-event progress verdict is skipped, starving the intervention-level tracking.
 * - The API narrowing is re-emitted on later rounds, which crowds out the actual reply.
 */
export const tutorialCourseReminder: ICopilotContextProvider = {
  // Per-round rules must survive context truncation and sit near the generation position.
  criticalContext: true,
  provideContext() {
    return `# Before you reply

1. Read the course completion criteria (in the course topic) and check them against everything that has happened, \
INCLUDING the message you are reading right now. If they are met, emit \
<${tutorialCourseSuccessTagName} comment="..." /> in THIS reply, with the comment as your reply to the user. Do not \
ask for more than the criteria require, and never tell the user to do something they have already done.
2. If this message is an <event>, include exactly one progress verdict (<${progressAheadTagName} />, \
<${progressNeutralTagName} /> or <${progressBackTagName} />); pair it with <${staySilentTagName} /> when the reply \
shows the user nothing, and NEVER include <${staySilentTagName}> when it does.
3. The API narrowing you set at the course start is still in effect. Do NOT emit <${apiReferenceFilterTagName}> \
again unless a step genuinely needs a DIFFERENT set of APIs.
4. If your reply has any visible text, keep it to ONE short sentence — no goal restatement, no quoting the user's \
code, no recap, no emoji.`
  }
}
