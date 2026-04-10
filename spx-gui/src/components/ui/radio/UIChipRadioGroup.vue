<template>
  <div v-bind="rootAttrs" :class="rootClass">
    <slot />
  </div>
</template>
<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

export const radioGroupValueKey: InjectionKey<ComputedRef<string | undefined>> = Symbol('radioGroupValue')
export const updateRadioValueKey: InjectionKey<(value: string) => void> = Symbol('updateRadioValue')
</script>

<script setup lang="ts">
import { computed, provide, useAttrs } from 'vue'

import { cn, type ClassValue } from '../utils'

defineOptions({
  inheritAttrs: false
})

const props = defineProps<{
  value?: string
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const attrs = useAttrs()
const rootClass = computed(() => cn('flex gap-3', attrs.class as ClassValue | null))
const rootAttrs = computed(() => {
  const { class: _class, ...rest } = attrs
  return rest
})

const updateValue = (newValue: string) => {
  emit('update:value', newValue)
}

provide(
  radioGroupValueKey,
  computed(() => props.value)
)
provide(updateRadioValueKey, updateValue)
</script>
