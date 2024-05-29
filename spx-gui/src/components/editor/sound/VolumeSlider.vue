<template>
  <div class="volume-slider">
    <img :src="volumeDown" alt="Volume down" />
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
    <img :src="volumeUp" alt="Volume up" />
  </div>
</template>
<script setup lang="ts">
import { UISlider } from '@/components/ui'
import volumeDown from './icons/volume-down.svg'
import volumeUp from './icons/volume-up.svg'

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
</style>
