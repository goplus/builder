import { z } from 'zod'
import { defineComponent, onMounted, ref, watch } from 'vue'
import type { Disposer } from '@/utils/disposable'
import {
  RoundState,
  type Copilot,
  type CustomElementDefinition,
  type ICopilotContextProvider,
  type Round
} from '@/components/copilot/copilot'

/**
 * How strongly the copilot may intervene, decided by how many events passed without the user
 * getting back on track. The copilot is restrained by default and earns stronger tools only
 * once the user is demonstrably stuck.
 */
export enum InterventionLevel {
  /** Observe only: no guidance, let the user explore. */
  Silent = 1,
  /** Nudge: a short hint (guide modal), a spotlight, or an explainer video. */
  Nudge = 2,
  /** Guide: in-editor code hints, i.e. showing what to write and where. */
  Guide = 3
}

/** Events without the user getting back on track before nudging is allowed. */
export const nudgeThreshold = 5
/** ...and before in-editor code guides are allowed. */
export const guideThreshold = 8

export function getInterventionLevel(eventsSinceProgress: number): InterventionLevel {
  if (eventsSinceProgress >= guideThreshold) return InterventionLevel.Guide
  if (eventsSinceProgress >= nudgeThreshold) return InterventionLevel.Nudge
  return InterventionLevel.Silent
}

/**
 * Tracks how many events passed without the user getting back on track, and exposes the
 * resulting intervention level to the copilot as context.
 *
 * Counting events (not the copilot's own replies) is what makes escalation possible: an
 * intervention that did not help must not reset the level, or the copilot would oscillate
 * between silence and the same ineffective hint. The count is reset when the copilot reports
 * progress (see the `tutorial-progress` element) or when a course (re)starts.
 */
export class TutorialIntervention implements ICopilotContextProvider {
  constructor(private copilot: Copilot) {}

  private eventsSinceProgressRef = ref(0)
  get eventsSinceProgress() {
    return this.eventsSinceProgressRef.value
  }

  get level(): InterventionLevel {
    return getInterventionLevel(this.eventsSinceProgressRef.value)
  }

  reset() {
    this.eventsSinceProgressRef.value = 0
    // Skip the rounds so far rather than re-counting them: counting restarts from what the
    // user does next.
    this.processedRoundCount = this.copilot.currentSession?.rounds.length ?? 0
  }

  /** Rounds already counted, so a round is never counted twice as it settles. */
  private processedRoundCount = 0

  private countSettledRounds(rounds: Round[]) {
    for (let i = this.processedRoundCount; i < rounds.length; i++) {
      const round = rounds[i]
      // Rounds settle in order; wait for an in-progress one instead of skipping past it
      if (round.state !== RoundState.Completed) return
      this.processedRoundCount = i + 1
      // Only events count as evidence of being stuck. A message the user typed is a request,
      // answered on its own terms, and says nothing about whether they are progressing.
      if (round.userMessage.type === 'event') this.eventsSinceProgressRef.value++
    }
  }

  /**
   * Start tracking the current session's rounds. Returns a disposer. Only started while a
   * course is running, so the current session is the course's own.
   */
  start(): Disposer {
    this.reset()
    return watch(
      () => {
        const session = this.copilot.currentSession
        if (session == null) return null
        // Depend on both, so the callback runs as rounds are added and as they settle
        return [session.rounds, session.rounds.at(-1)?.state] as const
      },
      (value) => {
        if (value == null) return
        this.countSettledRounds(value[0])
      },
      { immediate: true }
    )
  }

  provideContext(): string {
    const levelNames = {
      [InterventionLevel.Silent]: 'silent',
      [InterventionLevel.Nudge]: 'nudge',
      [InterventionLevel.Guide]: 'guide'
    }
    return `# Intervention level

Events observed since the user last made progress: ${this.eventsSinceProgress}.
Your current intervention level is ${this.level} (${levelNames[this.level]}). The course topic describes what each \
level allows. Never use tools above your current level, and do not stay silent when the level tells you to act.`
  }
}

export const tutorialProgressTagName = 'tutorial-progress'

/**
 * Element the copilot emits when the user makes real progress, resetting the intervention level
 * back to silent, so guidance restarts from the gentlest step for the next thing they get stuck on.
 */
export function createTutorialProgressElement(intervention: TutorialIntervention): CustomElementDefinition {
  return {
    tagName: tutorialProgressTagName,
    isRaw: false,
    description: `Report that the user just made real progress toward the course goal (e.g. they wrote the code \
that was missing, or their run got closer to the goal). Add <${tutorialProgressTagName} /> to your reply — it shows \
nothing to the user, and resets your intervention level back to silent so you leave them alone again. Do not use it \
when nothing changed, or you will never be allowed to help a stuck user.`,
    attributes: z.object({}),
    component: defineComponent(
      () => {
        onMounted(() => intervention.reset())
        return function render() {
          return null
        }
      },
      { name: 'TutorialProgress', props: {} }
    )
  }
}
