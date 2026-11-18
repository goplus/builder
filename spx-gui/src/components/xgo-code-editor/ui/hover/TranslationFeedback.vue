<script setup lang="ts">
import { computed } from 'vue'
import { UIIcon } from '@/components/ui'
import type { LocaleMessage } from '@/utils/i18n'
import type { EditorTranslationFailureKind } from '../../translation'

const props = defineProps<{
  kind: EditorTranslationFailureKind
}>()

const feedback = computed<{
  icon: 'errorTriangle' | 'warning'
  message: LocaleMessage
  className: string
}>(() => {
  switch (props.kind) {
    case 'rate-limited':
      return {
        icon: 'errorTriangle',
        className: 'text-red-main',
        message: {
          en: 'Translation requests are too frequent. Please try again later.',
          zh: '翻译请求过于频繁，请稍后重试。'
        }
      }
    case 'quota-exceeded':
      return {
        icon: 'warning',
        className: 'text-yellow-main',
        message: {
          en: 'Translation quota is used up. Please try again later.',
          zh: '翻译额度已用完，请稍后重试。'
        }
      }
    default:
      return {
        icon: 'errorTriangle',
        className: 'text-red-main',
        message: {
          en: 'Translation failed. Please try again later.',
          zh: '翻译失败，请稍后重试。'
        }
      }
  }
})
</script>

<template>
  <div class="min-h-8 flex items-center gap-2 text-xs" :class="feedback.className" role="alert" aria-live="polite">
    <UIIcon class="flex-none" :type="feedback.icon" />
    <span>{{ $t(feedback.message) }}</span>
  </div>
</template>
