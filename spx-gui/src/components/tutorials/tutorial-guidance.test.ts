import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Copilot } from '@/components/copilot/copilot'
import { InMemorySkillRegistry } from '@/components/copilot/skills/registry'
import { editorCopilotCodeGuides } from '@/components/editor/copilot/code-guides-gate'
import { InterventionLevel } from './tutorial-intervention'
import { installTutorialGuidance } from './tutorial-guidance'
import { tagName as guideModalTagName } from './GuideModal.vue'
import { tagName as spotlightHintTagName } from './spotlight-hint'
import { tagName as apiVideoTagName } from './ApiVideo.vue'

// A minimal intervention stand-in exposing a settable, reactive `level` (a ref-backed getter,
// like the real one), which is all the guidance installer reads.
class FakeIntervention {
  private levelRef = ref<InterventionLevel>(InterventionLevel.Silent)
  get level() {
    return this.levelRef.value
  }
  set level(value: InterventionLevel) {
    this.levelRef.value = value
  }
}

function registeredTags(copilot: Copilot): Set<string> {
  return new Set(copilot.getCustomElements().map((e) => e.tagName))
}

describe('installTutorialGuidance', () => {
  let copilot: Copilot
  let intervention: FakeIntervention
  let dispose: () => void

  beforeEach(() => {
    copilot = new Copilot(new InMemorySkillRegistry())
    intervention = new FakeIntervention()
    dispose = installTutorialGuidance(copilot, intervention as never)
  })

  afterEach(() => {
    dispose()
    editorCopilotCodeGuides.reset()
  })

  it('unlocks no guidance tool at the silent level', () => {
    const tags = registeredTags(copilot)
    expect(tags.has(guideModalTagName)).toBe(false)
    expect(tags.has(spotlightHintTagName)).toBe(false)
    expect(tags.has(apiVideoTagName)).toBe(false)
    expect(editorCopilotCodeGuides.enabled).toBe(false)
  })

  it('unlocks the nudge tools at the nudge level, but not code guides', async () => {
    intervention.level = InterventionLevel.Nudge
    await nextTick()
    const tags = registeredTags(copilot)
    expect(tags.has(guideModalTagName)).toBe(true)
    expect(tags.has(spotlightHintTagName)).toBe(true)
    expect(tags.has(apiVideoTagName)).toBe(true)
    expect(editorCopilotCodeGuides.enabled).toBe(false)
  })

  it('unlocks code guides at the guide level, keeping the nudge tools', async () => {
    intervention.level = InterventionLevel.Guide
    await nextTick()
    const tags = registeredTags(copilot)
    expect(tags.has(guideModalTagName)).toBe(true)
    expect(editorCopilotCodeGuides.enabled).toBe(true)
  })

  it('re-locks tools when the level drops back to silent', async () => {
    intervention.level = InterventionLevel.Guide
    await nextTick()
    intervention.level = InterventionLevel.Silent
    await nextTick()
    const tags = registeredTags(copilot)
    expect(tags.has(guideModalTagName)).toBe(false)
    expect(editorCopilotCodeGuides.enabled).toBe(false)
  })

  it('unregisters everything and resets the gate on dispose', async () => {
    intervention.level = InterventionLevel.Guide
    await nextTick()
    dispose()
    const tags = registeredTags(copilot)
    expect(tags.has(guideModalTagName)).toBe(false)
    expect(editorCopilotCodeGuides.enabled).toBe(true) // reset() restores the default
  })
})
