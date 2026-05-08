<template>
  <div
    class="ui-input"
    :class="rootClass"
    :data-ui-state="props.validationState"
    :data-invalid="props.invalid || undefined"
    :data-disabled="props.disabled || undefined"
    @click="handleRootClick"
  >
    <div class="wrapper">
      <div v-if="$slots.prefix != null" class="prefix">
        <slot name="prefix"></slot>
      </div>

      <!--
        The default slot is expected to render a native <input> or <textarea> directly.
        Shell-level control styling intentionally targets that structure with `.content > input/textarea`
        so concrete components only own value/behavior logic, not duplicated base input CSS.
      -->
      <div class="content">
        <slot></slot>
      </div>

      <div v-if="$slots.suffix != null" class="suffix">
        <slot name="suffix"></slot>
      </div>
    </div>
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
    color: Color
    size: Size
    disabled: boolean
    textarea?: boolean
    /**
     * `invalid` is a control-local transient state, for example number text that can't be parsed yet.
     * Like `validationState` and `disabled`, this is a runtime shell state exposed via `data-*`.
     * It is intentionally separate from form-level `validationState`: the latter reflects validated
     * success/error feedback, while `invalid` only lets the shell render an in-progress invalid value.
     */
    invalid?: boolean
    focusControl?: () => void
  }>(),
  {
    textarea: false,
    invalid: false,
    focusControl: undefined
  }
)

const rootClass = computed(() => ({
  textarea: props.textarea,
  'color-default': props.color === 'default',
  'color-white': props.color === 'white',
  'size-medium': props.size === 'medium',
  'size-large': props.size === 'large'
}))

function handleRootClick(event: MouseEvent) {
  if (props.focusControl == null) return
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (target.closest(`[${UI_INPUT_IGNORE_FOCUS_ATTR}]`) != null) return
  props.focusControl()
}
</script>

<style scoped>
/*
 * Shared frame for text-like controls.
 *
 * DOM layering intentionally mirrors the old Naive UI inputs:
 * root -> wrapper -> prefix/input/suffix -> state-border.
 * This keeps visual rules centralized while each concrete control owns only its value logic.
 *
 * Convention in this shell:
 * - variant-like shape decisions (`color`, `size`, `textarea`) use modifier classes
 * - runtime states (`validationState`, `disabled`, `invalid`) use `data-*` attributes
 * This keeps shape variants readable in class form, while making multi-state runtime selectors
 * easier to compose without growing a parallel set of state modifier classes.
 */
@layer components {
  .ui-input {
    position: relative;
    display: inline-flex;
    width: 100%;
    min-width: 0;
    border-radius: var(--ui-border-radius-md);
    /* Use an inset shadow instead of a real border so focus/error/success state changes never affect layout. */
    box-shadow: inset 0 0 0 1px var(--ui-input-border-color);
    color: var(--ui-color-grey-1000);
    font-size: var(--ui-font-size-base);
    line-height: 22px;
    transition:
      background-color 0.2s,
      box-shadow 0.2s;
  }

  .ui-input.color-default {
    background: var(--ui-color-grey-300);
    --ui-input-border-color: var(--ui-color-grey-300);
  }

  .ui-input.color-white {
    background: var(--ui-color-grey-100);
    --ui-input-border-color: var(--ui-color-grey-400);
  }

  .ui-input.size-medium {
    height: 32px;
  }

  .ui-input.size-large {
    height: 40px;
  }

  .ui-input.textarea {
    min-height: inherit;
    height: auto;
  }

  /*
   * Background behavior intentionally matches the legacy input look:
   * - default color rests on grey
   * - hover deepens to grey-400
   * - focus / error / success switch back to white
   */
  .ui-input.color-default:not(
      :is([data-disabled='true'], [data-ui-state='error'], [data-ui-state='success'], :focus-within)
    ):hover {
    background: var(--ui-color-grey-400);
  }

  .ui-input.color-white:not(
      :is([data-disabled='true'], [data-ui-state='error'], [data-ui-state='success'], :focus-within)
    ):hover {
    background: var(--ui-color-grey-100);
  }

  .ui-input.color-default:not([data-disabled='true']):focus-within,
  .ui-input.color-default[data-ui-state='error'],
  .ui-input.color-default[data-ui-state='success'] {
    background: var(--ui-color-grey-100);
  }

  .ui-input.color-default:is([data-ui-state='error'], [data-ui-state='success']):not(
      :is([data-disabled='true'], :focus-within)
    ):hover {
    background: var(--ui-color-grey-400);
  }

  .ui-input[data-disabled='true'] {
    cursor: not-allowed;
    background: var(--ui-color-disabled-bg);
    color: var(--ui-color-disabled-text);
  }

  .wrapper {
    position: relative;
    z-index: 1;
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    padding: 0 12px;
  }

  .ui-input.textarea .wrapper {
    min-height: inherit;
    align-items: stretch;
  }

  .prefix,
  .suffix {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--ui-color-grey-800);
  }

  .ui-input[data-disabled='true'] .prefix,
  .ui-input[data-disabled='true'] .suffix {
    color: var(--ui-color-disabled-text);
  }

  .prefix {
    margin-right: 8px;
  }

  .suffix {
    margin-left: 4px;
  }

  .content {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
  }

  .ui-input.textarea .content {
    display: flex;
    min-height: inherit;
  }

  .content > :deep(input),
  .content > :deep(textarea) {
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

  .content > :deep(input:focus),
  .content > :deep(textarea:focus) {
    outline: none;
  }

  .content > :deep(input::placeholder),
  .content > :deep(textarea::placeholder) {
    color: var(--ui-color-grey-700);
  }

  .content > :deep(input:disabled),
  .content > :deep(textarea:disabled) {
    cursor: not-allowed;
    color: var(--ui-color-disabled-text);
  }

  .ui-input.textarea .content > :deep(textarea) {
    min-height: inherit;
    height: auto;
    padding-top: 5px;
    padding-bottom: 5px;
    resize: none;
    line-height: 22px;
  }

  .ui-input.size-large.textarea .content > :deep(textarea) {
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .ui-input[data-invalid='true'] .content > :deep(input),
  .ui-input[data-invalid='true'] .content > :deep(textarea) {
    text-decoration: line-through;
  }

  .ui-input:not([data-ui-state='success']):not([data-ui-state='error']):focus-within {
    --ui-input-border-color: var(--ui-color-primary-main);
  }

  .ui-input[data-ui-state='success'] {
    --ui-input-border-color: var(--ui-color-success-main);
  }

  .ui-input[data-ui-state='error'] {
    --ui-input-border-color: var(--ui-color-danger-main);
  }

  .ui-input[data-ui-state='error'] .content > :deep(input),
  .ui-input[data-ui-state='error'] .content > :deep(textarea) {
    caret-color: var(--ui-color-danger-main);
  }

  .content > :deep(input::-ms-reveal),
  .content > :deep(input::-ms-clear),
  .content > :deep(input::-webkit-outer-spin-button),
  .content > :deep(input::-webkit-inner-spin-button) {
    display: none;
    appearance: none;
  }
}
</style>
