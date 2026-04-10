<script setup lang="ts">
import { UIIcon, UISlider } from '@/components/ui'

const props = withDefaults(
  defineProps<{
    value: number
    disabled?: boolean
    min?: number
    max?: number
    step?: number
    buttonStep?: number
  }>(),
  {
    disabled: false,
    min: 1,
    max: 3,
    step: 0.01,
    buttonStep: 0.1
  }
)

const emit = defineEmits<{
  'update:value': [number]
}>()

function handleValueUpdate(value: number) {
  const nextValue = Number(Math.min(props.max, Math.max(props.min, value)).toFixed(2))
  if (nextValue === props.value) return
  emit('update:value', nextValue)
}
</script>

<template>
  <div class="h-12 w-91.5 flex items-center justify-center gap-2.5">
    <button
      v-radar="{ name: 'Zoom out avatar button', desc: 'Click to zoom out the avatar image' }"
      class="h-6 w-6 flex-none flex items-center justify-center border-none bg-transparent p-0 text-grey-900 enabled:cursor-pointer enabled:hover:text-grey-1000 disabled:cursor-not-allowed disabled:text-grey-700"
      type="button"
      :disabled="props.disabled || props.value <= props.min"
      @click="handleValueUpdate(props.value - props.buttonStep)"
    >
      <UIIcon class="w-5 h-5" type="minus" />
    </button>

    <UISlider
      class="slider flex-auto min-w-0"
      update-on="input"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :value="props.value"
      :disabled="props.disabled"
      :tooltip="false"
      @update:value="handleValueUpdate"
    />

    <button
      v-radar="{ name: 'Zoom in avatar button', desc: 'Click to zoom in the avatar image' }"
      class="h-6 w-6 flex-none flex items-center justify-center border-none bg-transparent p-0 text-grey-900 enabled:cursor-pointer enabled:hover:text-grey-1000 disabled:cursor-not-allowed disabled:text-grey-700"
      type="button"
      :disabled="props.disabled || props.value >= props.max"
      @click="handleValueUpdate(props.value + props.buttonStep)"
    >
      <UIIcon class="w-5 h-5" type="plus" />
    </button>
  </div>
</template>

<style scoped>
.slider {
}

.slider:deep(.n-slider-handle) {
  background: transparent;
  box-shadow: none;
}

.slider:deep(.n-slider-rail),
.slider:deep(.n-slider-rail__fill) {
  height: 6px;
  border-radius: 999px;
}

.slider:deep(.ui-slider-thumb) {
  box-sizing: border-box;
  box-shadow:
    inset 0 0 0 2px var(--ui-color-primary-400),
    0 1px 2px rgb(36 41 47 / 10%);
}
</style>
