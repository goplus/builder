<script setup lang="ts">
import { computed, useSlots } from 'vue'

const props = defineProps<{
  size: 'medium' | 'large'
  title: string
  class?: string
}>()

const slots = useSlots()
const rootClass = computed(() => [
  'flex items-center text-center text-title',
  props.size === 'large' ? 'h-5 text-sm' : 'h-5.5 text-2xs',
  props.class ?? 'w-full gap-2 px-1.5'
])
</script>

<template>
  <div :class="rootClass">
    <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap" :title="title">
      <slot></slot>
    </span>
    <slot v-if="slots.suffix != null" name="suffix"></slot>
  </div>
</template>
