<template>
  <div :class="rootClass" @click="handleClick">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'

import { cn, type ClassValue } from './utils'
import {
  selectedValueInjectionKey,
  typeInjectionKey,
  updateValueInjectionKey,
  variantInjectionKey
} from './UIButtonGroup.vue'

const props = defineProps<{
  value: string
  class?: ClassValue
}>()

const selectedValue = inject(selectedValueInjectionKey)
const updateValue = inject(updateValueInjectionKey)
const type = inject(typeInjectionKey, () => 'icon')
const variant = inject(variantInjectionKey, () => 'primary')

const isActive = computed(() => selectedValue?.() === props.value)
const rootClass = computed(() =>
  cn(
    'h-(--ui-line-height-2) flex items-center justify-center first:rounded-l-md first:rounded-r-none last:rounded-r-md last:rounded-l-none',
    type() === 'icon' ? 'min-w-8' : 'px-3',
    // TODO: Revisit color #47d8e4 together with the rest of the UI library when the visual style is unified.
    variant() === 'primary'
      ? isActive.value
        ? 'bg-primary-200 text-primary-400'
        : 'bg-grey-300 text-grey-1000'
      : isActive.value
        ? 'bg-grey-200 text-turquoise-600'
        : 'bg-[#47d8e4] text-grey-200',
    isActive.value ? 'cursor-default' : 'cursor-pointer',
    props.class
  )
)

const handleClick = () => {
  if (!isActive.value) {
    updateValue?.(props.value)
  }
}
</script>
