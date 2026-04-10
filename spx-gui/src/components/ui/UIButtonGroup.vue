<template>
  <div v-bind="rootAttrs" :class="rootClass">
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
import { computed, provide, useAttrs } from 'vue'

import { cn, type ClassValue } from './utils'

defineOptions({
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    value?: string
    /** Type of group-item content. */
    type?: Type
    variant?: Variant
  }>(),
  {
    value: undefined,
    type: 'icon',
    variant: 'primary'
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

const attrs = useAttrs()
const rootClass = computed(() => cn('flex', attrs.class as ClassValue))
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

provide(selectedValueInjectionKey, () => props.value)
provide(updateValueInjectionKey, (value: string) => {
  emit('update:value', value)
})
provide(typeInjectionKey, () => props.type)
provide(variantInjectionKey, () => props.variant)
</script>
