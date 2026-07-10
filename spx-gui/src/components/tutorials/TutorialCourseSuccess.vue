<script lang="ts">
import { z } from 'zod'
import { timeout } from '@/utils/utils'
import TutorialCourseSuccessModal from './TutorialCourseSuccessModal.vue'

export const tagName = 'tutorial-course-success'

export const isRaw = false

export const detailedDescription = `\
Declare the course complete and show the user a success dialog. Add <${tagName} comment="..." /> to your reply as \
soon as the course's completion criteria are met — the criteria in the course prompt are the only measure; do not \
demand more than they ask for.

1. Judge the criteria against everything that has happened, including the message you are reading right now. If the \
criteria are "the user sends the copilot a message", then any message the user sends meets them immediately: \
declare success in that same reply instead of asking them to do it again.
2. \`comment\` is a short, friendly sentence in the user's language, shown in the dialog. It is your reply to the \
user: greet them back, praise what they did, and — when the course involved code — add at most one improvement \
suggestion, inviting a retry when it is worth practicing. For example:
<${tagName} comment="你好呀！你成功给我发了第一条消息，我们是搭档啦！" />
<${tagName} comment="很棒！如果用上这节课的 for 循环就更棒了，要再试一次吗？" />
3. Use it once per course. If you already declared success, do not repeat it.`

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
