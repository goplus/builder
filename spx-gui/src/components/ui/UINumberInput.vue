<template>
  <NInputNumber
    ref="nInput"
    class="ui-number-input"
    v-bind="controlBindings"
    :status="status"
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
import { computed, onMounted, ref, useSlots } from 'vue'
import { NInputNumber } from 'naive-ui'
import { useFieldControlBindings } from './form/field-control-bindings'

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
const { controlBindings, onBlur, onInput, validationState } = useFieldControlBindings()

// Temporary bridge while this component still wraps `NInputNumber`.
// Passing `status` through lets Naive UI render its built-in validation visuals,
// so we don't need to keep patching all error/success styling through `.n-*` selectors
// before the next PR replaces `NInputNumber` with our native implementation.
const status = computed(() => {
  if (validationState.value === 'error') return 'error'
  if (validationState.value === 'success') return 'success'
  return undefined
})

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
.ui-number-input :deep(> .n-input):not(.n-input--focus, .n-input--error-status, .n-input--disabled) {
  background-color: var(--ui-color-grey-300);
}
.ui-number-input :deep(> .n-input):not(.n-input--focus, .n-input--error-status, .n-input--disabled):hover {
  background-color: var(--ui-color-grey-400);
}
.ui-number-input :deep(> .n-input .n-input__prefix) {
  margin-right: 8px;
}
</style>
