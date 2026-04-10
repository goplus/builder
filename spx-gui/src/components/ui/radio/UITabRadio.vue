<template>
  <li v-bind="rootAttrs" :class="rootClass" @click="handleClick">
    <slot></slot>
  </li>
</template>

<script setup lang="ts">
import { computed, inject, useAttrs } from 'vue'

import { cn, type ClassValue } from '../utils'
import { radioGroupValueKey, updateRadioValueKey } from './UITabRadioGroup.vue'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  value: string
}>()

const radioGroupValue = inject(radioGroupValueKey)
const updateRadioValue = inject(updateRadioValueKey)

const attrs = useAttrs()
const isActive = computed(() => radioGroupValue?.value === props.value)
const rootClass = computed(() =>
  cn(
    // TODO: animation for background slide?
    'flex-[1_1_0] flex items-center justify-center px-2 py-[5px] [transition:0.2s]',
    isActive.value
      ? 'rounded-sm bg-grey-100 text-title [box-shadow:0_6px_10px_0_rgba(14,18,27,0.06),0_2px_4px_0_rgba(14,18,27,0.03)]'
      : 'cursor-pointer text-hint-1',
    attrs.class as ClassValue | null
  )
)
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const handleClick = () => {
  updateRadioValue?.(props.value)
}
</script>
