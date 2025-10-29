<script lang="ts">
import { z } from 'zod'

export const tagName = 'tutorial-course-abandon'

export const isRaw = false

export const detailedDescription = `
Triggers course abandonment handling logic.
**Usage**:
- Trigger abandonment: <${tagName} abandon />
- Dismiss abandonment: <${tagName} :abandon="false" />
**Constraints**:
- MUST be placed at the **last line** of your message.
- Use at most ONCE per message.
- After dismissing with \`:abandon="false"\`, do NOT use again until next abandonment.
`

export const attributes = z.object({
  abandon: z.boolean().optional().default(false)
})

// Maximum number of abandonment events before automatically ending the course
const maxAbandonCount = 3
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useCopilot } from '@/components/copilot/CopilotRoot.vue'

import { useTutorial } from './tutorial'

const props = withDefaults(
  defineProps<{
    abandon?: boolean
  }>(),
  {
    abandon: false
  }
)

const copilot = useCopilot()
const tutorial = useTutorial()

onMounted(async () => {
  if (props.abandon) {
    const count = tutorial.abandon()
    if (count > maxAbandonCount) {
      copilot.close()
      tutorial.endCurrentCourse()
    }
  } else {
    tutorial.dismissAbandon()
  }
})
</script>

<template>
  <slot />
</template>

<style lang="scss" scoped></style>
