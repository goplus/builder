<script lang="ts" setup>
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/utils/i18n'
import { useIsRouteLoaded } from '@/utils/route-loading'

import { isTutorialTopic, provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/CopilotRoot.vue'
import * as tutorialCourseSuccess from './TutorialCourseSuccess.vue'
import * as tutorialCourseExitLink from './TutorialCourseExitLink'
import * as tutorialStateIndicator from './TutorialStateIndicator.vue'
import * as tutorialCourseAbandon from './TutorialCourseAbandon.vue'

const i18n = useI18n()
const copilot = useCopilot()
const router = useRouter()
const isRouteLoaded = useIsRouteLoaded()

const tutorial = new Tutorial(copilot, router, isRouteLoaded)

onUnmounted(
  copilot.registerCustomElement({
    tagName: tutorialCourseSuccess.tagName,
    description: tutorialCourseSuccess.detailedDescription,
    attributes: tutorialCourseSuccess.attributes,
    isRaw: tutorialCourseSuccess.isRaw,
    component: tutorialCourseSuccess.default
  })
)

onUnmounted(
  copilot.registerCustomElement({
    tagName: tutorialCourseExitLink.tagName,
    description: tutorialCourseExitLink.description,
    attributes: tutorialCourseExitLink.attributes,
    isRaw: tutorialCourseExitLink.isRaw,
    component: tutorialCourseExitLink.default
  })
)

onUnmounted(
  copilot.registerCustomElement({
    tagName: tutorialCourseAbandon.tagName,
    description: tutorialCourseAbandon.detailedDescription,
    attributes: tutorialCourseAbandon.attributes,
    isRaw: tutorialCourseAbandon.isRaw,
    component: tutorialCourseAbandon.default
  })
)

onUnmounted(copilot.registerStateIndicatorComponent(tutorialStateIndicator.name, tutorialStateIndicator.default))

// TODO: ensure `RegExp.escape` available & use `RegExp.escape` instead
const tutorialCourseSuccessPattern = new RegExp(`<${tutorialCourseSuccess.tagName.replace('-', '\\-')}\\b`)

onUnmounted(
  copilot.registerQuickInputProvider({
    provideQuickInput(lastCopilotMessage, topic) {
      if (topic == null || !isTutorialTopic(topic)) return []
      if (lastCopilotMessage != null && tutorialCourseSuccessPattern.test(lastCopilotMessage.content)) return []
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
)

provideTutorial(tutorial)
</script>

<template>
  <slot />
</template>
