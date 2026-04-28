<template>
  <form :class="rootClass" @submit.prevent="emit('confirm')">
    <header class="h-11 flex flex-none items-center px-4">
      <h4 class="flex-1 text-xl text-title">{{ title }}</h4>
      <div
        v-radar="{ name: 'Close button', desc: 'Click to close the dropdown' }"
        class="-mr-1 h-7 w-7 flex items-center justify-center rounded-full text-grey-800 transition-colors duration-200 hover:bg-grey-400 active:bg-grey-500"
        @click="emit('cancel')"
      >
        <UIIcon type="close" class="h-5 w-5" />
      </div>
    </header>
    <UIDivider />
    <main class="flex-auto min-h-0 overflow-y-auto px-4 py-3">
      <slot></slot>
    </main>
    <footer class="flex-none flex justify-end gap-3 p-4">
      <UIButton
        v-radar="{ name: 'Cancel button', desc: 'Click to cancel the operation in dropdown' }"
        type="neutral"
        @click="emit('cancel')"
      >
        {{ $t({ en: 'Cancel', zh: '取消' }) }}
      </UIButton>
      <UIButton
        v-radar="{ name: 'Confirm button', desc: 'Click to submit the dropdown' }"
        type="primary"
        html-type="submit"
      >
        {{ $t({ en: 'Confirm', zh: '确认' }) }}
      </UIButton>
    </footer>
  </form>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { UIButton, UIDivider, UIIcon } from '@/components/ui'
import { cn, type ClassValue } from './utils'

const props = defineProps<{
  title: string
  class?: ClassValue
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const rootClass = computed(() => cn('flex flex-col items-stretch', props.class))
</script>
