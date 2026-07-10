import { beforeEach, describe, expect, it } from 'vitest'
import { timeout } from '@/utils/utils'
import { Copilot, type IMessageEventGenerator } from '@/components/copilot/copilot'
import { InMemorySkillRegistry } from '@/components/copilot/skills/registry'
import type { TutorialTopic } from './tutorial'
import { TutorialAutoPerception, autoPerceptionEventName } from './tutorial-auto-perception'

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

  // The waits below cover the event-round start debounce several times, hence the long timeout
  it('should stop after consecutive silent auto perceptions reach the hard cap', { timeout: 15000 }, async () => {
    const { copilot, autoPerception } = await setupCourseSession()
    for (let i = 0; i < 4; i++) {
      autoPerception.tick()
      await timeout(eventRoundCompletionTime)
    }
    const countBefore = rounds(copilot).length

    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore)

    // Any other user event resets the count and perception resumes
    copilot.notifyUserEvent({ en: 'Project ran', zh: '项目运行' }, 'The user ran the project')
    await timeout(eventRoundCompletionTime)
    autoPerception.tick()
    expect(rounds(copilot).length).toBe(countBefore + 2)
  })
})
