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
  <div class="avatar-zoom-slider">
    <button
      v-radar="{ name: 'Zoom out avatar button', desc: 'Click to zoom out the avatar image' }"
      class="zoom-button"
      type="button"
      :disabled="props.disabled || props.value <= props.min"
      @click="handleValueUpdate(props.value - props.buttonStep)"
    >
      <UIIcon class="zoom-icon" type="minus" />
    </button>

    <UISlider
      class="slider"
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
      class="zoom-button"
      type="button"
      :disabled="props.disabled || props.value >= props.max"
      @click="handleValueUpdate(props.value + props.buttonStep)"
    >
      <UIIcon class="zoom-icon" type="plus" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.avatar-zoom-slider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 366px;
  height: 48px;
}

.slider {
  flex: 1 1 auto;
  min-width: 0;

  &:deep(.n-slider-handle) {
    background: transparent;
    box-shadow: none;
  }

  &:deep(.n-slider-rail),
  &:deep(.n-slider-rail__fill) {
    height: 6px;
    border-radius: 999px;
  }
}

.slider:deep(.thumb) {
  box-sizing: border-box;
  box-shadow:
    inset 0 0 0 2px var(--ui-color-primary-400),
    0 1px 2px rgb(36 41 47 / 10%);
}

.zoom-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: none;
  color: var(--ui-color-grey-900);
  cursor: pointer;

  &:not(:disabled):hover {
    color: var(--ui-color-grey-1000);
  }

  &:disabled {
    color: var(--ui-color-grey-700);
    cursor: not-allowed;
  }
}

.zoom-icon {
  width: 20px;
  height: 20px;
}
</style>
