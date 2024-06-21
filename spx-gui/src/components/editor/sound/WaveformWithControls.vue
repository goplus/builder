<template>
  <div class="container">
    <div class="waveform-container">
      <WaveformDisplay
        :height="height"
        class="waveform"
        :points="waveformData"
        :scale="gain"
        :draw-padding-right="drawPaddingRight"
      />
    </div>
    <WaveformRangeControl
      :value="range"
      @update:value="emit('update:range', $event)"
      @stop-drag="emit('requestPlay')"
    />
    <div class="cursor-container">
      <div v-if="progress" class="cursor" :style="progressStyle" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import WaveformRangeControl from './WaveformRangeControl.vue'
import WaveformDisplay from './WaveformDisplay.vue'

const props = defineProps<{
  waveformData: number[]
  range: { left: number; right: number }
  gain: number
  progress: number
  height: number
  drawPaddingRight?: number
}>()

const emit = defineEmits<{
  'update:range': [value: { left: number; right: number }]
  requestPlay: []
}>()

const progressStyle = computed(() => {
  return {
    left: `${(props.range.left + props.progress * (props.range.right - props.range.left)) * 100}%`
  }
})
</script>
<style lang="scss" scoped>
.container {
  position: relative;
  .waveform {
    width: 100%;
  }
  .waveform-container {
    padding: 0 16px;
  }
  border-radius: 12px;
  background-color: var(--ui-color-grey-300);
  overflow: hidden;
}

.cursor {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 1px;
  background-color: var(--ui-color-grey-800);
}

.cursor-container {
  position: absolute;
  top: 0;
  left: 16px;
  bottom: 0;
  right: 16px;
}
</style>
