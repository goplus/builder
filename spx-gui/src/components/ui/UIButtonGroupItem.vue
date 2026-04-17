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

const styles = {
  primary: {
    base: 'h-full',
    default: 'bg-grey-300 text-grey-1000',
    active: 'bg-primary-200 text-primary-400',
    text: 'px-3',
    icon: 'w-8'
  },
  secondary: {
    base: 'h-7',
    default: 'text-grey-800 hover:text-grey-1000',
    active: 'rounded-[calc(var(--ui-border-radius-md)-2px)] bg-grey-100 text-grey-1000',
    text: 'px-3',
    icon: 'w-9'
  }
}

const rootClass = computed(() =>
  cn(
    'flex items-center justify-center transition-colors',
    styles[variant()].base,
    styles[variant()][isActive.value ? 'active' : 'default'],
    styles[variant()][type()],
    isActive.value ? 'cursor-default' : 'cursor-pointer',
    props.class ?? null
  )
)

const handleClick = () => {
  if (!isActive.value) {
    updateValue?.(props.value)
  }
}
</script>
