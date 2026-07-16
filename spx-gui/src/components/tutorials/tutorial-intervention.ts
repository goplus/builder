import { ref, watch } from 'vue'
import type { Disposer } from '@/utils/disposable'
import { RoundState, type Copilot, type ICopilotContextProvider, type Round } from '@/components/copilot/copilot'
import { parseProgressVerdict, type ProgressVerdict } from './user-progress'

/**
 * How strongly the copilot may intervene, decided by how the user's progress has trended. The
 * copilot is restrained by default and earns stronger tools only once the user is demonstrably
 * stuck or drifting.
 */
export enum InterventionLevel {
  /** Observe only: no guidance, let the user explore. */
  Silent = 1,
  /** Nudge: a short hint (guide modal), a spotlight, or an explainer video. */
  Nudge = 2,
  /** Guide: in-editor code hints, i.e. showing what to write and where. */
  Guide = 3
}

const minLevel = InterventionLevel.Silent
const maxLevel = InterventionLevel.Guide

/** Consecutive "no progress" rounds before nudging is allowed. */
export const neutralThreshold = 6
/** ...and consecutive "drifting away" rounds — a stronger signal, so a lower bar. */
export const backThreshold = 3

/**
 * Tracks the user's progress trend and exposes the resulting intervention level to the copilot.
 *
 * The copilot reports one progress verdict per round (ahead / neutral / back); the counting and
 * escalation live here, not in the model — asking the model to track history or do arithmetic is
 * unreliable, while a single per-round judgment is easy for it. `neutral` and `back` accumulate
 * evidence that the user is stuck or drifting; `ahead` spends that evidence down and, once it is
 * gone, backs the guidance off again.
 */
export class TutorialIntervention implements ICopilotContextProvider {
  constructor(private copilot: Copilot) {}

  // The level must survive context truncation and sit near the generation position.
  criticalContext = true

  private neutral = 0
  private back = 0
  private levelRef = ref<InterventionLevel>(InterventionLevel.Silent)

  /**
   * Whether the round being handled is a message the user typed. A direct request for help
   * deserves pointing tools (spotlight, hint modal) even while the trend-based level is still
   * silent — the user asking is not an unsolicited intervention. The boost lasts only for that
   * round; the trend-based level and its counters are untouched.
   */
  private get isAnsweringTypedMessage(): boolean {
    const lastRound = this.copilot.currentSession?.rounds.at(-1)
    return lastRound != null && lastRound.userMessage.type === 'text' && lastRound.state !== RoundState.Completed
  }

  get level(): InterventionLevel {
    const base = this.levelRef.value
    if (this.isAnsweringTypedMessage) return Math.max(base, InterventionLevel.Nudge)
    return base
  }

  private escalate() {
    this.levelRef.value = Math.min(maxLevel, this.levelRef.value + 1)
    // Give the newly unlocked level a fresh window to work before climbing again.
    this.neutral = 0
    this.back = 0
  }

  private deEscalate() {
    this.levelRef.value = Math.max(minLevel, this.levelRef.value - 1)
  }

  /** Apply one progress verdict, updating the counters and the level. */
  recordVerdict(verdict: ProgressVerdict) {
    if (verdict === 'ahead') {
      // An `ahead` while there is nothing left to forgive means the user is clearly on track:
      // back the guidance off a step. Otherwise it just spends down accumulated evidence.
      const nothingToForgive = this.neutral === 0 && this.back === 0
      this.neutral = Math.max(0, this.neutral - 2)
      this.back = Math.max(0, this.back - 1)
      if (nothingToForgive) this.deEscalate()
      return
    }
    if (verdict === 'neutral') this.neutral++
    else this.back++
    if (this.back >= backThreshold || this.neutral >= neutralThreshold) this.escalate()
  }

  reset() {
    this.neutral = 0
    this.back = 0
    this.levelRef.value = InterventionLevel.Silent
    // Skip the rounds so far rather than re-counting them: tracking restarts from what the user
    // does next.
    this.processedRoundCount = this.copilot.currentSession?.rounds.length ?? 0
  }

  /** Rounds already processed, so a round is never counted twice as it settles. */
  private processedRoundCount = 0

  private processSettledRounds(rounds: Round[]) {
    for (let i = this.processedRoundCount; i < rounds.length; i++) {
      const round = rounds[i]
      // Rounds settle in order; wait for an in-progress one instead of skipping past it.
      if (round.state !== RoundState.Completed) return
      this.processedRoundCount = i + 1
      const verdict = this.extractVerdict(round)
      if (verdict != null) {
        this.recordVerdict(verdict)
      } else if (round.userMessage.type === 'event') {
        // The copilot must report a verdict on every event; a missing one defaults to neutral so
        // an inattentive model still lets the user escalate. A typed message with no verdict is a
        // plain request, not evidence of the trajectory — it changes nothing.
        this.recordVerdict('neutral')
      }
    }
  }

  private extractVerdict(round: Round): ProgressVerdict | null {
    const content = round.resultMessages
      .filter((m) => m.role === 'copilot')
      .map((m) => (m.role === 'copilot' ? m.content ?? '' : ''))
      .join('')
    return parseProgressVerdict(content)
  }

  /**
   * Start tracking the current session's rounds. Returns a disposer. Only started while a course
   * is running, so the current session is the course's own.
   */
  start(): Disposer {
    this.reset()
    return watch(
      () => {
        const session = this.copilot.currentSession
        if (session == null) return null
        // Depend on both, so the callback runs as rounds are added and as they settle.
        return [session.rounds, session.rounds.at(-1)?.state] as const
      },
      (value) => {
        if (value == null) return
        this.processSettledRounds(value[0])
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
    const boostNote = this.isAnsweringTypedMessage
      ? '\nThe user addressed you directly, which unlocks the pointing tools for THIS reply regardless of the trend \
— answer their request, pointing at things if that serves it best.'
      : ''
    return `# Intervention level

Your current intervention level is ${this.level} (${levelNames[this.level]}). The system computes this from the \
progress verdicts you report each round — you do NOT track it yourself, just report one verdict per event honestly. \
Your "Available custom elements" list is already filtered to this level: a tag not in that list does nothing, so \
never write one from memory. Do not stay silent when the level expects you to act.${boostNote}`
  }
}
