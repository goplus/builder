<script lang="ts">
/**
 * Course authors can show a one-off text guide before the course starts by embedding a
 * `<course-prelude>` section in the course prompt, e.g.
 * `<course-prelude>先捡3个香蕉，然后再捡其他4个香蕉。</course-prelude>`.
 * Courses without such a section show no guide. The section stays part of the prompt the
 * copilot sees, which is instructed to act consistently with it without repeating it.
 */
export function extractCoursePrelude(prompt: string): string | null {
  const matched = prompt.match(/<course-prelude>([\s\S]*?)<\/course-prelude>/)
  const text = matched?.[1].trim() ?? ''
  return text === '' ? null : text
}
</script>

<script setup lang="ts">
import { UIButton, UIModal } from '@/components/ui'
import MarkdownView from '@/components/copilot/MarkdownView.vue'
import tutorialIllustration from '@/assets/images/tutorial-guide-illustration-v3.svg'

defineProps<{
  visible: boolean
  /** The guide text to show. Markdown — course authors name code in backticks. */
  text: string
}>()

const emit = defineEmits<{
  /** Emitted when the user confirms the guide and the course should continue. */
  continue: []
}>()

function handleContinue() {
  emit('continue')
}
</script>

<template>
  <UIModal
    v-radar="{
      name: 'Tutorial prelude modal',
      desc: 'Modal showing a text guide from the course author before the course starts'
    }"
    :visible="visible"
    size="small"
    class="w-[444px]! rounded-xl! shadow-[0_4px_12px_rgba(36,41,47,0.08)]"
    :mask-closable="false"
    @update:visible="handleContinue"
  >
    <div class="flex flex-col items-center gap-6 p-6">
      <div class="flex w-full flex-col">
        <div class="aspect-[2/1] w-full overflow-hidden">
          <img :src="tutorialIllustration" alt="" class="block size-full object-contain" />
        </div>
        <div class="w-full rounded-lg bg-grey-300 px-6 py-8">
          <!-- The course prompt supplies this text for each opening; Markdown keeps inline code
               snippets styled consistently with the rest of the tutorial UI. -->
          <MarkdownView class="text-base/[1.5]! font-normal text-grey-900" :value="text" />
        </div>
      </div>
      <UIButton
        class="w-full! rounded-lg! bg-(--ui-color-turquoise-500)! text-[15px]/[24px]!"
        size="large"
        @click="handleContinue"
      >
        {{ $t({ en: 'Start', zh: '开始' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
