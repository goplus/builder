<template>
  <div
    ref="rootRef"
    role="radiogroup"
    v-bind="controlBindings"
    :class="cn('inline-flex items-center', props.class)"
    :aria-disabled="props.disabled || undefined"
    @focusout="handleFocusOut"
  >
    <slot></slot>
  </div>
</template>

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

export type RadioGroupContext = {
  value: ComputedRef<string | null>
  disabled: ComputedRef<boolean>
  name: string
  updateValue: (value: string) => void
}

export const radioGroupContextKey: InjectionKey<RadioGroupContext> = Symbol('ui-radio-group-context')
</script>

<script setup lang="ts">
import { computed, provide, ref, useId } from 'vue'
import { useFieldControlBindings } from '../form/field-control-bindings'
import { formFieldContextKey } from '../form/context'
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    value?: string | null
    disabled?: boolean
    class?: ClassValue
  }>(),
  {
    value: null,
    disabled: false,
    class: undefined
  }
)

const emit = defineEmits<{
  'update:value': [string | null]
}>()

const { controlBindings, onBlur, onChange } = useFieldControlBindings()
const rootRef = ref<HTMLElement | null>(null)

const radioGroupName = `ui-radio-group-${useId()}`

provide(radioGroupContextKey, {
  value: computed(() => props.value),
  disabled: computed(() => props.disabled),
  name: radioGroupName,
  updateValue: handleUpdateValue
})

// The group itself is the form field control. Shadow the item-level field context so
// descendant radios naturally fall back to standalone/no-op field bindings.
provide(formFieldContextKey, null)

function handleUpdateValue(v: string) {
  if (props.disabled || props.value === v) return
  emit('update:value', v)
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
