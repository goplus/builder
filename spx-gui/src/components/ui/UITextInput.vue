<!-- TODO: Wrap it with a native node ? -->
<template>
  <NInput
    ref="nInput"
    class="ui-text-input"
    :class="[`ui-text-input-color-${color}`, `ui-text-input-size-${size}`]"
    v-bind="controlBindings"
    :status="status"
    :placeholder="placeholder || ''"
    :value="value"
    :type="type"
    :disabled="disabled"
    :readonly="readonly"
    :resizable="false"
    @update:value="handleUpdateValue"
    @blur="onBlur"
    @compositionstart="onCompositionStart"
    @compositionend="onCompositionEnd"
  >
    <template v-if="!!slots.prefix" #prefix>
      <slot name="prefix"></slot>
    </template>
    <template v-if="(value && clearable) || !!slots.suffix" #suffix>
      <div
        v-if="value && clearable"
        class="-mr-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-grey-800 transition-colors duration-200 hover:bg-grey-400 active:bg-grey-500"
        @click="handleUpdateValue('')"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6.70713 5.99999L9.35363 3.35347C9.54913 3.15847 9.54913 2.8415 9.35363 2.6465C9.15813 2.451 8.84212 2.451 8.64663 2.6465L6.00013 5.29299L3.35363 2.6465C3.15813 2.451 2.84212 2.451 2.64662 2.6465C2.45112 2.8415 2.45112 3.15847 2.64662 3.35347L5.29312 5.99999L2.64662 8.6465C2.45112 8.8415 2.45112 9.15847 2.64662 9.35347C2.74412 9.45097 2.87213 9.49999 3.00013 9.49999C3.12813 9.49999 3.25613 9.45097 3.35363 9.35347L6.00013 6.70699L8.64663 9.35347C8.74412 9.45097 8.87213 9.49999 9.00013 9.49999C9.12813 9.49999 9.25613 9.45097 9.35363 9.35347C9.54913 9.15847 9.54913 8.8415 9.35363 8.6465L6.70713 5.99999Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <slot name="suffix"></slot>
    </template>
  </NInput>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useSlots } from 'vue'
import { NInput } from 'naive-ui'
import { useFieldControlBindings } from './form/field-control-bindings'

type Type = 'textarea' | 'text' | 'password'
type Color = 'default' | 'white'
type Size = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    value: string
    type?: Type
    color?: Color
    size?: Size
    clearable?: boolean
    disabled?: boolean
    readonly?: boolean
    placeholder?: string
    autofocus?: boolean
  }>(),
  {
    color: 'default',
    size: 'medium',
    type: undefined,
    placeholder: undefined
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

const slots = useSlots()
const { controlBindings, onBlur, onCompositionStart, onCompositionEnd, onInput, validationState } =
  useFieldControlBindings()

// Temporary bridge while this component still wraps `NInput`.
// Passing `status` through lets Naive UI render its built-in validation visuals,
// so we don't need to keep patching all error/success styling through `.n-*` selectors
// before the next PR replaces `NInput` with our native implementation.
const status = computed(() => {
  if (validationState.value === 'error') return 'error'
  if (validationState.value === 'success') return 'success'
  return undefined
})

function handleUpdateValue(v: string) {
  emit('update:value', v)
  // For the current `NInput` wrapper, `update:value` is the most reliable field-level
  // "input-like" signal we receive from Naive UI. It covers normal typing as well as
  // value updates initiated through wrapper-owned UI (for example the custom clear action),
  // so we trigger the form layer's `onInput()` here instead of depending on a lower-level
  // native `input` event from the wrapped component.
  onInput()
}

// It's weird that the prop `autofocus` of `NInput` does not work as expected, so we handle it manually.
const nInput = ref<InstanceType<typeof NInput> | null>(null)
onMounted(() => {
  if (props.autofocus && nInput.value != null) nInput.value.focus()
})

defineExpose({
  getInputElement() {
    return nInput.value?.inputElRef ?? null
  }
})
</script>

<style>
@layer components {
  /* color */
  .ui-text-input-color-default {
    --ui-text-input-bg-color: var(--ui-color-grey-300);
    --ui-text-input-bg-color-hover: var(--ui-color-grey-400);
    --ui-text-input-border-color: var(--ui-color-grey-300);
  }

  .ui-text-input-color-white {
    --ui-text-input-bg-color: var(--ui-color-grey-100);
    --ui-text-input-bg-color-hover: var(--ui-color-grey-200);
    --ui-text-input-border-color: var(--ui-color-grey-400);
  }

  /* size */
  .ui-text-input-size-medium {
    --ui-text-input-height: 32px;
  }
  .ui-text-input-size-large {
    --ui-text-input-height: 40px;
  }
}
</style>

<style scoped>
/* it's not possible to control input's hovered-bg-color with themeOverrides, */
/* so we do background color control here */
.ui-text-input:not(.n-input--focus, .n-input--error-status, .n-input--success-status) {
  background: var(--ui-text-input-bg-color);
}
.ui-text-input:not(.n-input--focus, .n-input--error-status, .n-input--success-status):deep(.n-input__state-border) {
  border: 1px solid var(--ui-text-input-border-color);
}
.ui-text-input:not(.n-input--focus, .n-input--disabled):hover {
  background: var(--ui-text-input-bg-color-hover);
}
.ui-text-input :deep(.n-input__input-el) {
  height: var(--ui-text-input-height);
}
.ui-text-input.n-input--success-status :deep(.n-input__state-border) {
  border: 1px solid var(--ui-color-success-main);
}
.ui-text-input :deep(.n-input__prefix) {
  margin-right: 8px;
}
</style>
