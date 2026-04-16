<template>
  <div :class="rootClass" :data-ui-state="validationState">
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
import { computed, onBeforeUnmount, provide, useId, useSlots } from 'vue'
import {
  defaultFormFieldConfig,
  formFieldContextKey,
  useFormContext,
  type FormFieldConfig,
  type FormFieldIds,
  type FormFieldValidationState
} from './context'
import { cn, type ClassValue } from '../utils'

const props = withDefaults(
  defineProps<{
    label?: string
    path?: string
    class?: ClassValue
    config?: Partial<FormFieldConfig>
  }>(),
  {
    label: undefined,
    path: undefined,
    class: undefined,
    config: undefined
  }
)

const rootClass = computed(() => cn('flex flex-col [&+&]:mt-6', props.class ?? null))

const slots = useSlots()
const formCtx = useFormContext()
const baseId = useId()

const ids: FormFieldIds = {
  labelId: `${baseId}-label`,
  controlId: `${baseId}-control`,
  tipId: `${baseId}-tip`,
  errorId: `${baseId}-error`
}

const mergedConfig: FormFieldConfig = {
  ...defaultFormFieldConfig,
  ...props.config
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

let isComposing = false
let blurTimer: ReturnType<typeof setTimeout> | null = null

function validateCurrentField() {
  const path = props.path
  if (path == null) return
  // We intentionally ignore the returned promise here: UI feedback reacts to
  // `form.validated[path]`, which `validateField()` updates as a side effect.
  void formCtx.form.validateField(path)
}

const onInput = debounce(() => {
  if (isComposing || !mergedConfig.validateOn.includes('input')) return
  validateCurrentField()
}, mergedConfig.inputDebounce)

function onChange() {
  if (!mergedConfig.validateOn.includes('change')) return
  validateCurrentField()
}

function onBlur() {
  if (!mergedConfig.validateOn.includes('blur')) return
  if (blurTimer != null) clearTimeout(blurTimer)
  blurTimer = setTimeout(() => {
    validateCurrentField()
    blurTimer = null
  }, mergedConfig.blurDelay)
}

function onCompositionStart() {
  isComposing = true
}

function onCompositionEnd() {
  isComposing = false
  // The final composed value may not have been validated yet, so re-enter the
  // normal input path after IME composition finishes.
  onInput()
}

onBeforeUnmount(() => {
  onInput.cancel()
  if (blurTimer != null) clearTimeout(blurTimer)
})

provide(formFieldContextKey, {
  path: props.path,
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
