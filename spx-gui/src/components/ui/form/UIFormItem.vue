<template>
  <div :class="cn('flex flex-col [&+&]:mt-6', props.class)">
    <div v-if="props.label != null" :id="ids.labelId" class="mb-1 text-hint-1">
      {{ props.label }}
    </div>
    <div class="flex flex-col">
      <slot></slot>
    </div>
    <p v-if="feedback != null" :id="ids.errorId" class="mt-1 text-danger-500">
      {{ feedback }}
    </p>
    <p v-if="slots.tip != null" :id="ids.tipId" class="mt-1 text-hint-1">
      <slot name="tip"></slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash'
import { computed, nextTick, onBeforeUnmount, provide, toRef, useId, useSlots, watch } from 'vue'
import { formFieldContextKey, useFormContext, type FormFieldIds, type FormFieldValidationState } from './context'
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    label?: string
    path?: string
    class?: ClassValue
  }>(),
  {
    label: undefined,
    path: undefined,
    class: undefined
  }
)

const slots = useSlots()
const formCtx = useFormContext()
const baseId = useId()

const ids: FormFieldIds = {
  labelId: `${baseId}-label`,
  controlId: `${baseId}-control`,
  tipId: `${baseId}-tip`,
  errorId: `${baseId}-error`
}

const validated = computed(() => {
  const path = props.path
  if (path == null) return null
  return formCtx.form.validated[path]
})

const feedback = computed(() => {
  const result = validated.value
  return result?.hasError ? result.error : null
})

const invalid = computed(() => feedback.value != null)
const validationState = computed<FormFieldValidationState>(() => {
  const result = validated.value
  if (result == null) return 'default'
  if (result.hasError) return 'error'
  return formCtx.hasSuccessFeedback ? 'success' : 'default'
})

const describedBy = computed(() => {
  const idsList = [] as string[]
  if (slots.tip != null) idsList.push(ids.tipId)
  if (invalid.value) idsList.push(ids.errorId)
  return idsList.length > 0 ? idsList.join(' ') : undefined
})

const labelledBy = computed(() => (props.label != null ? ids.labelId : undefined))
const fieldValue = computed(() => {
  const path = props.path
  if (path == null) return undefined
  return formCtx.form.value[path]
})

function validateCurrentField() {
  const path = props.path
  if (path == null) return
  // We intentionally ignore the returned promise here: UI feedback reacts to
  // `form.validated[path]`, which `validateWithPath()` updates as a side effect.
  void formCtx.form.validateWithPath(path)
}

/**
 * See: https://github.com/goplus/builder/issues/2089
 *
 * When using IME (Input Method Editor), input characters may be lost due to component updates during composition.
 *
 * Introduce the `isComposing` flag to track IME composition status.
 * Prevent `handleInput` from triggering validation while composing.
 * Debounce is used to reduce validation frequency in normal scenarios.
 * Effectively avoids unexpected updates and character loss during rapid IME input.
 */
let isComposing = false
function onCompositionStart() {
  isComposing = true
}
function onCompositionEnd() {
  isComposing = false
  // The final composed value may not have been validated yet, so re-enter the
  // normal input path after IME composition finishes.
  onInput()
}

const handleInput = debounce(() => {
  if (isComposing) return
  validateCurrentField()
}, 300)

/**
 * Narrowed external-value sync:
 *
 * - if a field has already entered a validated state, programmatic value changes should re-sync
 *   validation so the rendered feedback doesn't go stale;
 * - but if the value change is the immediate prop round-trip from this field's own `onInput` /
 *   `onChange`, we should not validate twice.
 *
 * We mark the current tick as locally initiated, then let the watcher ignore that round-trip.
 */
let suppressExternalValueSync = false

function markLocalValueChange() {
  suppressExternalValueSync = true
  // We only want to suppress the synchronous prop round-trip caused by the current control event.
  // Releasing the guard on `nextTick()` keeps same-tick local updates from double-validating,
  // while still letting later async/programmatic value changes be treated as external sync targets.
  void nextTick(() => {
    suppressExternalValueSync = false
  })
}

function onInput() {
  markLocalValueChange()
  handleInput()
}

function onChange() {
  markLocalValueChange()
  validateCurrentField()
}

let blurTimer: ReturnType<typeof setTimeout> | null = null

function onBlur() {
  if (blurTimer != null) clearTimeout(blurTimer)
  blurTimer = setTimeout(() => {
    validateCurrentField()
    blurTimer = null
  }, 200)
}

/**
 * Once a field already has a validation result, keep that result in sync with external/programmatic
 * value changes as well. This avoids stale error/success UI after parent code mutates
 * `form.value[path]` directly.
 *
 * The guard above keeps local control-originated updates from re-triggering an extra validation pass.
 */
watch(fieldValue, () => {
  if (props.path == null) return
  if (validated.value == null) return
  if (suppressExternalValueSync) return
  validateCurrentField()
})

onBeforeUnmount(() => {
  handleInput.cancel()
  if (blurTimer != null) clearTimeout(blurTimer)
})

provide(formFieldContextKey, {
  path: toRef(props, 'path'),
  ids,
  validationState,
  feedback,
  invalid,
  describedBy,
  labelledBy,
  onInput,
  onChange,
  onBlur,
  onCompositionStart,
  onCompositionEnd
})
</script>
