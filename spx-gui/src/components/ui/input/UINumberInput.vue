<template>
  <UIInputFrame
    class="ui-number-input"
    :validation-state="validationState"
    :disabled="props.disabled"
    :invalid="displayValueInvalid"
    :color="props.color"
    :size="props.size"
    :focus-control="focusControl"
  >
    <template v-if="slots.prefix != null" #prefix>
      <slot name="prefix"></slot>
    </template>

    <input
      ref="controlRef"
      v-bind="controlBindings"
      :placeholder="props.placeholder || ''"
      :value="displayValue"
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
import { useFieldControlBindings } from '../form/field-control-bindings'

type Color = 'default' | 'white'
type Size = 'medium' | 'large'

type NativeNumberInputFocusEvent = FocusEvent & {
  target: HTMLInputElement
  currentTarget: HTMLInputElement
}

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

const props = withDefaults(
  defineProps<{
    value: number | null
    color?: Color
    size?: Size
    disabled?: boolean
    readonly?: boolean
    min?: number | string
    max?: number | string
    step?: number | string
    placeholder?: string
    autofocus?: boolean
  }>(),
  {
    color: 'default',
    size: 'medium',
    disabled: false,
    readonly: false,
    min: undefined,
    max: undefined,
    step: undefined,
    placeholder: undefined,
    autofocus: false
  }
)

const emit = defineEmits<{
  'update:value': [number | null]
  // Forward non-bubbling focus/blur so component listeners keep the input-like behavior.
  focus: [NativeNumberInputFocusEvent]
  blur: [NativeNumberInputFocusEvent]
}>()

const slots = useSlots()

const controlRef = ref<HTMLInputElement | null>(null)
const { controlBindings, onBlur, onInput, validationState } = useFieldControlBindings()
const focused = ref(false)

const displayValue = ref(formatValue(props.value))

/** Keep the input DOM driven by a string representation, even though the public value is numeric. */
function formatValue(value: number | null) {
  return value == null ? '' : String(value)
}

/** Sync the displayed string from the committed numeric value. */
function syncDisplayValueFromValue(value: number | null) {
  displayValue.value = formatValue(value)
}

const minValue = computed(() => parseNumberish(props.min))
const maxValue = computed(() => parseNumberish(props.max))
const stepValue = computed(() => {
  const parsed = parseNumberish(props.step)
  if (parsed == null || parsed === 0) return 1
  return Math.abs(parsed)
})

/** Parse numeric-like props (`min`, `max`, `step`) while tolerating undefined and invalid strings. */
function parseNumberish(value: number | string | undefined) {
  if (value === undefined) return null
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

type DisplayValueAnalysis =
  | { kind: 'empty'; parsed: null }
  | { kind: 'wip'; parsed: number }
  | { kind: 'invalid'; parsed: null }
  | { kind: 'valid'; parsed: number }

/**
 * Values like `1.`, `1.0`, `.5` are still being typed and should not be eagerly normalized.
 * This mirrors the old input-number behavior where the displayed string can temporarily diverge
 * from the committed numeric value.
 */
function isWipValue(value: string) {
  return /^-?\d+\.$/.test(value) || /^-?\d*\.\d*0$/.test(value) || /^-?\.\d+$/.test(value)
}

/**
 * Parse the raw input string without side effects so all callers can share the same analysis result.
 * This keeps keystroke-time validation and commit decisions aligned while avoiding duplicate parsing work.
 */
const displayValueAnalysis = computed<DisplayValueAnalysis>(() => {
  const value = displayValue.value
  if (value.trim() === '') return { kind: 'empty', parsed: null }
  if (isWipValue(value)) return { kind: 'wip', parsed: Number(value) }

  const parsed = Number(value)
  if (Number.isNaN(parsed)) return { kind: 'invalid', parsed: null }
  return { kind: 'valid', parsed }
})

const displayValueInvalid = computed(() => isAnalysisInvalid(displayValueAnalysis.value))

function isAnalysisInvalid(analysis: DisplayValueAnalysis) {
  if (analysis.kind === 'invalid') return true
  // Keep empty / WIP states neutral while the user is still editing.
  if (analysis.kind === 'empty' || analysis.kind === 'wip') return false

  return (
    (minValue.value != null && analysis.parsed < minValue.value) ||
    (maxValue.value != null && analysis.parsed > maxValue.value)
  )
}

watch(
  () => props.value,
  (value) => {
    const analysis = displayValueAnalysis.value
    // While the user is actively typing an unfinished/invalid number, preserve the raw text.
    if (focused.value && (analysis.kind === 'wip' || isAnalysisInvalid(analysis))) return
    syncDisplayValueFromValue(value)
  }
)

/**
 * Emit only when the numeric value actually changes.
 * If the value is unchanged, we still normalize the displayed string so blur/input edge cases settle.
 */
function doUpdateValue(value: number | null) {
  if (value === props.value) {
    syncDisplayValueFromValue(value)
    return
  }
  emit('update:value', value)
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

function normalizeValue(value: number) {
  const precision = getMaxPrecision(value)
  return precision > 100 ? value : parseFloat(value.toFixed(precision))
}

function clampValue(value: number) {
  if (minValue.value != null && value < minValue.value) return minValue.value
  if (maxValue.value != null && value > maxValue.value) return maxValue.value
  return value
}

function handleInput(event: Event) {
  displayValue.value = (event.target as HTMLInputElement).value
  const analysis = displayValueAnalysis.value
  if (analysis.kind === 'wip' || isAnalysisInvalid(analysis)) {
    return
  }
  doUpdateValue(analysis.parsed)
  onInput()
}

function handleFocus(event: FocusEvent) {
  focused.value = true
  emit('focus', event as NativeNumberInputFocusEvent)
}

function handleBlur(event: FocusEvent) {
  focused.value = false
  // Blur is the commit point: clamp to min/max, fix precision and rewrite the displayed string.
  const analysis = displayValueAnalysis.value
  if (analysis.kind === 'empty') {
    doUpdateValue(null)
  } else if (analysis.kind === 'invalid') {
    syncDisplayValueFromValue(props.value)
  } else {
    const nextValue = clampValue(normalizeValue(analysis.parsed))
    doUpdateValue(nextValue)
    syncDisplayValueFromValue(nextValue)
  }
  onBlur()
  emit('blur', event as NativeNumberInputFocusEvent)
}

function deriveSteppedValue(value: number | null, offset: number) {
  if (value == null) return clampValue(0)

  const precision = getMaxPrecision(value)
  const offsetValue = value + offset
  const nextValue = precision > 100 ? offsetValue : parseFloat(offsetValue.toFixed(precision))

  if (minValue.value != null && nextValue < minValue.value) return false
  if (maxValue.value != null && nextValue > maxValue.value) return false
  return nextValue
}

function doStep(offset: number) {
  // Arrow-key stepping reuses the same derivation rules so typing/blur/step stay consistent.
  const analysis = displayValueAnalysis.value
  if (isAnalysisInvalid(analysis)) return

  const nextValue = deriveSteppedValue(analysis.parsed == null ? null : normalizeValue(analysis.parsed), offset)
  if (nextValue === false) return

  // Arrow-key stepping changes the value outside the native `input` event path,
  // so treat it as an input-like update for form validation timing.
  onInput()
  doUpdateValue(nextValue)
  syncDisplayValueFromValue(nextValue)
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

<style scoped>
/* Keep number input suffix spacing aligned with the previous UI. */
.ui-number-input :deep(.ui-input__wrapper) {
  padding-right: 8px;
}
</style>
