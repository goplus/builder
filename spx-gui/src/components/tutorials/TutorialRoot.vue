<script lang="ts" setup>
import { useRouter } from 'vue-router'
import type { ReadinessScope } from '@/utils/readiness'

import { useCopilot } from '@/components/copilot/context'

import { GuidedTutorial } from './guided/guided-tutorial'
import GuidedTutorialRoot from './guided/GuidedTutorialRoot.vue'
import { provideTutorial, Tutorial } from './tutorial'

const props = defineProps<{ routeReadiness: ReadinessScope }>()

const copilot = useCopilot()
const router = useRouter()
const guidedTutorial = new GuidedTutorial(copilot, router, props.routeReadiness)
const tutorial = new Tutorial(guidedTutorial, router)

provideTutorial(tutorial)
</script>

<template>
  <GuidedTutorialRoot :guided-tutorial="guidedTutorial">
    <slot />
  </GuidedTutorialRoot>
</template>
