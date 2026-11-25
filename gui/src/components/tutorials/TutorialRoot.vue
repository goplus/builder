<script lang="ts">
import { computed } from 'vue'
import { useUserSessionStorage } from '@/utils/user-storage'

function useStoredID(key: string) {
  const stored = useUserSessionStorage<string | { id: string } | null>(key, null)
  return computed({
    // Older sessions stored the full record or an object containing its ID.
    get: () => {
      const value = stored.value
      if (typeof value === 'string') return value
      return typeof value?.id === 'string' ? value.id : null
    },
    set: (id: string | null) => (stored.value = id)
  })
}

export function useGuidedTutorialStorage() {
  return {
    courseID: useStoredID('spx-gui-tutorial-course'),
    seriesID: useStoredID('spx-gui-tutorial-series')
  }
}
</script>

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
const { courseID, seriesID } = useGuidedTutorialStorage()
const guidedTutorial = new GuidedTutorial(copilot, router, props.routeReadiness, courseID, seriesID)
const tutorial = new Tutorial(guidedTutorial, router)

provideTutorial(tutorial)
</script>

<template>
  <GuidedTutorialRoot :guided-tutorial="guidedTutorial">
    <slot />
  </GuidedTutorialRoot>
</template>
