<script setup lang="ts">
import { useI18n, type LocaleMessage } from '@/utils/i18n'
import UIIcon from './icons/UIIcon.vue'
import { useMessage } from './message'
import UITooltip from './UITooltip.vue'

const props = defineProps<{
  value: string
  label: LocaleMessage
}>()

const i18n = useI18n()
const message = useMessage()

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.value)
    message.success(i18n.t({ en: 'Copied to clipboard', zh: '已复制到剪贴板' }))
  } catch {
    message.error(i18n.t({ en: 'Failed to copy to clipboard', zh: '复制到剪贴板失败' }))
  }
}
</script>

<template>
  <UITooltip placement="top">
    {{ $t(label) }}
    <template #trigger>
      <button
        v-radar="{ name: $t(label), desc: 'Copy value to clipboard' }"
        class="inline-flex h-5 w-5 flex-none cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-grey-700 transition-colors hover:bg-grey-300 hover:text-primary-main focus-visible:outline-2 focus-visible:outline-primary-main"
        type="button"
        :aria-label="$t(label)"
        @click.prevent.stop="handleCopy"
      >
        <UIIcon class="h-3.5 w-3.5" type="copy" />
      </button>
    </template>
  </UITooltip>
</template>
