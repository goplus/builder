<template>
  <div
    class="ui-text-input"
    :class="rootClass"
    :data-ui-state="validationState"
    :data-disabled="props.disabled || undefined"
    :data-readonly="props.readonly || undefined"
    @click="handleRootClick"
  >
    <div class="ui-text-input__wrapper">
      <div v-if="slots.prefix != null" class="ui-text-input__prefix">
        <slot name="prefix"></slot>
      </div>

      <div class="ui-text-input__input">
        <textarea
          v-if="isTextarea"
          ref="controlRef"
          v-bind="controlBindings"
          class="ui-text-input__control ui-text-input__control--textarea"
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
          class="ui-text-input__control"
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
      </div>

      <div v-if="showSuffix" class="ui-text-input__suffix">
        <button
          v-if="props.value && props.clearable"
          class="ui-text-input__clear"
          type="button"
          data-ui-text-input-clear
          @mousedown.prevent
          @click="handleClear"
        >
          <svg
            class="ui-text-input__clear-icon"
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
      </div>
    </div>

    <div class="ui-text-input__state-border"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useSlots } from 'vue'
import { useFormControl } from './form/useFormControl'

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
const { controlBindings, onBlur, onCompositionStart, onCompositionEnd, onInput, validationState } =
  useFormControl()

// Keep the public API unchanged (`type="textarea"`) while rendering native nodes internally.
const isTextarea = computed(() => props.type === 'textarea')
const inputType = computed(() => (props.type === 'password' ? 'password' : 'text'))
const showSuffix = computed(() => (props.value && props.clearable) || slots.suffix != null)

// Use explicit modifier classes so visual states can be maintained in plain CSS instead of JS-built utility strings.
const rootClass = computed(() => ({
  'ui-text-input--textarea': isTextarea.value,
  'ui-text-input--color-default': props.color === 'default',
  'ui-text-input--color-white': props.color === 'white',
  'ui-text-input--size-medium': props.size === 'medium',
  'ui-text-input--size-large': props.size === 'large'
}))

function handleUpdateValue(v: string) {
  emit('update:value', v)
  onInput()
}

function handleTextInput(event: Event) {
  handleUpdateValue((event.target as HTMLInputElement | HTMLTextAreaElement).value)
}

function handleRootClick(event: MouseEvent) {
  // Clicking the shell should focus the actual control, but the clear button keeps its own interaction.
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest('[data-ui-text-input-clear]') != null) return
  controlRef.value?.focus()
}

function handleClear() {
  // Match the previous UX: clear the value first, then restore focus back to the text control.
  handleUpdateValue('')
  void nextTick(() => {
    controlRef.value?.focus()
  })
}

const controlRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
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
  /*
   * The DOM skeleton intentionally mirrors the important layers of Naive UI's input:
   * root -> wrapper -> prefix/input/suffix -> state-border.
   *
   * That keeps the visual model familiar while letting us own the DOM and avoid `:deep(...)`.
   */
  .ui-text-input {
    position: relative;
    display: inline-flex;
    width: 100%;
    min-width: 0;
    border-radius: var(--ui-border-radius-2);
    color: var(--ui-color-grey-1000);
    font-size: var(--ui-font-size-text);
    line-height: 1.57143;
    transition: background-color 0.2s;
  }

  .ui-text-input--color-default {
    background: var(--ui-color-grey-300);
  }

  .ui-text-input--color-white {
    background: var(--ui-color-grey-100);
  }

  .ui-text-input--size-medium {
    height: 32px;
  }

  .ui-text-input--size-large {
    height: 40px;
  }

  .ui-text-input--textarea {
    min-height: inherit;
    height: auto;
  }

  /*
   * Background behavior is intentionally asymmetric:
   * - default color rests on grey
   * - hover deepens to grey-400
   * - focus / error / success switch back to a white background, matching the old visual behavior
   */
  .ui-text-input--color-default:not([data-disabled='true']):not([data-ui-state='error']):not(
      [data-ui-state='success']
    ):not(:focus-within):hover {
    background: var(--ui-color-grey-400);
  }

  .ui-text-input--color-white:not([data-disabled='true']):not([data-ui-state='error']):not(
      [data-ui-state='success']
    ):not(:focus-within):hover {
    background: var(--ui-color-grey-100);
  }

  .ui-text-input--color-default:not([data-disabled='true']):focus-within,
  .ui-text-input--color-default[data-ui-state='error'],
  .ui-text-input--color-default[data-ui-state='success'] {
    background: var(--ui-color-grey-100);
  }

  .ui-text-input--color-default:not([data-disabled='true'])[data-ui-state='error']:not(:focus-within):hover,
  .ui-text-input--color-default:not([data-disabled='true'])[data-ui-state='success']:not(:focus-within):hover {
    background: var(--ui-color-grey-400);
  }

  .ui-text-input[data-disabled='true'] {
    cursor: not-allowed;
    background: var(--ui-color-disabled-bg);
    color: var(--ui-color-disabled-text);
  }

  .ui-text-input__wrapper {
    position: relative;
    z-index: 1;
    display: inline-flex;
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    align-items: center;
    padding-left: 12px;
    padding-right: 12px;
  }

  .ui-text-input--textarea .ui-text-input__wrapper {
    min-height: inherit;
    align-items: stretch;
  }

  .ui-text-input__prefix,
  .ui-text-input__suffix {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    color: var(--ui-color-grey-800);
  }

  .ui-text-input[data-disabled='true'] .ui-text-input__prefix,
  .ui-text-input[data-disabled='true'] .ui-text-input__suffix {
    color: var(--ui-color-disabled-text);
  }

  .ui-text-input__prefix {
    margin-right: 8px;
  }

  .ui-text-input__suffix {
    margin-left: 4px;
  }

  .ui-text-input__input {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
  }

  .ui-text-input--textarea .ui-text-input__input {
    display: flex;
    min-height: inherit;
  }

  .ui-text-input__control {
    width: 100%;
    min-width: 0;
    height: inherit;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--ui-color-grey-1000);
    caret-color: var(--ui-color-primary-main);
    font: inherit;
    line-height: inherit;
    outline: 0;
  }

  .ui-text-input__control::placeholder {
    color: var(--ui-color-grey-700);
  }

  .ui-text-input__control:disabled {
    cursor: not-allowed;
    color: var(--ui-color-disabled-text);
  }

  .ui-text-input__control--textarea {
    min-height: inherit;
    height: auto;
    padding-top: 5px;
    padding-bottom: 5px;
    resize: none;
    line-height: 1.57143;
  }

  .ui-text-input--size-large .ui-text-input__control--textarea {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .ui-text-input__state-border {
    pointer-events: none;
    position: absolute;
    inset: 0;
    border: 1px solid transparent;
    border-radius: inherit;
    transition: border-color 0.2s;
  }

  /* Validation/focus colors are rendered on a dedicated overlay so content layout stays stable. */
  .ui-text-input:not([data-ui-state='error']):not([data-ui-state='success']):focus-within .ui-text-input__state-border {
    border-color: var(--ui-color-primary-main);
  }

  .ui-text-input[data-ui-state='error'] .ui-text-input__state-border {
    border-color: var(--ui-color-danger-main);
  }

  .ui-text-input[data-ui-state='error'] .ui-text-input__control {
    caret-color: var(--ui-color-danger-main);
  }

  .ui-text-input[data-ui-state='success'] .ui-text-input__state-border {
    border-color: var(--ui-color-success-main);
  }

  .ui-text-input__clear {
    margin-right: -2px;
    display: inline-flex;
    height: 20px;
    width: 20px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 9999px;
    background: transparent;
    padding: 0;
    color: var(--ui-color-grey-800);
    cursor: pointer;
    appearance: none;
    outline: 0;
    transition: background-color 0.2s;
  }

  /* Clear stays transparent by default; only hover/active should add a filled background. */
  .ui-text-input__clear:hover {
    background: var(--ui-color-grey-400);
  }

  .ui-text-input__clear:active {
    background: var(--ui-color-grey-500);
  }

  .ui-text-input__clear-icon {
    display: block;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  .ui-text-input input::-ms-reveal,
  .ui-text-input input::-ms-clear {
    display: none;
  }
}
</style>
