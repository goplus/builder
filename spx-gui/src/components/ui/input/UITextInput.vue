<template>
  <UIInputFrame
    :validation-state="validationState"
    :disabled="props.disabled"
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
      @focus="handleFocus"
      @blur="handleBlur"
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
      @focus="handleFocus"
      @blur="handleBlur"
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
        class="mr-1 h-5 w-5 cursor-pointer appearance-none outline-none border-none rounded-full bg-transparent inline-flex items-center justify-center p-0 text-grey-800 transition-colors duration-200 last:-mr-0.5 hover:bg-grey-400 active:bg-grey-500"
        type="button"
        v-bind="clearIgnoreFocusAttrs"
        @mousedown.prevent
        @click="handleClear"
      >
        <svg
          class="block h-3 w-3 shrink-0"
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
import { useFieldControlBindings } from '../form/field-control-bindings'

type Type = 'textarea' | 'text' | 'password'
type Color = 'default' | 'white'
type Size = 'medium' | 'large'

type NativeTextControl = HTMLInputElement | HTMLTextAreaElement
type NativeTextControlFocusEvent = FocusEvent & {
  target: NativeTextControl
  currentTarget: NativeTextControl
}

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
    type: undefined,
    color: 'default',
    size: 'medium',
    clearable: false,
    disabled: false,
    readonly: false,
    placeholder: undefined,
    autofocus: false,
    rows: 3
  }
)

const emit = defineEmits<{
  'update:value': [string]
  // Forward non-bubbling focus/blur so component listeners keep the input-like behavior.
  focus: [NativeTextControlFocusEvent]
  blur: [NativeTextControlFocusEvent]
}>()

const slots = useSlots()
const { controlBindings, onBlur, onCompositionStart, onCompositionEnd, onInput, validationState } =
  useFieldControlBindings()

// Keep the public API unchanged (`type="textarea"`) while rendering native nodes internally.
const isTextarea = computed(() => props.type === 'textarea')
const inputType = computed(() => (props.type === 'password' ? 'password' : 'text'))
const showSuffix = computed(() => (props.value && props.clearable) || slots.suffix != null)
const clearIgnoreFocusAttrs = { [UI_INPUT_IGNORE_FOCUS_ATTR]: '' }

const controlRef = ref<NativeTextControl | null>(null)

const focusControl = () => {
  controlRef.value?.focus()
}

function emitValue(value: string) {
  emit('update:value', value)
}

function handleTextInput(event: Event) {
  emitValue((event.target as NativeTextControl).value)
  onInput()
}

function handleFocus(event: FocusEvent) {
  emit('focus', event as NativeTextControlFocusEvent)
}

function handleBlur(event: FocusEvent) {
  onBlur()
  emit('blur', event as NativeTextControlFocusEvent)
}

function handleClear() {
  if (props.disabled || props.readonly) return
  emitValue('')
  onInput()
  // Match the previous UX: clear the value first, then restore focus back to the text control.
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
  },
  getInputElement() {
    return controlRef.value
  }
})
</script>
