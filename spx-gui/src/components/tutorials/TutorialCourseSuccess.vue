<script lang="ts">
import { z } from 'zod'
import { timeout } from '@/utils/utils'
import TutorialCourseSuccessModal from './TutorialCourseSuccessModal.vue'

export const tagName = 'tutorial-course-success'

export const isRaw = false

export const detailedDescription = `
Please add tags to the reply message according to the following rules:
1. Only when the user completes the course, you must add the tag at the end of the reply message: <tutorial-course-success />
2. Within the entire conversation context, the <tutorial-course-success /> tag can only appear once
3. Do not add this tag if the user has not completed the course or is still studying
4. If this tag has been added before, do not repeat it in subsequent replies
5. The tag must be complete and accurate, with no spelling errors or formatting deviations
6. You may add a short, friendly \`comment\` attribute (in the user's language) evaluating how the user solved the course, based on their actual code — praise first, then at most one improvement suggestion, and invite a retry when the suggestion is worth practicing. For example: <tutorial-course-success comment="很棒！如果用上这节课的 for 循环就更棒了，要再试一次吗？" />
Please ensure strict compliance with the above rules, only adding this tag once when the user truly completes the course.`

export const attributes = z.object({
  comment: z.string().optional().describe("Short friendly evaluation of the user's solution, in the user's language")
})
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useTutorial } from './tutorial'
import { useCopilot } from '@/components/copilot/context'
import { useModal } from '@/components/ui'

const props = defineProps<{
  /** Short evaluation of the user's solution, from the copilot */
  comment?: string
}>()

const tutorial = useTutorial()
const copilot = useCopilot()
const open = useModal(TutorialCourseSuccessModal)

onMounted(async () => {
  if (!tutorial.currentCourse || !tutorial.currentSeries) {
    throw new Error('No course or series in progress')
  }
  await timeout(500)
  open({
    tutorial,
    course: tutorial.currentCourse,
    series: tutorial.currentSeries,
    comment: props.comment ?? null
  })
  copilot.close()
  tutorial.endCurrentCourse()
})
</script>

<template>
  <slot />
</template>
