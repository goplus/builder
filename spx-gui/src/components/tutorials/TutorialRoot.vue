<script lang="ts" setup>
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIsRouteLoaded } from '@/utils/route-loading'

import { useCopilot } from '@/components/copilot/context'

import { GuidedTutorial } from './guided/guided-tutorial'
import GuidedTutorialRoot from './guided/GuidedTutorialRoot.vue'
import { provideTutorial, Tutorial } from './tutorial'

const copilot = useCopilot()
const router = useRouter()
const isRouteLoaded = useIsRouteLoaded()

const guidedTutorial = new GuidedTutorial(copilot, router, isRouteLoaded)
const tutorial = new Tutorial(guidedTutorial, router)

provideTutorial(tutorial)

watch(
  () => [guidedTutorial.currentCourse, guidedTutorial.currentSeries] as const,
  ([course, series]) => {
    if (course == null || series == null) {
      tutorial.clearCourseKind('guided')
      return
    }
    tutorial.setCurrentCourse(course, series)
  },
  { immediate: true }
)
</script>

<template>
  <GuidedTutorialRoot :guided-tutorial="guidedTutorial">
    <slot />
  </GuidedTutorialRoot>
</template>
