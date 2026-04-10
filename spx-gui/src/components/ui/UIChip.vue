<template>
  <button v-bind="buttonAttrs" :class="rootClass">
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { cn, type ClassValue } from './utils'

export type ChipType = 'primary' | 'boring'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  type: ChipType
}>()

const attrs = useAttrs()
const rootClass = computed(() =>
  cn(
    // TODO: support different sizes
    'h-8 w-fit flex items-center whitespace-nowrap border rounded-md px-4 cursor-pointer [transition:0.3s]',
    {
      'text-grey-100 bg-primary-main border-primary-main': props.type === 'primary',
      'text-grey-900 bg-grey-300 border-grey-300': props.type === 'boring'
    },
    attrs.class as ClassValue | null
  )
)
const buttonAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})
</script>
