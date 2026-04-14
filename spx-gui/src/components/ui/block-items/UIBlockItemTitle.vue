<template>
  <div :class="rootClass">
    <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
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
  class?: ClassValue
}>()

const slots = useSlots()
const rootClass = computed(() =>
  cn(
    'w-full flex items-center gap-2 px-1.5 text-center text-title',
    props.size === 'large' ? 'h-8 text-13/5' : 'text-10/[1.6]',
    props.class
  )
)
</script>
