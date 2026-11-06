<template>
  <div :class="cn('flex items-center justify-center rounded-md bg-grey-400 p-0.5', props.class)">
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

const updateValue = (newValue: string) => {
  emit('update:value', newValue)
}

provide(
  radioGroupValueKey,
  computed(() => props.value)
)
provide(updateRadioValueKey, updateValue)
</script>
