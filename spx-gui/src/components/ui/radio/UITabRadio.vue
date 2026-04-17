<template>
  <li :class="rootClass" @click="handleClick">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

import { cn, type ClassValue } from '../utils'
import { radioGroupValueKey, updateRadioValueKey } from './UITabRadioGroup.vue'

const props = defineProps<{
  value: string
  class?: ClassValue
}>()

const radioGroupValue = inject(radioGroupValueKey)
const updateRadioValue = inject(updateRadioValueKey)

const isActive = computed(() => radioGroupValue?.value === props.value)
const rootClass = computed(() =>
  cn(
    // TODO: animation for background slide?
    'flex-[1_1_0] flex items-center justify-center px-2 py-[5px] [transition:0.2s]',
    isActive.value
      ? 'rounded-[calc(var(--ui-border-radius-md)-2px)] bg-grey-100 text-title shadow-control'
      : 'cursor-pointer text-hint-1',
    props.class ?? null
  )
)

const handleClick = () => {
  updateRadioValue?.(props.value)
}
</script>
