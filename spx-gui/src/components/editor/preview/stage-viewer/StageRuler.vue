<template>
  <svg
    class="pointer-events-none absolute top-0 left-0 z-5 overflow-visible"
    :width="viewportSize.width * stageScale"
    :height="viewportSize.height * stageScale"
  >
    <template v-for="tick in xTicks" :key="`x-${tick.value}`">
      <line
        :x1="tick.position"
        :x2="tick.position"
        y1="0"
        :y2="viewportSize.height * stageScale"
        stroke="rgba(37, 99, 235, 0.22)"
      />
      <text :x="tick.position + 3" y="13" fill="#1d4ed8" font-size="10">{{ tick.value }}</text>
    </template>
    <template v-for="tick in yTicks" :key="`y-${tick.value}`">
      <line
        x1="0"
        :x2="viewportSize.width * stageScale"
        :y1="tick.position"
        :y2="tick.position"
        stroke="rgba(37, 99, 235, 0.22)"
      />
      <text x="3" :y="tick.position - 3" fill="#1d4ed8" font-size="10">{{ tick.value }}</text>
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { Size } from '@/models/common'

const props = defineProps<{
  mapPos: { x: number; y: number }
  mapSize: Size
  viewportSize: Size
  stageScale: number
}>()

type Tick = { value: number; position: number }

function getTicks(min: number, max: number, toPosition: (value: number) => number): Tick[] {
  const step = 50
  const start = Math.ceil(min / step) * step
  const ticks: Tick[] = []
  for (let value = start; value <= max; value += step) {
    ticks.push({ value, position: toPosition(value) })
  }
  return ticks
}

const xTicks = computed(() => {
  const min = -props.mapSize.width / 2 - props.mapPos.x
  const max = min + props.viewportSize.width
  return getTicks(min, max, (x) => (props.mapSize.width / 2 + x + props.mapPos.x) * props.stageScale)
})

const yTicks = computed(() => {
  const max = props.mapSize.height / 2 + props.mapPos.y
  const min = max - props.viewportSize.height
  return getTicks(min, max, (y) => (props.mapSize.height / 2 - y + props.mapPos.y) * props.stageScale)
})
</script>
