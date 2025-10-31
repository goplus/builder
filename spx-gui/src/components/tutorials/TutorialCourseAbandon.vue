<script lang="ts">
import { z } from 'zod'

export const tagName = 'tutorial-course-abandon'

export const isRaw = false

export const detailedDescription = `
Triggers course abandonment handling logic.
**Usage**:
- Trigger abandonment prediction: <${tagName} type="predicted" />
- Dismiss abandonment prediction: <${tagName} type="dismissed" />
**Constraints**:
- MUST be placed at the **last line** of your message.
- Use at most ONCE per message.
- After dismissing with \`type="dismissed"\`, do NOT use again until next abandonment.
`

export const attributes = z.object({
  type: z.enum(['predicted', 'dismissed']).default('predicted')
})

// Maximum number of consecutive abandonment predictions allowed before automatically ending the course
const maxAbandonCount = 3
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useTutorial } from './tutorial'

const props = withDefaults(
  defineProps<{
    type: 'predicted' | 'dismissed'
  }>(),
  {
    type: 'predicted'
  }
)

const tutorial = useTutorial()

onMounted(async () => {
  if (props.type === 'predicted') {
    const count = tutorial.abandon()
    if (count > maxAbandonCount) {
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
