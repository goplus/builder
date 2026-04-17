<template>
  <div
    ref="rootRef"
    role="group"
    v-bind="controlBindings"
    :class="rootClass"
    :aria-disabled="props.disabled || undefined"
    @focusout="handleFocusOut"
  >
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
import { computed, provide, ref } from 'vue'
import { useFormControl } from '../form/useFormControl'
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    value?: string[]
    disabled?: boolean
    class?: ClassValue
  }>(),
  {
    value: () => [],
    disabled: false,
    class: undefined
  }
)

const emit = defineEmits<{
  'update:value': [string[]]
}>()

const { controlBindings, onBlur, onChange } = useFormControl()
const rootRef = ref<HTMLElement | null>(null)
const rootClass = computed(() => cn('inline-flex items-center', props.class ?? null))

provide(checkboxGroupContextKey, {
  value: computed(() => props.value),
  disabled: computed(() => props.disabled),
  updateValue: handleUpdateValue
})

function handleUpdateValue(v: string, checked: boolean) {
  if (props.disabled) return

  const currentValues = props.value
  const hasValue = currentValues.includes(v)
  let nextValues = currentValues

  if (checked && !hasValue) {
    nextValues = [...currentValues, v]
  } else if (!checked && hasValue) {
    nextValues = currentValues.filter((item) => item !== v)
  }

  if (nextValues === currentValues) return
  emit('update:value', nextValues)
  onChange()
}

function handleFocusOut(event: FocusEvent) {
  const root = rootRef.value
  const nextFocused = event.relatedTarget
  if (root == null) return
  if (nextFocused instanceof Node && root.contains(nextFocused)) return
  onBlur()
}
</script>
