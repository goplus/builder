<script lang="ts">
import { z } from 'zod'
import { timeout } from '@/utils/utils'

export const tagName = 'tutorial-course-abandon'

export const isRaw = false

export const detailedDescription = `
If and only if **Course Abandonment** has been detected and the system is currently executing the **Mandatory Course Termination (Prediction Confirmation)** phase of the \`escalation protocol\`:
1. You **must** terminate the course and append the system tag to the *very end* of your final message.
2. The required tag is: <${tagName} />
`

export const attributes = z.object({})
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useTutorial } from './tutorial'
import { useCopilot } from '@/components/copilot/CopilotRoot.vue'

const tutorial = useTutorial()
const copilot = useCopilot()

onMounted(async () => {
  if (!tutorial.currentCourse || !tutorial.currentSeries) {
    throw new Error('No course or series in progress')
  }
  await timeout(500)
  copilot.close()
  tutorial.endCurrentCourse()
})
</script>

<template>
  <slot />
</template>
