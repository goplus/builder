import { beforeEach, describe, expect, it } from 'vitest'
import { timeout } from '@/utils/utils'
import { Copilot, type IMessageEventGenerator } from '@/components/copilot/copilot'
import { InMemorySkillRegistry } from '@/components/copilot/skills/registry'
import type { TutorialTopic } from './tutorial'
import { backThreshold, InterventionLevel, neutralThreshold, TutorialIntervention } from './tutorial-intervention'

function makeTutorialTopic(): TutorialTopic {
  return {
    isTutorialTopic: true,
    title: { en: 'Course', zh: '课程' },
    description: 'Test course',
    reactToEvents: true
  }
}

/** A generator whose single text output can be changed between rounds. */
class ConfigurableGenerator implements IMessageEventGenerator {
  constructor(public text = '') {}
  async *generateCopilotMessage() {
    yield { type: 'text_delta', data: { text: this.text } } as const
    yield { type: 'done', data: { finishReason: 'stop' } } as const
  }
}

// Event rounds added mid-session start with a ~1s debounce (batching).
const eventRoundCompletionTime = 1200

async function sendEvent(copilot: Copilot) {
  copilot.notifyUserEvent({ en: 'Some event', zh: '某事件' }, 'detail')
  await timeout(eventRoundCompletionTime)
}

describe('TutorialIntervention state machine', () => {
  function make() {
    const copilot = new Copilot(new InMemorySkillRegistry(), new ConfigurableGenerator())
    return new TutorialIntervention(copilot)
  }

  it('starts silent', () => {
    expect(make().level).toBe(InterventionLevel.Silent)
  })

  it('escalates after enough neutral rounds', () => {
    const i = make()
    for (let n = 0; n < neutralThreshold - 1; n++) i.recordVerdict('neutral')
    expect(i.level).toBe(InterventionLevel.Silent)
    i.recordVerdict('neutral')
    expect(i.level).toBe(InterventionLevel.Nudge)
  })

  it('escalates faster on back (a stronger signal) than on neutral', () => {
    const i = make()
    for (let n = 0; n < backThreshold - 1; n++) i.recordVerdict('back')
    expect(i.level).toBe(InterventionLevel.Silent)
    i.recordVerdict('back')
    expect(i.level).toBe(InterventionLevel.Nudge)
  })

  it('resets the counters on escalation, so climbing again takes another full run', () => {
    const i = make()
    for (let n = 0; n < backThreshold; n++) i.recordVerdict('back') // -> Nudge, counters cleared
    expect(i.level).toBe(InterventionLevel.Nudge)
    for (let n = 0; n < backThreshold - 1; n++) i.recordVerdict('back')
    expect(i.level).toBe(InterventionLevel.Nudge) // not yet
    i.recordVerdict('back')
    expect(i.level).toBe(InterventionLevel.Guide)
  })

  it('does not climb past guide', () => {
    const i = make()
    for (let n = 0; n < backThreshold * 5; n++) i.recordVerdict('back')
    expect(i.level).toBe(InterventionLevel.Guide)
  })

  it('spends accumulated neutral evidence down with ahead (worth 2)', () => {
    const i = make()
    for (let n = 0; n < neutralThreshold - 1; n++) i.recordVerdict('neutral') // 5 (threshold 6)
    i.recordVerdict('ahead') // -> 3
    i.recordVerdict('neutral') // 4
    i.recordVerdict('neutral') // 5
    expect(i.level).toBe(InterventionLevel.Silent)
    i.recordVerdict('neutral') // 6 -> Nudge
    expect(i.level).toBe(InterventionLevel.Nudge)
  })

  it('de-escalates on an ahead once there is nothing left to forgive', () => {
    const i = make()
    for (let n = 0; n < backThreshold; n++) i.recordVerdict('back') // -> Nudge, counters at 0
    expect(i.level).toBe(InterventionLevel.Nudge)
    i.recordVerdict('ahead') // nothing to forgive -> de-escalate
    expect(i.level).toBe(InterventionLevel.Silent)
  })

  it('does not de-escalate while there is still evidence to forgive first', () => {
    const i = make()
    for (let n = 0; n < backThreshold; n++) i.recordVerdict('back') // -> Nudge, counters 0
    i.recordVerdict('back') // back = 1 at nudge
    i.recordVerdict('ahead') // back was 1, not zero: spend it, do NOT de-escalate
    expect(i.level).toBe(InterventionLevel.Nudge)
    i.recordVerdict('ahead') // now at zero: de-escalate
    expect(i.level).toBe(InterventionLevel.Silent)
  })

  it('never de-escalates below silent', () => {
    const i = make()
    i.recordVerdict('ahead')
    expect(i.level).toBe(InterventionLevel.Silent)
  })
})

describe('TutorialIntervention round scanning', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  async function setup(generatorText: string) {
    const generator = new ConfigurableGenerator(generatorText)
    const copilot = new Copilot(new InMemorySkillRegistry(), generator)
    const intervention = new TutorialIntervention(copilot)
    await copilot.startSession(makeTutorialTopic())
    const dispose = intervention.start()
    return { copilot, intervention, dispose, generator }
  }

  it(
    'reads a reported back verdict from each event round',
    async () => {
      const { copilot, intervention, dispose } = await setup('<user-progress-back />')
      for (let n = 0; n < backThreshold; n++) await sendEvent(copilot)
      expect(intervention.level).toBe(InterventionLevel.Nudge)
      dispose()
    },
    (backThreshold + 2) * eventRoundCompletionTime
  )

  it(
    'defaults an event round with no verdict to neutral',
    async () => {
      const { copilot, intervention, dispose } = await setup('') // model forgot to report
      for (let n = 0; n < neutralThreshold; n++) await sendEvent(copilot)
      expect(intervention.level).toBe(InterventionLevel.Nudge)
      dispose()
    },
    (neutralThreshold + 2) * eventRoundCompletionTime
  )

  it(
    'does not count a typed message that carries no verdict',
    async () => {
      const { copilot, intervention, dispose } = await setup('')
      for (let n = 0; n < neutralThreshold; n++) {
        copilot.currentSession!.addUserMessage({ role: 'user', type: 'text', content: 'hello' })
        await timeout(eventRoundCompletionTime)
      }
      expect(intervention.level).toBe(InterventionLevel.Silent)
      dispose()
    },
    (neutralThreshold + 2) * eventRoundCompletionTime
  )

  it('reports the level as context', async () => {
    const { intervention, dispose } = await setup('')
    expect(intervention.provideContext()).toContain('level is 1 (silent)')
    dispose()
  })

  it('boosts the level to nudge while answering a typed message, then reverts', async () => {
    const { copilot, intervention, dispose } = await setup('')
    expect(intervention.level).toBe(InterventionLevel.Silent)

    copilot.currentSession!.addUserMessage({ role: 'user', type: 'text', content: '我不知道在哪里点运行' })
    // The round has just been added and is not completed yet: the boost is active.
    expect(intervention.level).toBe(InterventionLevel.Nudge)
    expect(intervention.provideContext()).toContain('unlocks the pointing tools')

    await timeout(eventRoundCompletionTime)
    // The round completed: back to the trend-based level.
    expect(intervention.level).toBe(InterventionLevel.Silent)
    dispose()
  })
})
