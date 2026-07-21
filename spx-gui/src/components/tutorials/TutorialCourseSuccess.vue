<script lang="ts">
import { z } from 'zod'

export const tagName = 'tutorial-course-success'

export const isRaw = false

export const detailedDescription = `\
Declare the course complete and show the user a success dialog. Add <${tagName} comment="..." /> to your reply as \
soon as the course's completion criteria are met — the criteria in the course prompt are the only measure; do not \
demand more than they ask for. Use this ONLY for courses whose completion you judge yourself (e.g. "the user sends \
the copilot a message"); a course that completes from the running game signals completion on its own, and you must \
not declare it.

1. Judge the criteria against everything that has happened, including the message you are reading right now. If the \
criteria are "the user sends the copilot a message", then any message the user sends meets them immediately: \
declare success in that same reply instead of asking them to do it again.
2. \`comment\` is a short, friendly sentence in the user's language, shown in the dialog. It is your reply to the \
user: greet them back and praise what they did. For example:
<${tagName} comment="你好呀！你成功给我发了第一条消息，我们是搭档啦！" />
3. Use it once per course. If you already declared success, do not repeat it.`

export const attributes = z.object({
  comment: z.string().optional().describe("Short friendly evaluation of the user's solution, in the user's language")
})
</script>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useTutorial } from './tutorial'

const props = defineProps<{
  /** Short evaluation of the user's solution, from the copilot */
  comment?: string
}>()

const tutorial = useTutorial()

onMounted(() => {
  // Copilot-judged completion: the copilot emits this element when it decides the course's criteria
  // are met. The dialog and teardown are driven by the tutorial's completion state (see
  // TutorialRoot); code-judged courses complete via a runtime sentinel instead and never reach here.
  tutorial.markCourseComplete(props.comment)
})
</script>

<template>
  <slot />
</template>
