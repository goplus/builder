<template>
  <div class="volume-slider">
    <UIIcon type="volumeOff" class="volume-icon" />
    <UISlider
      class="slider"
      color="sound"
      :min="0"
      :max="2"
      :step="0.01"
      :value="value"
      :tooltip="false"
      @update:value="(v) => emit('update:value', v)"
    />
    <UIIcon type="volumeUp" class="volume-icon" />
  </div>
</template>
<script setup lang="ts">
import { UIIcon, UISlider } from '@/components/ui'

defineProps<{
  value: number
}>()

const emit = defineEmits<{
  'update:value': [number]
}>()
</script>
<style scoped lang="scss">
.volume-slider {
  display: flex;
  gap: 8px;
  align-items: center;
}

.volume-icon {
  width: 24px;
  height: 24px;
  color: #6e7781;
}
</style>
