<script lang="ts" setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIsRouteLoaded } from '@/utils/route-loading'

import { useCopilot } from '@/components/copilot/context'

import { GuidedTutorial } from './guided/guided-tutorial'
import GuidedTutorialRoot from './guided/GuidedTutorialRoot.vue'
import { provideTutorial, Tutorial } from './tutorial'
import { provideTutorialStatus, TutorialStatus } from './status'

const copilot = useCopilot()
const router = useRouter()
const isRouteLoaded = useIsRouteLoaded()

const guidedTutorial = new GuidedTutorial(copilot, router, isRouteLoaded)
const tutorial = new Tutorial(guidedTutorial, router)
const tutorialStatus = new TutorialStatus()

provideTutorial(tutorial)
provideTutorialStatus(tutorialStatus)

watch(
  () => [guidedTutorial.currentCourse, guidedTutorial.currentSeries] as const,
  ([course, series]) => {
    if (course == null || series == null) {
      tutorialStatus.clearCourseKind('guided')
      return
    }
    tutorialStatus.setCurrentCourse(course, series)
  },
  { immediate: true }
)
</script>

<template>
  <GuidedTutorialRoot :guided-tutorial="guidedTutorial">
    <slot />
  </GuidedTutorialRoot>
</template>
