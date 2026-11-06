<script setup lang="ts">
import UIIcon from '../icons/UIIcon.vue'
import type { MessageType } from './UIMessageProvider.vue'

const props = defineProps<{
  type: MessageType
  content: string
}>()
</script>

<template>
  <div
    class="mb-2 max-w-[min(367px,calc(100vw-32px))] pointer-events-auto rounded-md shadow-md bg-grey-100 px-xl py-2.75 flex flex-nowrap text-title"
  >
    <div
      class="relative mt-px mr-2 h-5 w-5 flex-none text-2xl"
      :class="{
        'text-primary-main': props.type === 'info' || props.type === 'loading',
        'text-success-main': props.type === 'success',
        'text-danger-main': props.type === 'error',
        'text-yellow-main': props.type === 'warning'
      }"
    >
      <UIIcon :type="props.type" class="h-full w-full" />
    </div>
    <div class="inline-block text-base wrap-break-word">
      {{ props.content }}
    </div>
  </div>
</template>
