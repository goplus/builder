<template>
  <UIInputFrame
    :validation-state="validationState"
    :disabled="props.disabled"
    :readonly="props.readonly"
    :textarea="isTextarea"
    :color="props.color"
    :size="props.size"
    :focus-control="focusControl"
  >
    <template v-if="slots.prefix != null" #prefix>
      <slot name="prefix"></slot>
    </template>

    <textarea
      v-if="isTextarea"
      ref="controlRef"
      v-bind="controlBindings"
      :placeholder="props.placeholder || ''"
      :value="props.value"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :rows="props.rows"
      @input="handleTextInput"
      @blur="onBlur"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />

    <input
      v-else
      ref="controlRef"
      v-bind="controlBindings"
      :placeholder="props.placeholder || ''"
      :value="props.value"
      :type="inputType"
      :disabled="props.disabled"
      :readonly="props.readonly"
      @input="handleTextInput"
      @blur="onBlur"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    />

    <template v-if="showSuffix" #suffix>
      <!--
        Mark the clear button so UIInputFrame does not treat this click as a generic
        frame click and run its click-to-focus fallback.
      -->
      <button
        v-if="props.value && props.clearable"
        class="ui-input__clear"
        type="button"
        v-bind="clearIgnoreFocusAttrs"
        @mousedown.prevent
        @click="handleClear"
      >
        <svg
          class="ui-input__clear-icon"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6.70713 5.99999L9.35363 3.35347C9.54913 3.15847 9.54913 2.8415 9.35363 2.6465C9.15813 2.451 8.84212 2.451 8.64663 2.6465L6.00013 5.29299L3.35363 2.6465C3.15813 2.451 2.84212 2.451 2.64662 2.6465C2.45112 2.8415 2.45112 3.15847 2.64662 3.35347L5.29312 5.99999L2.64662 8.6465C2.45112 8.8415 2.45112 9.15847 2.64662 9.35347C2.74412 9.45097 2.87213 9.49999 3.00013 9.49999C3.12813 9.49999 3.25613 9.45097 3.35363 9.35347L6.00013 6.70699L8.64663 9.35347C8.74412 9.45097 8.87213 9.49999 9.00013 9.49999C9.12813 9.49999 9.25613 9.45097 9.35363 9.35347C9.54913 9.15847 9.54913 8.8415 9.35363 8.6465L6.70713 5.99999Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <slot name="suffix"></slot>
    </template>
  </UIInputFrame>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useSlots } from 'vue'
import UIInputFrame, { UI_INPUT_IGNORE_FOCUS_ATTR } from './UIInputFrame.vue'
import { useFormControl } from '../form/useFormControl'

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
    rows?: number | string
  }>(),
  {
    color: 'default',
    size: 'medium',
    type: undefined,
    placeholder: undefined,
    rows: 3
  }
)

const emit = defineEmits<{
  'update:value': [string]
}>()

const slots = useSlots()
const { controlBindings, onBlur, onCompositionStart, onCompositionEnd, onInput, validationState } = useFormControl()

// Keep the public API unchanged (`type="textarea"`) while rendering native nodes internally.
const isTextarea = computed(() => props.type === 'textarea')
const inputType = computed(() => (props.type === 'password' ? 'password' : 'text'))
const showSuffix = computed(() => (props.value && props.clearable) || slots.suffix != null)
const clearIgnoreFocusAttrs = { [UI_INPUT_IGNORE_FOCUS_ATTR]: '' }

const controlRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

const focusControl = () => {
  controlRef.value?.focus()
}

function handleUpdateValue(v: string) {
  emit('update:value', v)
  onInput()
}

function handleTextInput(event: Event) {
  handleUpdateValue((event.target as HTMLInputElement | HTMLTextAreaElement).value)
}

function handleClear() {
  // Match the previous UX: clear the value first, then restore focus back to the text control.
  handleUpdateValue('')
  void nextTick(() => {
    controlRef.value?.focus()
  })
}

onMounted(() => {
  if (props.autofocus && controlRef.value != null) controlRef.value.focus()
})

defineExpose({
  focus() {
    controlRef.value?.focus()
  }
})
</script>

<style>
@layer components {
  .ui-input__clear {
    margin-right: -2px;
    height: 20px;
    width: 20px;
    appearance: none;
    outline: none;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--ui-color-grey-800);
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .ui-input__clear:focus {
    outline: none;
  }

  .ui-input__clear:hover {
    background: var(--ui-color-grey-400);
  }

  .ui-input__clear:active {
    background: var(--ui-color-grey-500);
  }

  .ui-input__clear-icon {
    display: block;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
}
</style>
