<template>
  <NInputNumber
    ref="nInput"
    class="ui-number-input"
    v-bind="controlBindings"
    :placeholder="placeholder || ''"
    :show-button="false"
    :value="value"
    :disabled="disabled"
    :min="min"
    :max="max"
    @update:value="handleUpdateValue"
    @blur="onBlur"
  >
    <template v-if="!!slots.prefix" #prefix>
      <slot name="prefix"></slot>
    </template>
    <template v-if="!!slots.suffix" #suffix>
      <slot name="suffix"></slot>
    </template>
  </NInputNumber>
</template>

<script setup lang="ts">
import { onMounted, ref, useSlots } from 'vue'
import { NInputNumber } from 'naive-ui'
import { useFormControl } from './form/useFormControl'

const props = defineProps<{
  value: number | null
  disabled?: boolean
  min?: number
  max?: number
  placeholder?: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:value': [number | null]
}>()

const slots = useSlots()
const { controlBindings, onBlur, onInput } = useFormControl()

function handleUpdateValue(v: number | null) {
  // `NInputNumber` already owns its intermediate text parsing/commit behavior, so the emitted
  // numeric `update:value` is the closest field-level "input" signal we currently get here.
  emit('update:value', v)
  onInput()
}

// It's wierd that the prop `autofocus` of `NInput` does not work as expected, so we handle it manually.
const nInput = ref<InstanceType<typeof NInputNumber> | null>(null)
onMounted(() => {
  if (props.autofocus && nInput.value != null) nInput.value.focus()
})
</script>

<style scoped>
/* it's not possible to control input's hovered-bg-color with themeOverrides, */
/* so we do background color control here */
.ui-number-input:not([data-ui-state='error']):not([data-ui-state='success'])
  :deep(> .n-input):not(.n-input--focus, .n-input--disabled) {
  background-color: var(--ui-color-grey-300);
}
.ui-number-input:not([data-ui-state='error']):not([data-ui-state='success'])
  :deep(> .n-input):not(.n-input--focus, .n-input--disabled):hover {
  background-color: var(--ui-color-grey-400);
}
.ui-number-input[data-ui-state='error'] :deep(> .n-input .n-input__state-border) {
  border: 1px solid var(--ui-color-danger-main);
}
.ui-number-input[data-ui-state='success'] :deep(> .n-input .n-input__state-border) {
  border: 1px solid var(--ui-color-success-main);
}
.ui-number-input :deep(> .n-input .n-input__prefix) {
  margin-right: 8px;
}
</style>
