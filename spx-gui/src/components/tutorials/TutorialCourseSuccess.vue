<script lang="ts">
import { z } from 'zod'
import TutorialCourseSuccessModal from './TutorialCourseSuccessModal.vue'

export const tagName = 'tutorial-course-success'

export const detailedDescription = `
Please add tags to the reply message according to the following rules:
1. Only when the user completes the course, you must add the tag at the end of the reply message: <pre is="tutorial-course-success"></pre>
2. Within the entire conversation context, the <pre is="tutorial-course-success"></pre> tag can only appear once
3. Do not add this tag if the user has not completed the course or is still studying
4. If this tag has been added before, do not repeat it in subsequent replies
5. The tag must be complete and accurate, with no spelling errors or formatting deviations
Please ensure strict compliance with the above rules, only adding this tag once when the user truly completes the course.`

export const attributes = z.object({})
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useTutorial } from './tutorial'
import { useCopilot } from '@/components/copilot/CopilotRoot.vue'
import { useModal } from '@/components/ui'

const tutorial = useTutorial()
const copilot = useCopilot()
const open = useModal(TutorialCourseSuccessModal)

onMounted(() => {
  if (!tutorial.currentCourse || !tutorial.currentSeries) {
    throw new Error('No course or series in progress')
  }
  open({ tutorial, course: tutorial.currentCourse, series: tutorial.currentSeries })
  copilot.close()
  tutorial.endCurrentCourse()
})
</script>

<template>
  <slot />
</template>
