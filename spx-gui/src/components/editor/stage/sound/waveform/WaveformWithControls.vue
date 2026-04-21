<template>
  <div class="relative h-full w-full overflow-hidden rounded-md bg-grey-300">
    <WaveformDisplay
      class="h-full w-full"
      :points="waveformData"
      :scale="gain"
      :draw-padding-right="drawPaddingRight"
    />
    <WaveformRangeControl
      :value="range"
      @update:value="emit('update:range', $event)"
      @stop-drag="emit('requestPlay')"
    />
    <div class="absolute top-0 right-4 bottom-0 left-4">
      <div v-if="progress" class="absolute top-0 bottom-0 left-0 w-px bg-primary-main" :style="progressStyle" />
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
