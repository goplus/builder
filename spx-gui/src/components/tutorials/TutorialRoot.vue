<script lang="ts" setup>
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/CopilotRoot.vue'
import * as tutorialCourseSuccess from './TutorialCourseSuccess.vue'
import * as tutorialCourseExitLink from './TutorialCourseExitLink'
import * as tutorialStateIndicator from './TutorialStateIndicator.vue'

const copilot = useCopilot()
const router = useRouter()

const tutorial = new Tutorial(copilot, router)

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

onUnmounted(copilot.registerStateIndicatorComponent(tutorialStateIndicator.name, tutorialStateIndicator.default))

provideTutorial(tutorial)
</script>

<template>
  <slot />
</template>
