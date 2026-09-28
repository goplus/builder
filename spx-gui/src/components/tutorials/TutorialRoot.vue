<script lang="ts" setup>
import { onUnmounted } from 'vue'
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
onUnmounted(() => tutorial.dispose())
</script>

<template>
  <GuidedTutorialRoot :guided-tutorial="guidedTutorial">
    <slot />
  </GuidedTutorialRoot>
</template>
