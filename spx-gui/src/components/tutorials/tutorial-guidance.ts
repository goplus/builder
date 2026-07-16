import { watch } from 'vue'
import type { Disposer } from '@/utils/disposable'
import type { Copilot, CustomElementDefinition } from '@/components/copilot/copilot'
import { editorCopilotCodeGuides } from '@/components/editor/copilot/code-guides-gate'
import { InterventionLevel, type TutorialIntervention } from './tutorial-intervention'
import * as spotlightHint from './spotlight-hint'
import * as guideModal from './GuideModal.vue'
import * as apiVideo from './ApiVideo.vue'

type ElementModule = {
  tagName: string
  isRaw: boolean
  attributes: CustomElementDefinition['attributes']
  default: CustomElementDefinition['component']
  detailedDescription?: string
  getDetailedDescription?: () => string
  invisible?: boolean
}

function toDefinition(m: ElementModule): CustomElementDefinition {
  return {
    tagName: m.tagName,
    description: m.getDetailedDescription != null ? m.getDetailedDescription() : m.detailedDescription!,
    attributes: m.attributes,
    isRaw: m.isRaw,
    component: m.default,
    invisible: m.invisible
  }
}

/**
 * Single source of truth for how strongly the copilot may guide the user at each intervention
 * level. Higher levels are additive — they keep what lower levels unlocked and add more.
 *
 * `elements` are tutorial-owned custom elements, registered/unregistered here. `codeGuides` are
 * the editor-owned in-editor code guides, which this module cannot register (they belong to the
 * editor copilot); it toggles them through the editor's gate instead. Either way, a tool the
 * current level does not unlock is not merely discouraged — the copilot never sees it.
 */
const guidanceByLevel: Record<InterventionLevel, { elements: ElementModule[]; codeGuides: boolean }> = {
  // Observe only: no guiding. api-video stays available — it is an opening-setup & answering tool
  // (course-opening knowledge videos, "how does this API work?"), not an intervention; the
  // protocol restricts its PROACTIVE use to nudge level and above.
  [InterventionLevel.Silent]: { elements: [apiVideo], codeGuides: false },
  // Nudge: short hint modal and spotlight.
  [InterventionLevel.Nudge]: { elements: [guideModal, spotlightHint], codeGuides: false },
  // Guide: additionally, drive concrete edits with the in-editor code guides.
  [InterventionLevel.Guide]: { elements: [], codeGuides: true }
}

const orderedLevels = [InterventionLevel.Silent, InterventionLevel.Nudge, InterventionLevel.Guide]

/**
 * Keep the copilot's available guidance tools in sync with the intervention level, so the level
 * is a hard boundary (unavailable tools are unregistered) rather than a prompt suggestion.
 * Returns a disposer that unregisters everything and resets the editor gate.
 */
export function installTutorialGuidance(copilot: Copilot, intervention: TutorialIntervention): Disposer {
  let elementDisposers: Disposer[] = []

  function apply(level: InterventionLevel) {
    for (const dispose of elementDisposers) dispose()
    elementDisposers = []

    let codeGuides = false
    for (const l of orderedLevels) {
      if (level < l) continue
      for (const el of guidanceByLevel[l].elements) {
        elementDisposers.push(copilot.registerCustomElement(toDefinition(el)))
      }
      codeGuides = codeGuides || guidanceByLevel[l].codeGuides
    }
    editorCopilotCodeGuides.setEnabled(codeGuides)
  }

  const stop = watch(() => intervention.level, apply, { immediate: true })

  return () => {
    stop()
    for (const dispose of elementDisposers) dispose()
    elementDisposers = []
    editorCopilotCodeGuides.reset()
  }
}
