<script setup lang="ts">
import { computed } from 'vue'
import { cn, type ClassValue } from '../utils'
import UIModalClose from './UIModalClose.vue'

const props = defineProps<{
  class?: ClassValue
}>()

const emit = defineEmits<{
  close: []
}>()

const rootClass = computed(() =>
  cn('h-14 flex items-center gap-8 border-b border-grey-400 text-16 text-title', props.class ?? null)
)
</script>

<template>
  <div :class="rootClass">
    <div class="basis-[30%] flex-1"></div>
    <div class="basis-[40%] flex-1 min-w-0 overflow-hidden">
      <slot></slot>
    </div>
    <div class="basis-[30%] flex-1 flex items-center justify-end gap-5 pr-5">
      <slot name="right"></slot>
      <UIModalClose
        v-radar="{ name: 'Close button', desc: 'Click to close the full screen modal' }"
        @click="emit('close')"
      />
    </div>
  </div>
</template>
