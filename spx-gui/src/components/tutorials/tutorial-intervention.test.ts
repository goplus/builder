import { beforeEach, describe, expect, it } from 'vitest'
import { timeout } from '@/utils/utils'
import { Copilot, type IMessageEventGenerator } from '@/components/copilot/copilot'
import { InMemorySkillRegistry } from '@/components/copilot/skills/registry'
import type { TutorialTopic } from './tutorial'
import {
  guideThreshold,
  InterventionLevel,
  getInterventionLevel,
  nudgeThreshold,
  TutorialIntervention
} from './tutorial-intervention'

function makeTutorialTopic(): TutorialTopic {
  return {
    isTutorialTopic: true,
    title: { en: 'Course', zh: '课程' },
    description: 'Test course',
    reactToEvents: true
  }
}

function makeGenerator(): IMessageEventGenerator {
  return {
    async *generateCopilotMessage() {
      yield { type: 'text_delta', data: { text: '<stay-silent />' } }
      yield { type: 'done', data: { finishReason: 'stop' } }
    }
  }
}

// Event rounds added mid-session start with a ~1s debounce (batching)
const eventRoundCompletionTime = 1200

async function setupCourseSession() {
  const copilot = new Copilot(new InMemorySkillRegistry(), makeGenerator())
  const intervention = new TutorialIntervention(copilot)
  await copilot.startSession(makeTutorialTopic())
  const dispose = intervention.start()
  return { copilot, intervention, dispose }
}

async function sendEvent(copilot: Copilot) {
  copilot.notifyUserEvent({ en: 'Auto perception', zh: '自动感知' }, 'detail')
  await timeout(eventRoundCompletionTime)
}

describe('getInterventionLevel', () => {
  it('should climb at the thresholds', () => {
    expect(getInterventionLevel(0)).toBe(InterventionLevel.Silent)
    expect(getInterventionLevel(nudgeThreshold - 1)).toBe(InterventionLevel.Silent)
    expect(getInterventionLevel(nudgeThreshold)).toBe(InterventionLevel.Nudge)
    expect(getInterventionLevel(guideThreshold - 1)).toBe(InterventionLevel.Nudge)
    expect(getInterventionLevel(guideThreshold)).toBe(InterventionLevel.Guide)
    expect(getInterventionLevel(guideThreshold + 10)).toBe(InterventionLevel.Guide)
  })
})

describe('TutorialIntervention', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('should start silent and count events', async () => {
    const { copilot, intervention, dispose } = await setupCourseSession()
    expect(intervention.level).toBe(InterventionLevel.Silent)

    await sendEvent(copilot)
    expect(intervention.eventsSinceProgress).toBe(1)
    expect(intervention.level).toBe(InterventionLevel.Silent)
    dispose()
  })

  it('should not count messages the user typed', async () => {
    const { copilot, intervention, dispose } = await setupCourseSession()
    copilot.currentSession!.addUserMessage({ role: 'user', type: 'text', content: 'hello' })
    await timeout(eventRoundCompletionTime)

    expect(intervention.eventsSinceProgress).toBe(0)
    dispose()
  })

  it(
    'should reset the level on reported progress',
    async () => {
      const { copilot, intervention, dispose } = await setupCourseSession()
      for (let i = 0; i < nudgeThreshold; i++) await sendEvent(copilot)
      expect(intervention.level).toBe(InterventionLevel.Nudge)

      intervention.reset()
      expect(intervention.eventsSinceProgress).toBe(0)
      expect(intervention.level).toBe(InterventionLevel.Silent)

      // Counting resumes from the events that follow, not from the whole session history
      await sendEvent(copilot)
      expect(intervention.eventsSinceProgress).toBe(1)
      dispose()
    },
    // Each event round waits out the batching debounce
    (nudgeThreshold + 2) * eventRoundCompletionTime
  )

  it('should report the level as context', async () => {
    const { intervention, dispose } = await setupCourseSession()
    expect(intervention.provideContext()).toContain('level is 1 (silent)')
    dispose()
  })
})
