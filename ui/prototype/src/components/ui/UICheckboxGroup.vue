<template>
  <div class="ui-checkbox-group" role="group" :aria-disabled="props.disabled || undefined">
    <slot></slot>
  </div>
</template>

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

export type CheckboxGroupContext = {
  value: ComputedRef<string[]>
  disabled: ComputedRef<boolean>
  updateValue: (value: string, checked: boolean) => void
}

export const checkboxGroupContextKey: InjectionKey<CheckboxGroupContext> = Symbol('ui-checkbox-group-context')
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'

const props = withDefaults(
  defineProps<{
    value?: string[]
    disabled?: boolean
  }>(),
  {
    value: () => [],
    disabled: false
  }
)

const emit = defineEmits<{
  'update:value': [string[]]
}>()

provide(checkboxGroupContextKey, {
  value: computed(() => props.value),
  disabled: computed(() => props.disabled),
  updateValue
})

function updateValue(value: string, checked: boolean) {
  if (props.disabled) return

  const currentValues = props.value
  const hasValue = currentValues.includes(value)
  let nextValues = currentValues

  if (checked && !hasValue) {
    nextValues = [...currentValues, value]
  } else if (!checked && hasValue) {
    nextValues = currentValues.filter((item) => item !== value)
  }

  if (nextValues !== currentValues) {
    emit('update:value', nextValues)
  }
}
</script>

<style scoped>
.ui-checkbox-group {
  display: inline-flex;
  align-items: center;
}
</style>
