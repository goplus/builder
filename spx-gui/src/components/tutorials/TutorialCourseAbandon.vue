<script lang="ts">
import { z } from 'zod'

export const tagName = 'tutorial-course-abandon'

export const isRaw = false

export const detailedDescription = `
Triggers course abandonment handling logic.
**Usage**:
- Trigger abandonment: <${tagName} type="abandon" />
- Dismiss abandonment: <${tagName} type="resume" />
**Constraints**:
- MUST be placed at the **last line** of your message.
- Use at most ONCE per message.
- After dismissing with \`type="resume"\`, do NOT use again until next abandonment.
`

export const attributes = z.object({
  type: z.enum(['abandon', 'resume']).default('abandon')
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
    type?: 'abandon' | 'resume'
  }>(),
  {
    type: 'abandon'
  }
)

const copilot = useCopilot()
const tutorial = useTutorial()

onMounted(async () => {
  if (props.type === 'abandon') {
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
