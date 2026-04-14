<template>
  <div :class="rootClass">
    <slot />
  </div>
</template>
<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

export const radioGroupValueKey: InjectionKey<ComputedRef<string | undefined>> = Symbol('radioGroupValue')
export const updateRadioValueKey: InjectionKey<(value: string) => void> = Symbol('updateRadioValue')
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'

import { cn, type ClassValue } from '../utils'

const props = defineProps<{
  value?: string
  class?: ClassValue
}>()

const emit = defineEmits<{
  'update:value': [string]
}>()

const rootClass = computed(() => cn('flex gap-3', props.class))

const updateValue = (newValue: string) => {
  emit('update:value', newValue)
}

provide(
  radioGroupValueKey,
  computed(() => props.value)
)
provide(updateRadioValueKey, updateValue)
</script>
