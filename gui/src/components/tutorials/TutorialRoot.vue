<script lang="ts" setup>
import { useRouter } from 'vue-router'
import type { ReadinessScope } from '@/utils/readiness'
import { useUserSessionStorage } from '@/utils/user-storage'
import type { GuidedCourse } from '@/apis/course'
import type { CourseSeries } from '@/apis/course-series'

import { useCopilot } from '@/components/copilot/context'

import { GuidedTutorial } from './guided/guided-tutorial'
import GuidedTutorialRoot from './guided/GuidedTutorialRoot.vue'
import { provideTutorial, Tutorial } from './tutorial'

const props = defineProps<{ routeReadiness: ReadinessScope }>()

const copilot = useCopilot()
const router = useRouter()
const course = useUserSessionStorage<Pick<GuidedCourse, 'id'> | null>('spx-gui-tutorial-course', null)
const series = useUserSessionStorage<Pick<CourseSeries, 'id'> | null>('spx-gui-tutorial-series', null)
const guidedTutorial = new GuidedTutorial(copilot, router, props.routeReadiness, course, series)
const tutorial = new Tutorial(guidedTutorial, router)

provideTutorial(tutorial)
</script>

<template>
  <GuidedTutorialRoot :guided-tutorial="guidedTutorial">
    <slot />
  </GuidedTutorialRoot>
</template>
