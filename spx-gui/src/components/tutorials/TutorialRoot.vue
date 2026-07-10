<script lang="ts" setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import { useIsRouteLoaded } from '@/utils/route-loading'

import { isTutorialTopic, provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/context'
import * as staySilent from '@/components/copilot/markdown-elements/StaySilent'
import { stringifyDefinitionId, useCodeEditorRef } from '@/components/xgo-code-editor'
import { editorWorkspaceLayout } from '@/components/editor/workspace-layout'
import * as tutorialCourseSuccess from './TutorialCourseSuccess.vue'
import * as tutorialCourseExitLink from './TutorialCourseExitLink'
import * as tutorialStateIndicator from './TutorialStateIndicator.vue'
import * as apiReferenceFilter from './api-reference-filter'
import * as workspaceHiddenAreas from './workspace-hidden-areas'
import * as spotlightHint from './spotlight-hint'
import * as guideModal from './GuideModal.vue'
import * as apiVideo from './ApiVideo.vue'
import { tutorialCourseAbandonPrediction, tutorialCourseAbandonDismissal } from './tutorial-course-abandon'
import { TutorialAutoPerception } from './tutorial-auto-perception'
import { getApiVideo } from './api-videos'

const i18n = useI18n()
const copilot = useCopilot()
const router = useRouter()
const isRouteLoaded = useIsRouteLoaded()
const codeEditorRef = useCodeEditorRef()

const tutorial = new Tutorial(copilot, router, isRouteLoaded)

// TODO: ensure `RegExp.escape` available & use `RegExp.escape` instead
const tutorialCourseSuccessPattern = new RegExp(`<${tutorialCourseSuccess.tagName.replace('-', '\\-')}\\b`)

watch(
  () => tutorial.currentCourse,
  (currentCourse, _, onCleanup) => {
    if (currentCourse == null) return

    editorWorkspaceLayout.setMode('focused')
    copilot.setUIMode('docked')
    const autoPerception = new TutorialAutoPerception(copilot)
    autoPerception.start()

    const disposers = [
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
      copilot.registerCustomElement({
        tagName: apiReferenceFilter.tagName,
        description: apiReferenceFilter.detailedDescription,
        attributes: apiReferenceFilter.attributes,
        isRaw: apiReferenceFilter.isRaw,
        component: apiReferenceFilter.default
      }),
      copilot.registerCustomElement({
        tagName: workspaceHiddenAreas.tagName,
        description: workspaceHiddenAreas.detailedDescription,
        attributes: workspaceHiddenAreas.attributes,
        isRaw: workspaceHiddenAreas.isRaw,
        component: workspaceHiddenAreas.default
      }),
      copilot.registerCustomElement({
        tagName: staySilent.tagName,
        description: staySilent.detailedDescription,
        attributes: staySilent.attributes,
        isRaw: staySilent.isRaw,
        component: staySilent.default
      }),
      copilot.registerCustomElement({
        tagName: spotlightHint.tagName,
        description: spotlightHint.detailedDescription,
        attributes: spotlightHint.attributes,
        isRaw: spotlightHint.isRaw,
        component: spotlightHint.default
      }),
      copilot.registerCustomElement({
        tagName: guideModal.tagName,
        description: guideModal.detailedDescription,
        attributes: guideModal.attributes,
        isRaw: guideModal.isRaw,
        component: guideModal.default
      }),
      copilot.registerCustomElement({
        tagName: apiVideo.tagName,
        description: apiVideo.getDetailedDescription(),
        attributes: apiVideo.attributes,
        isRaw: apiVideo.isRaw,
        component: apiVideo.default
      }),
      copilot.registerStateIndicatorComponent(tutorialStateIndicator.name, tutorialStateIndicator.default),
      copilot.registerQuickInputProvider({
        provideQuickInput(lastCopilotMessage, topic) {
          if (topic == null || !isTutorialTopic(topic)) return []
          if (lastCopilotMessage?.content != null && tutorialCourseSuccessPattern.test(lastCopilotMessage.content)) {
            return []
          }
          return [
            {
              text: {
                en: 'Next step',
                zh: '下一步'
              },
              message: {
                role: 'user',
                type: 'text',
                content: i18n.t({
                  en: 'I did what you asked. Tell me what to do next.',
                  zh: '我按你说的操作了，接下来该做什么？'
                })
              }
            }
          ]
        }
      })
    ]

    onCleanup(() => {
      autoPerception.stop()
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
