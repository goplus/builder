<script lang="ts" setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import { useIsRouteLoaded } from '@/utils/route-loading'

import { isTutorialTopic, provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/context'
import { useCodeEditorRef } from '@/components/xgo-code-editor'
import { editorWorkspaceLayout } from '@/components/editor/workspace-layout'
import * as tutorialCourseSuccess from './TutorialCourseSuccess.vue'
import * as tutorialCourseExitLink from './TutorialCourseExitLink'
import * as tutorialStateIndicator from './TutorialStateIndicator.vue'
import * as apiReferenceFilter from './api-reference-filter'
import * as workspaceHiddenAreas from './workspace-hidden-areas'
import { tutorialCourseAbandonPrediction, tutorialCourseAbandonDismissal } from './tutorial-course-abandon'

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
      for (const dispose of disposers) {
        dispose()
      }
      // Reset the API references panel and the workspace layout when leaving the course, so
      // neither the filter nor the focused layout outlives it.
      codeEditorRef.value?.setAPIReferenceFilter(null)
      editorWorkspaceLayout.reset()
    })
  },
  {
    immediate: true
  }
)

provideTutorial(tutorial)
</script>

<template>
  <slot />
</template>
