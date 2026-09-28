import { z } from 'zod'
import { defineComponent } from 'vue'
import type { CustomElementDefinition } from '@/components/copilot/copilot'

/**
 * The copilot's per-round judgment of the user's trajectory toward the course goal. The model
 * reports one of these each round; the system (see `TutorialIntervention`) does the counting and
 * decides the intervention level from them — the model never has to track history or do arithmetic.
 */
export type ProgressVerdict = 'ahead' | 'neutral' | 'back'

export const progressAheadTagName = 'user-progress-ahead'
export const progressNeutralTagName = 'user-progress-neutral'
export const progressBackTagName = 'user-progress-back'

const commonNote = `Judge by what actually CHANGED in the user's code / run relative to last time, not by \
pass-vs-fail. It renders nothing to the user. Emit exactly one progress verdict per event; when no visible \
guidance is due, pair it with <stay-silent /> (never pair <stay-silent /> with anything the user should see).`

function progressElement(tagName: string, description: string, name: string): CustomElementDefinition {
  return {
    tagName,
    isRaw: false,
    invisible: true,
    description,
    attributes: z.object({}),
    component: defineComponent(() => () => null, { name, props: {} })
  }
}

export const progressAhead = progressElement(
  progressAheadTagName,
  `Report that the user moved CLOSER to the course goal this round: their code / run is nearer the correct \
solution than before — even a run that still fails counts if the code is closer (e.g. only a small typo left). \
${commonNote} Reporting progress eases off your guidance.`,
  'UserProgressAhead'
)

export const progressNeutral = progressElement(
  progressNeutralTagName,
  `Report that the user is exploring with no clear change in distance to the goal, or has not done anything \
meaningful yet. Ordinary code errors, stopping a run, or navigating around are all neutral. ${commonNote} This \
verdict paired with <stay-silent /> is the standard silent reply to an event.`,
  'UserProgressNeutral'
)

export const progressBack = progressElement(
  progressBackTagName,
  `Report that the user moved AWAY from the goal: their latest code / run is MORE wrong than before, not merely \
failing. This is a STRONG signal — do NOT use it for ordinary errors or for stopping a run (those are neutral). \
${commonNote} Repeated "back" escalates your guidance the fastest.`,
  'UserProgressBack'
)

export const progressElements = [progressAhead, progressNeutral, progressBack]

const verdictByTag: Array<[string, ProgressVerdict]> = [
  [progressBackTagName, 'back'],
  [progressNeutralTagName, 'neutral'],
  [progressAheadTagName, 'ahead']
]

/**
 * Extract the copilot's progress verdict from a reply's content. When several are present (a
 * mistake — exactly one is expected), the most cautious wins (back > neutral > ahead), so a stray
 * "ahead" never suppresses a reported regression. Returns null when none is present.
 */
export function parseProgressVerdict(content: string): ProgressVerdict | null {
  for (const [tag, verdict] of verdictByTag) {
    if (new RegExp(`<${tag}\\b`).test(content)) return verdict
  }
  return null
}
