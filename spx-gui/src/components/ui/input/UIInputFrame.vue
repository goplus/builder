<template>
  <div
    class="ui-input"
    :class="rootClass"
    :data-ui-state="props.validationState"
    :data-disabled="props.disabled || undefined"
    :data-readonly="props.readonly || undefined"
    @click="handleRootClick"
  >
    <div class="ui-input__wrapper">
      <div v-if="$slots.prefix != null" class="ui-input__prefix">
        <slot name="prefix"></slot>
      </div>

      <!--
        The default slot is expected to render a native <input> or <textarea> directly.
        Shell-level control styling intentionally targets that structure with `.ui-input__content > input/textarea`
        so concrete components only own value/behavior logic, not duplicated base input CSS.
      -->
      <div class="ui-input__content">
        <slot></slot>
      </div>

      <div v-if="$slots.suffix != null" class="ui-input__suffix">
        <slot name="suffix"></slot>
      </div>
    </div>

    <div class="ui-input__state-border"></div>
  </div>
</template>

<script lang="ts">
// Interactive children (for example the text input clear button) can opt out of
// the frame's click-to-focus behavior by marking themselves with this data attribute.
export const UI_INPUT_IGNORE_FOCUS_ATTR = 'data-ui-input-ignore-focus'
</script>

<script setup lang="ts">
import { computed } from 'vue'
import type { FormFieldValidationState } from '../form/context'

type Color = 'default' | 'white'
type Size = 'medium' | 'large'

const props = withDefaults(
  defineProps<{
    validationState: FormFieldValidationState
    color?: Color
    size?: Size
    disabled?: boolean
    readonly?: boolean
    textarea?: boolean
    invalid?: boolean
    focusControl?: () => void
  }>(),
  {
    color: 'default',
    size: 'medium',
    textarea: false,
    invalid: false,
    focusControl: undefined
  }
)

const rootClass = computed(() => ({
  'ui-input--textarea': props.textarea,
  'ui-input--invalid': props.invalid,
  'ui-input--color-default': props.color === 'default',
  'ui-input--color-white': props.color === 'white',
  'ui-input--size-medium': props.size === 'medium',
  'ui-input--size-large': props.size === 'large'
}))

function handleRootClick(event: MouseEvent) {
  if (props.focusControl == null) return
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest(`[${UI_INPUT_IGNORE_FOCUS_ATTR}]`) != null) return
  props.focusControl()
}
</script>

<style>
/*
 * Shared frame for text-like controls.
 *
 * DOM layering intentionally mirrors the old Naive UI inputs:
 * root -> wrapper -> prefix/input/suffix -> state-border.
 * This keeps visual rules centralized while each concrete control owns only its value logic.
 */
@layer components {
  .ui-input {
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

  .ui-input--color-default {
    background: var(--ui-color-grey-300);
  }

  .ui-input--color-white {
    background: var(--ui-color-grey-100);
  }

  .ui-input--size-medium {
    height: 32px;
  }

  .ui-input--size-large {
    height: 40px;
  }

  .ui-input--textarea {
    min-height: inherit;
    height: auto;
  }

  /*
   * Background behavior intentionally matches the legacy input look:
   * - default color rests on grey
   * - hover deepens to grey-400
   * - focus / error / success switch back to white
   */
  .ui-input--color-default:not(
      :is([data-disabled='true'], [data-ui-state='error'], [data-ui-state='success'], :focus-within)
    ):hover {
    background: var(--ui-color-grey-400);
  }

  .ui-input--color-white:not(
      :is([data-disabled='true'], [data-ui-state='error'], [data-ui-state='success'], :focus-within)
    ):hover {
    background: var(--ui-color-grey-100);
  }

  .ui-input--color-default:not([data-disabled='true']):focus-within,
  .ui-input--color-default[data-ui-state='error'],
  .ui-input--color-default[data-ui-state='success'] {
    background: var(--ui-color-grey-100);
  }

  .ui-input--color-default:is([data-ui-state='error'], [data-ui-state='success']):not(
      :is([data-disabled='true'], :focus-within)
    ):hover {
    background: var(--ui-color-grey-400);
  }

  .ui-input[data-disabled='true'] {
    cursor: not-allowed;
    background: var(--ui-color-disabled-bg);
    color: var(--ui-color-disabled-text);
  }

  .ui-input__wrapper {
    position: relative;
    z-index: 1;
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
  }

  .ui-input--textarea .ui-input__wrapper {
    min-height: inherit;
    align-items: stretch;
  }

  .ui-input__prefix,
  .ui-input__suffix {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--ui-color-grey-800);
  }

  .ui-input[data-disabled='true'] .ui-input__prefix,
  .ui-input[data-disabled='true'] .ui-input__suffix {
    color: var(--ui-color-disabled-text);
  }

  .ui-input__prefix {
    margin-right: 8px;
  }

  .ui-input__suffix {
    margin-left: 4px;
  }

  .ui-input__content {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
  }

  .ui-input--textarea .ui-input__content {
    display: flex;
    min-height: inherit;
  }

  .ui-input__content > input,
  .ui-input__content > textarea {
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
    text-align: inherit;
    outline: none;
  }

  .ui-input__content > input:focus,
  .ui-input__content > textarea:focus {
    outline: none;
  }

  .ui-input__content > input::placeholder,
  .ui-input__content > textarea::placeholder {
    color: var(--ui-color-grey-700);
  }

  .ui-input__content > input:disabled,
  .ui-input__content > textarea:disabled {
    cursor: not-allowed;
    color: var(--ui-color-disabled-text);
  }

  .ui-input--textarea .ui-input__content > textarea {
    min-height: inherit;
    height: auto;
    padding-top: 5px;
    padding-bottom: 5px;
    resize: none;
    line-height: 1.57143;
  }

  .ui-input--size-large.ui-input--textarea .ui-input__content > textarea {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .ui-input--invalid .ui-input__content > input,
  .ui-input--invalid .ui-input__content > textarea {
    text-decoration: line-through;
  }

  .ui-input__state-border {
    pointer-events: none;
    position: absolute;
    inset: 0;
    border: 1px solid transparent;
    border-radius: inherit;
    transition: border-color 0.2s;
  }

  /* Render focus/error/success on a dedicated overlay so content layout never shifts. */
  .ui-input:not([data-ui-state='error']):not([data-ui-state='success']):focus-within .ui-input__state-border {
    border-color: var(--ui-color-primary-main);
  }

  .ui-input[data-ui-state='error'] .ui-input__state-border {
    border-color: var(--ui-color-danger-main);
  }

  .ui-input[data-ui-state='error'] .ui-input__content > input,
  .ui-input[data-ui-state='error'] .ui-input__content > textarea {
    caret-color: var(--ui-color-danger-main);
  }

  .ui-input[data-ui-state='success'] .ui-input__state-border {
    border-color: var(--ui-color-success-main);
  }

  .ui-input__content > input::-ms-reveal,
  .ui-input__content > input::-ms-clear,
  .ui-input__content > input::-webkit-outer-spin-button,
  .ui-input__content > input::-webkit-inner-spin-button {
    display: none;
    appearance: none;
  }
}
</style>
