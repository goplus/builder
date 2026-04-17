<template>
  <UIInputFrame
    :validation-state="validationState"
    :disabled="props.disabled"
    :readonly="props.readonly"
    :invalid="displayedValueInvalid"
    :focus-control="focusControl"
  >
    <template v-if="slots.prefix != null" #prefix>
      <slot name="prefix"></slot>
    </template>

    <input
      ref="controlRef"
      v-bind="controlBindings"
      :placeholder="props.placeholder || ''"
      :value="displayedValue"
      :disabled="props.disabled"
      :readonly="props.readonly"
      inputmode="decimal"
      @input="handleInput"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeyDown"
    />

    <template v-if="slots.suffix != null" #suffix>
      <slot name="suffix"></slot>
    </template>
  </UIInputFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useSlots, watch } from 'vue'
import UIInputFrame from './UIInputFrame.vue'
import { useFormControl } from '../form/useFormControl'

/**
 * Native replacement for the old `naive-ui` number input.
 *
 * Current goal: reliably cover the behaviors that are already used in this workspace:
 * - plain numeric editing backed by `number | null`
 * - `min` / `max` / `step`
 * - in-progress decimal values such as `1.` or `.5`
 * - blur-time normalization / clamping
 * - arrow-up / arrow-down stepping
 * - prefix / suffix slots and form validation state integration
 *
 * Intentionally not implemented yet because the current project doesn't depend on them:
 * - custom `parse` / `format`
 * - explicit `precision` prop
 * - custom `validator`
 * - `updateValueOnInput` behavior switch
 * - clearable number input UI
 * - +/- step buttons and hold-to-step interactions
 *
 * If any of those become product requirements later, extend the derivation pipeline here
 * instead of re-introducing `naive-ui`.
 */

const props = defineProps<{
  value: number | null
  disabled?: boolean
  readonly?: boolean
  min?: number | string
  max?: number | string
  step?: number | string
  placeholder?: string
  autofocus?: boolean
}>()

const emit = defineEmits<{
  'update:value': [number | null]
}>()

const slots = useSlots()
const { controlBindings, onBlur, onInput, validationState } = useFormControl()

/** Parse numeric-like props (`min`, `max`, `step`) while tolerating undefined and invalid strings. */
function parseNumberish(value: number | string | undefined) {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** Count fractional digits so stepping can avoid common floating-point drift. */
function getPrecision(value: number) {
  const normalizedValue = String(value).toLowerCase()
  const [mantissa, exponentText] = normalizedValue.split('e')
  const fractionLength = mantissa.split('.')[1]?.length ?? 0
  if (exponentText == null) return fractionLength

  const exponent = Number(exponentText)
  return Math.max(0, fractionLength - exponent)
}

/**
 * Values like `1.`, `1.0`, `.5` are still being typed and should not be eagerly normalized.
 * This mirrors the old input-number behavior where the displayed string can temporarily diverge
 * from the committed numeric value.
 */
function isWipValue(value: string) {
  return value.includes('.') && (/^(-)?\d+.*([.]|0)$/.test(value) || /^\.\d+$/.test(value))
}

/** Keep the input DOM driven by a string representation, even though the public value is numeric. */
function formatValue(value: number | null) {
  return value == null ? '' : String(value)
}

const minValue = computed(() => parseNumberish(props.min))
const maxValue = computed(() => parseNumberish(props.max))
const stepValue = computed(() => {
  const parsed = parseNumberish(props.step)
  if (parsed == null || parsed === 0) return 1
  return Math.abs(parsed)
})

/**
 * Reuse the same precision heuristics as Naive UI's input-number core:
 * current value, min/max and step all participate in the maximum precision we preserve.
 */
function getMaxPrecision(currentValue: number) {
  return Math.max(
    getPrecision(currentValue),
    minValue.value == null ? 0 : getPrecision(minValue.value),
    maxValue.value == null ? 0 : getPrecision(maxValue.value),
    getPrecision(stepValue.value)
  )
}

const displayedValue = ref(formatValue(props.value))
const focused = ref(false)
const controlRef = ref<HTMLInputElement | null>(null)

/** Rebuild the displayed string from the committed numeric value. */
function deriveDisplayedValueFromValue(value = props.value) {
  displayedValue.value = formatValue(value)
}

watch(
  () => props.value,
  (value) => {
    // While the user is actively typing an unfinished/invalid number, preserve the raw text.
    if (focused.value && (isWipValue(displayedValue.value) || displayedValueInvalid.value)) return
    deriveDisplayedValueFromValue(value)
  }
)

/**
 * Emit only when the numeric value actually changes.
 * If the value is unchanged, we still normalize the displayed string so blur/input edge cases settle.
 */
function doUpdateValue(value: number | null, notify = true) {
  if (value === props.value) {
    deriveDisplayedValueFromValue(value)
    return
  }
  emit('update:value', value)
  if (notify) onInput()
}

function deriveValueFromDisplayedValue(options: {
  offset: number
  doUpdateIfValid: boolean
  allowWip: boolean
  fixPrecision: boolean
}) {
  // This is the main numeric derivation pipeline used by typing, blur normalization and stepping.
  const value = displayedValue.value
  if (value.trim() === '') {
    if (options.doUpdateIfValid) doUpdateValue(null)
    return null
  }
  if (options.allowWip && isWipValue(value)) return false

  const parsed = Number(value)
  if (Number.isNaN(parsed)) return false

  let nextValue = parsed
  if (options.fixPrecision || options.offset !== 0) {
    const precision = getMaxPrecision(parsed)
    const offsetValue = parsed + options.offset
    nextValue = precision > 100 ? offsetValue : parseFloat(offsetValue.toFixed(precision))
  }

  if (!options.fixPrecision && options.offset === 0) {
    nextValue = parsed
  }

  if (minValue.value != null && nextValue < minValue.value) {
    if (!options.doUpdateIfValid || options.allowWip) return false
    nextValue = minValue.value
  }

  if (maxValue.value != null && nextValue > maxValue.value) {
    if (!options.doUpdateIfValid || options.allowWip) return false
    nextValue = maxValue.value
  }

  if (options.doUpdateIfValid) {
    doUpdateValue(nextValue)
  }

  return nextValue
}

function createNextValue() {
  let nextValue = 0
  if (minValue.value != null && nextValue < minValue.value) {
    nextValue = minValue.value
  }
  if (maxValue.value != null && nextValue > maxValue.value) {
    nextValue = maxValue.value
  }
  return nextValue
}

const displayedValueInvalid = computed(
  () =>
    deriveValueFromDisplayedValue({ offset: 0, doUpdateIfValid: false, allowWip: false, fixPrecision: false }) === false
)

function handleInput(event: Event) {
  displayedValue.value = (event.target as HTMLInputElement).value
  // While typing, we allow WIP values and only commit when the string already represents a valid number.
  void deriveValueFromDisplayedValue({ offset: 0, doUpdateIfValid: true, allowWip: true, fixPrecision: false })
}

function handleFocus() {
  focused.value = true
}

function handleBlur() {
  focused.value = false
  // Blur is the commit point: clamp to min/max, fix precision and rewrite the displayed string.
  const parsedValue = deriveValueFromDisplayedValue({
    offset: 0,
    doUpdateIfValid: true,
    allowWip: false,
    fixPrecision: true
  })
  if (parsedValue === false) {
    deriveDisplayedValueFromValue()
  } else {
    deriveDisplayedValueFromValue(parsedValue)
  }
  onBlur()
}

function doStep(offset: number) {
  // Arrow-key stepping reuses the same derivation rules so typing/blur/step stay consistent.
  const parsedValue = deriveValueFromDisplayedValue({
    offset,
    doUpdateIfValid: false,
    allowWip: false,
    fixPrecision: true
  })
  if (parsedValue === false) return

  const nextValue = parsedValue === null ? createNextValue() : parsedValue
  deriveDisplayedValueFromValue(nextValue)
  doUpdateValue(nextValue)
}

function handleKeyDown(event: KeyboardEvent) {
  if (props.disabled || props.readonly) return
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

  event.preventDefault()
  doStep(event.key === 'ArrowUp' ? stepValue.value : -stepValue.value)
}

const focusControl = () => {
  controlRef.value?.focus()
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
