<script lang="ts" setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIsRouteLoaded } from '@/utils/route-loading'

import { provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/context'
import * as staySilent from '@/components/copilot/markdown-elements/StaySilent'
import { stringifyDefinitionId, useCodeEditorRef } from '@/components/xgo-code-editor'
import { editorWorkspaceLayout } from '@/components/editor/workspace-layout'
import { extractCourseConfig } from './course-config'
import * as tutorialCourseSuccess from './TutorialCourseSuccess.vue'
import * as tutorialCourseExitLink from './TutorialCourseExitLink'
import * as tutorialStateIndicator from './TutorialStateIndicator.vue'
import * as apiReferenceFilter from './api-reference-filter'
import { tutorialCourseAbandonPrediction, tutorialCourseAbandonDismissal } from './tutorial-course-abandon'
import { TutorialIntervention } from './tutorial-intervention'
import { progressElements } from './user-progress'
import { installTutorialGuidance } from './tutorial-guidance'
import { tutorialCourseReminder } from './tutorial-course-reminder'
import { getApiVideo } from './api-videos'

const copilot = useCopilot()
const router = useRouter()
const isRouteLoaded = useIsRouteLoaded()
const codeEditorRef = useCodeEditorRef()

const tutorial = new Tutorial(copilot, router, isRouteLoaded)

watch(
  () => tutorial.currentCourse,
  (currentCourse, _, onCleanup) => {
    if (currentCourse == null) return

    // The course author declares the workspace setup statically (see `extractCourseConfig`); it is
    // applied once here, not driven by the copilot at runtime.
    const courseConfig = extractCourseConfig(currentCourse.prompt)
    editorWorkspaceLayout.setMode('focused')
    editorWorkspaceLayout.setHiddenAreas(courseConfig.hiddenAreas)
    copilot.setUIMode('docked')
    const intervention = new TutorialIntervention(copilot)

    const disposers = [
      intervention.start(),
      // Registers the guidance elements (guide modal, spotlight, video) and toggles the editor
      // code guides according to the intervention level — a hard boundary on what the copilot
      // may do at each level.
      installTutorialGuidance(copilot, intervention),
      copilot.registerContextProvider(intervention),
      copilot.registerContextProvider(tutorialCourseReminder),
      // The per-round progress verdicts drive the intervention level; available at every level,
      // since the copilot must report one on every event.
      ...progressElements.map((el) => copilot.registerCustomElement(el)),
      copilot.registerCustomElement({
        tagName: tutorialCourseSuccess.tagName,
        description: tutorialCourseSuccess.detailedDescription,
        attributes: tutorialCourseSuccess.attributes,
        isRaw: tutorialCourseSuccess.isRaw,
        component: tutorialCourseSuccess.default
      }),
      copilot.registerCustomElement({
        tagName: tutorialCourseExitLink.tagName,
        description: tutorialCourseExitLink.description,
        attributes: tutorialCourseExitLink.attributes,
        isRaw: tutorialCourseExitLink.isRaw,
        component: tutorialCourseExitLink.default
      }),
      copilot.registerCustomElement(tutorialCourseAbandonPrediction),
      copilot.registerCustomElement(tutorialCourseAbandonDismissal),
      // The API-references panel is narrowed by the copilot (a course-opening setup, always
      // available — not gated by the intervention level, which only gates guidance tools).
      copilot.registerCustomElement({
        tagName: apiReferenceFilter.tagName,
        description: apiReferenceFilter.detailedDescription,
        attributes: apiReferenceFilter.attributes,
        isRaw: apiReferenceFilter.isRaw,
        component: apiReferenceFilter.default,
        invisible: true
      }),
      copilot.registerCustomElement({
        tagName: staySilent.tagName,
        description: staySilent.detailedDescription,
        attributes: staySilent.attributes,
        isRaw: staySilent.isRaw,
        component: staySilent.default
      }),
      copilot.registerStateIndicatorComponent(tutorialStateIndicator.name, tutorialStateIndicator.default)
    ]

    onCleanup(() => {
      for (const dispose of disposers) {
        dispose()
      }
      // Reset the API references panel, the workspace layout and the copilot presentation
      // when leaving the course, so none of them outlives it.
      codeEditorRef.value?.setAPIReferenceFilter(null)
      editorWorkspaceLayout.reset()
      copilot.setUIMode('floating')
    })
  },
  {
    immediate: true
  }
)

// During a course, API reference items show their explainer video in the hover card. Watched
// together with the editor ref since the editor may mount after the course starts.
watch(
  [() => tutorial.currentCourse, codeEditorRef],
  ([currentCourse, codeEditor]) => {
    if (codeEditor == null) return
    codeEditor.setAPIReferenceVideoProvider(
      currentCourse != null ? (item) => getApiVideo(stringifyDefinitionId(item.definition)) : null
    )
  },
  { immediate: true }
)

provideTutorial(tutorial)
</script>

<template>
  <slot />
</template>
