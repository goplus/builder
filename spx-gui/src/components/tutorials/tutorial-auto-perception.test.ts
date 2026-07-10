import { beforeEach, describe, expect, it } from 'vitest'
import { timeout } from '@/utils/utils'
import { Copilot, RoundState, type IMessageEventGenerator } from '@/components/copilot/copilot'
import { InMemorySkillRegistry } from '@/components/copilot/skills/registry'
import type { TutorialTopic } from './tutorial'
import {
  TutorialAutoPerception,
  autoPerceptionEventName,
  maxConsecutiveSilentAutoPerceptions
} from './tutorial-auto-perception'

function makeTutorialTopic(): TutorialTopic {
  return {
    isTutorialTopic: true,
    title: { en: 'Course', zh: '课程' },
    description: 'Test course',
    reactToEvents: true
  }
}

/** A generator answering with the queued responses in order (the last one repeats). */
function makeQueueGenerator(responses: string[]): IMessageEventGenerator {
  let i = 0
  return {
    async *generateCopilotMessage() {
      const text = responses[Math.min(i++, responses.length - 1)]
      yield { type: 'text_delta', data: { text } }
      yield { type: 'done', data: { finishReason: 'stop' } }
    }
  }
}

// Event rounds added mid-session start with a ~1s debounce (batching), so waiting for such a
// round to complete needs to cover the debounce plus the (mocked) generation.
const eventRoundCompletionTime = 1200

async function setupCourseSession(responses: string[] = ['<stay-silent />']) {
  const copilot = new Copilot(new InMemorySkillRegistry(), makeQueueGenerator(responses))
  const autoPerception = new TutorialAutoPerception(copilot)
  await copilot.startSession(makeTutorialTopic())
  copilot.notifyUserEvent({ en: 'Course Started', zh: '课程开始' }, 'The course has started')
  await timeout(50) // The first round starts without the debounce
  return { copilot, autoPerception }
}

function rounds(copilot: Copilot) {
  return copilot.currentSession!.rounds
}

/**
 * Wait past the event-round start debounce and until no round is still running, so a tick that
 * added a round is not mistaken for one the hard cap blocked.
 */
async function untilRoundsSettled(copilot: Copilot) {
  await timeout(eventRoundCompletionTime)
  for (let i = 0; i < 20; i++) {
    const lastRound = rounds(copilot).at(-1)
    if (lastRound == null || lastRound.state === RoundState.Completed) return
    await timeout(100)
  }
}

describe('TutorialAutoPerception', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('should send an auto perception when the copilot is idle with nothing on screen', async () => {
    const { copilot, autoPerception } = await setupCourseSession()
    const countBefore = rounds(copilot).length

    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore + 1)
    const userMessage = rounds(copilot).at(-1)!.userMessage
    expect(userMessage.type).toBe('event')
    if (userMessage.type === 'event') {
      expect(userMessage.name.en).toBe(autoPerceptionEventName.en)
    }
  })

  it('should not send while a round is pending or in progress', async () => {
    const { copilot, autoPerception } = await setupCourseSession()
    autoPerception.tick()
    const countBefore = rounds(copilot).length
    autoPerception.tick() // The round from the first tick has not completed yet
    expect(rounds(copilot).length).toBe(countBefore)
  })

  it('should not send while a visible artifact is on screen', async () => {
    const { copilot, autoPerception } = await setupCourseSession()
    const release = copilot.addVisibleArtifact()
    const countBefore = rounds(copilot).length

    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore)

    release()
    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore + 1)
  })

  it('should treat replies of invisible elements only (e.g. course setup) as nothing on screen', async () => {
    const { copilot, autoPerception } = await setupCourseSession([
      '<workspace-hidden-areas areas="editor-panels" />\n<api-reference-filter ids="xgo:x?y#0" />\n<api-video api="xgo:x?y#0" />'
    ])
    copilot.open()
    const countBefore = rounds(copilot).length

    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore + 1)
  })

  it('should not send while the open panel shows a visible reply, and resume once it is collapsed', async () => {
    const { copilot, autoPerception } = await setupCourseSession(['这里是可见的回复内容'])
    copilot.open()
    const countBefore = rounds(copilot).length

    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore)

    copilot.collapse()
    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore + 1)
  })

  // Each perception waits out the event-round start debounce, hence the long timeout
  it(
    'should stop after consecutive silent auto perceptions reach the hard cap',
    { timeout: (maxConsecutiveSilentAutoPerceptions + 6) * eventRoundCompletionTime },
    async () => {
      const { copilot, autoPerception } = await setupCourseSession()

      // Perceive until a tick adds no round, i.e. the cap kicked in. The session trims old
      // rounds, so a new round shows as a new last round rather than a longer list.
      let perceptions = 0
      let lastRound = rounds(copilot).at(-1)
      while (perceptions <= maxConsecutiveSilentAutoPerceptions) {
        autoPerception.tick()
        await untilRoundsSettled(copilot)
        if (rounds(copilot).at(-1) === lastRound) break
        lastRound = rounds(copilot).at(-1)
        perceptions++
      }
      expect(perceptions).toBe(maxConsecutiveSilentAutoPerceptions)

      autoPerception.tick()
      expect(rounds(copilot).at(-1)).toBe(lastRound)

      // Any other user event resets the count and perception resumes
      copilot.notifyUserEvent({ en: 'Project ran', zh: '项目运行' }, 'The user ran the project')
      await untilRoundsSettled(copilot)
      autoPerception.tick()
      await untilRoundsSettled(copilot)
      const resumedRound = rounds(copilot).at(-1)!
      expect(resumedRound).not.toBe(lastRound)
      expect(resumedRound.userMessage).toMatchObject({ type: 'event', name: autoPerceptionEventName })
    }
  )
})
