<!-- Shown when a course's primary goal (the runtime signal) is met but its secondary goal (the way
     the learner was meant to get there) is not. It is deliberately not a failure notice: the run
     did work, and saying so is what makes the remaining ask land as the actual lesson rather than
     as a rejection. -->
<script lang="ts" setup>
import type { Tutorial } from './tutorial'
import TutorialCourseReminderModal from './TutorialCourseReminderModal.vue'
import MarkdownView from '@/components/copilot/MarkdownView.vue'

defineProps<{
  visible: boolean
  /** The course-authored line naming what is still missing. Rendered as Markdown, so a hint can
   * name the code it is asking for the way the rest of the app writes code. */
  hint: string
  tutorial: Tutorial
}>()

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <TutorialCourseReminderModal :visible="visible" @close="emit('close')">
    <p class="text-base/[1.5] font-normal text-grey-900">
      {{ $t({ en: 'Almost there!', zh: '就差一点！' }) }}
    </p>
    <p class="text-base/[1.5] font-normal text-grey-900">
      {{ $t({ en: 'Your program reached the goal.', zh: '你的程序已经达成目标了。' }) }}
    </p>
    <MarkdownView v-if="hint !== ''" class="text-base/[1.5]! font-normal text-grey-900" :value="hint" />
  </TutorialCourseReminderModal>
</template>
