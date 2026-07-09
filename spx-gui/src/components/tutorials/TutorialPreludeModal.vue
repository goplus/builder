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

defineProps<{
  visible: boolean
  /** The guide text to show. */
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
    mask-closable
    @update:visible="handleContinue"
  >
    <div class="flex flex-col items-center px-8 pb-6 pt-8">
      <p class="whitespace-pre-wrap text-base text-text">{{ text }}</p>
      <UIButton class="mt-8" type="primary" size="large" @click="handleContinue">
        {{ $t({ en: 'Got it, start!', zh: '知道了，开始！' }) }}
      </UIButton>
    </div>
  </UIModal>
</template>
