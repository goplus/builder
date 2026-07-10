import type { LocaleMessage } from '@/utils/i18n'
import { RoundState, type Copilot, type Round } from '@/components/copilot/copilot'
import { isSilentContent } from '@/components/copilot/markdown-elements/StaySilent'
import { isTutorialTopic } from './tutorial'

export const autoPerceptionEventName: LocaleMessage = { en: 'Auto perception', zh: '自动感知' }

const autoPerceptionInterval = 5000

/**
 * Stop sending further auto perceptions after this many consecutive silent ones. The copilot
 * is instructed to give a hint on the 3rd; this guards against it disobeying, so an inactive
 * user cannot cause an endless stream of perception rounds. Any other user event or message
 * naturally resets the count.
 */
const maxConsecutiveSilentAutoPerceptions = 4

function isAutoPerceptionRound(round: Round): boolean {
  const userMessage = round.userMessage
  return userMessage.type === 'event' && userMessage.name.en === autoPerceptionEventName.en
}

/** Whether the round completed with no user-visible copilot output. */
function isSilentRound(round: Round): boolean {
  if (round.state !== RoundState.Completed) return false
  const content = round.resultMessages
    .filter((m) => m.role === 'copilot')
    .map((m) => m.content ?? '')
    .join('')
  return isSilentContent(content)
}

/**
 * Periodically sends an "Auto perception" event to the copilot while nothing of the copilot
 * is on screen, so it can observe the latest editor state (and, per the course protocol,
 * intervene when the user has been stuck across several perceptions).
 */
export class TutorialAutoPerception {
  constructor(private copilot: Copilot) {}

  private timer: ReturnType<typeof setInterval> | null = null

  start() {
    if (this.timer != null) return
    this.timer = setInterval(() => this.tick(), autoPerceptionInterval)
  }

  stop() {
    if (this.timer == null) return
    clearInterval(this.timer)
    this.timer = null
  }

  /** Number of trailing consecutive rounds that are silent auto perceptions. */
  private getConsecutiveSilentCount(rounds: Round[]): number {
    let count = 0
    for (let i = rounds.length - 1; i >= 0; i--) {
      const round = rounds[i]
      if (!isAutoPerceptionRound(round) || !isSilentRound(round)) break
      count++
    }
    return count
  }

  tick() {
    // No perception while the user is away — it would burn rounds nobody sees
    if (document.visibilityState === 'hidden') return

    const copilot = this.copilot
    const session = copilot.currentSession
    if (session == null || !isTutorialTopic(session.topic)) return

    const lastRound = session.rounds.at(-1)
    // Wait for the course-start round; never race an in-progress round or loop on a failure
    if (lastRound == null || lastRound.state !== RoundState.Completed) return

    // Something of the copilot is on screen: a guidance modal / video / in-editor guide...
    if (copilot.hasVisibleArtifacts) return
    // ...or a visible reply in the open panel (the user closing the panel resumes perception)
    if (copilot.active && !isSilentRound(lastRound)) return

    const silentCount = this.getConsecutiveSilentCount(session.rounds)
    if (silentCount >= maxConsecutiveSilentAutoPerceptions) return

    copilot.notifyUserEvent(
      autoPerceptionEventName,
      `Nothing of yours is on screen. Observe the current editor state. \
Consecutive auto perceptions without visible action so far: ${silentCount}.`,
      { autoOpen: false }
    )
  }
}
