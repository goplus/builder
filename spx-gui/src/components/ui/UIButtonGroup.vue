<template>
  <div :class="rootClass">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import type { InjectionKey } from 'vue'

export type Type = 'icon' | 'text'
export type Variant = 'primary' | 'secondary'

export const selectedValueInjectionKey: InjectionKey<() => string | undefined> = Symbol('selectedValue')
export const updateValueInjectionKey: InjectionKey<(value: string) => void> = Symbol('updateValue')
export const typeInjectionKey: InjectionKey<() => Type> = Symbol('type')
export const variantInjectionKey: InjectionKey<() => Variant> = Symbol('variant')
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'

import { cn, type ClassValue } from './utils'

const props = withDefaults(
  defineProps<{
    value?: string
    /** Type of group-item content. */
    type?: Type
    variant?: Variant
    class?: ClassValue
  }>(),
  {
    value: undefined,
    type: 'icon',
    variant: 'primary',
    class: undefined
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

const rootClass = computed(() =>
  cn(
    'inline-flex h-8 rounded-md',
    props.variant === 'primary' && 'bg-grey-300 overflow-hidden',
    props.variant === 'secondary' && 'bg-grey-400 p-0.5',
    props.class ?? null
  )
)

provide(selectedValueInjectionKey, () => props.value)
provide(updateValueInjectionKey, (value: string) => {
  emit('update:value', value)
})
provide(typeInjectionKey, () => props.type)
provide(variantInjectionKey, () => props.variant)
</script>
