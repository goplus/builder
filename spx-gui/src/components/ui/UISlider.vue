<template>
  <div class="group" :class="rootClass" :data-ui-state="validationState" :style="rootStyle">
    <div :class="railClass">
      <div
        class="absolute inset-y-0 left-0 rounded-full bg-(--ui-slider-fill-color)"
        :style="{ width: `${fillPercent}%` }"
      ></div>
      <div
        class="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center bg-transparent shadow-none"
        :style="{ left: `${fillPercent}%` }"
      >
        <!--
          NOTE: Intentionally use `group-hover` instead of handle-only hover.
          Unlike Naive UI, the visible thumb here is only a visual layer and the native
          transparent range input owns pointer interaction, so matching handle-only hover
          would require extra pointer tracking or a custom drag implementation.
        -->
        <div
          class="h-5 w-5 rounded-full bg-white transition-transform duration-200"
          :class="props.disabled ? null : 'group-hover:scale-[1.2]'"
          :style="{ boxShadow }"
        ></div>
      </div>
    </div>

    <input
      v-bind="controlBindings"
      class="absolute inset-0 m-0 h-full w-full cursor-pointer opacity-0 appearance-none outline-none disabled:cursor-not-allowed focus:outline-none"
      type="range"
      :min="minValue"
      :max="maxValue"
      :step="stepValue"
      :value="localValue"
      :disabled="props.disabled"
      @input="handleNativeInput"
      @change="handleNativeChange"
      @blur="onBlur"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useFormControl } from './form/useFormControl'
import { cn, type ClassValue } from './utils'

const props = withDefaults(
  defineProps<{
    color?: 'primary' | 'sound'
    value?: number
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    updateOn?: 'dragend' | 'input'
    class?: ClassValue
    railClass?: ClassValue
  }>(),
  {
    color: 'primary',
    value: 0,
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    updateOn: 'dragend',
    class: undefined,
    railClass: undefined
  }
)

const emit = defineEmits<{
  'update:value': [number]
}>()

const rootClass = computed(() => cn('relative h-5 w-full min-w-0 inline-flex items-center', props.class ?? null))
const railClass = computed(() =>
  cn(
    'relative h-1 w-full rounded-full bg-(--ui-slider-rail-color) transition-colors duration-200',
    props.disabled
      ? null
      : 'group-hover:bg-(--ui-slider-rail-hover-color) group-focus-within:bg-(--ui-slider-rail-hover-color)',
    props.railClass ?? null
  )
)

const { controlBindings, onBlur, onChange, onInput, validationState } = useFormControl()

const minValue = computed(() => Math.min(props.min, props.max))
const maxValue = computed(() => Math.max(props.min, props.max))
const stepValue = computed(() => (props.step > 0 ? props.step : 1))

function clampValue(value: number) {
  return Math.min(maxValue.value, Math.max(minValue.value, value))
}

const localValue = ref(clampValue(props.value))
watch(
  () => [props.value, minValue.value, maxValue.value] as const,
  ([value]) => {
    localValue.value = clampValue(value)
  }
)

const fillPercent = computed(() => {
  const range = maxValue.value - minValue.value
  if (range <= 0) return 0
  return ((localValue.value - minValue.value) / range) * 100
})

const rootStyle = computed(() => ({
  '--ui-slider-fill-color': `var(--ui-color-${props.color}-500)`,
  '--ui-slider-rail-color': 'rgb(245,245,245)',
  '--ui-slider-rail-hover-color': 'rgb(219,219,223)'
}))

const boxShadow = computed(() => {
  return `inset 0 0 0 1px var(--ui-color-${props.color}-500)`
})

function handleNativeInput(event: Event) {
  const nextValue = clampValue(Number((event.target as HTMLInputElement).value))
  localValue.value = nextValue

  if (props.updateOn !== 'input') return
  emit('update:value', nextValue)
  onInput()
}

function handleNativeChange(event: Event) {
  const nextValue = clampValue(Number((event.target as HTMLInputElement).value))
  localValue.value = nextValue

  if (props.updateOn === 'dragend') {
    emit('update:value', nextValue)
  }

  onChange()
}
</script>
