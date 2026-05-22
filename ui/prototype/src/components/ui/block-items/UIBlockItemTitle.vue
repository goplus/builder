<template>
  <div :class="rootClass">
    <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" :title="title">
      <slot></slot>
    </span>
    <slot v-if="slots.suffix != null" name="suffix"></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue'

import { cn, type ClassValue } from '../utils'

const props = defineProps<{
  size: 'medium' | 'large'
  title: string
  class?: ClassValue
}>()

const slots = useSlots()
const rootClass = computed(() =>
  cn(
    'flex items-center text-title',
    props.size === 'large'
      ? 'h-5 w-full gap-2 px-1.5 text-center text-sm'
      : ['h-5.5 w-full gap-0.5 px-1 text-2xs', slots.suffix != null ? 'text-left' : 'text-center'],
    props.class
  )
)
</script>
