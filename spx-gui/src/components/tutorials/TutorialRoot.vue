<script lang="ts" setup>
import { onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

import { provideTutorial, Tutorial } from './tutorial'

import { useCopilot } from '@/components/copilot/CopilotRoot.vue'
import * as tutorialCourseSuccess from './TutorialCourseSuccess.vue'

const copilot = useCopilot()
const router = useRouter()

const tutorial = new Tutorial(copilot, router)

onUnmounted(
  copilot.registerCustomElement({
    tagName: tutorialCourseSuccess.tagName,
    description: tutorialCourseSuccess.detailedDescription,
    attributes: tutorialCourseSuccess.attributes,
    component: tutorialCourseSuccess.default
  })
)

provideTutorial(tutorial)
</script>

<template>
  <slot />
</template>
