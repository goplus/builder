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
      ? 'rounded-sm bg-grey-100 text-title [box-shadow:0_6px_10px_0_rgba(14,18,27,0.06),0_2px_4px_0_rgba(14,18,27,0.03)]'
      : 'cursor-pointer text-hint-1',
    props.class
  )
)

const handleClick = () => {
  updateRadioValue?.(props.value)
}
</script>
