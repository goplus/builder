<script setup lang="ts">
import { computed } from 'vue'
import type { CircleConfig } from 'konva/lib/shapes/Circle'
import type { GroupConfig } from 'konva/lib/Group'
import type { RectConfig } from 'konva/lib/shapes/Rect'

const props = withDefaults(
  defineProps<{
    size?: number
    primaryColor: string
    showHitArea?: boolean
  }>(),
  {
    size: 16,
    showHitArea: false
  }
)

const markerViewBoxSize = 24

const drawingGroupConfig = computed<GroupConfig>(() => {
  const scale = props.size / markerViewBoxSize
  return {
    x: (-markerViewBoxSize / 2) * scale,
    y: (-markerViewBoxSize / 2) * scale,
    scale: {
      x: scale,
      y: scale
    },
    listening: false
  }
})

const hitConfig = computed<CircleConfig>(
  () =>
    ({
      radius: props.size / 2,
      fill: 'rgba(0, 0, 0, 0.01)'
    }) satisfies CircleConfig
)

const circleConfig = computed<CircleConfig>(
  () =>
    ({
      x: markerViewBoxSize / 2,
      y: markerViewBoxSize / 2,
      radius: 9,
      fill: 'white',
      listening: false
    }) satisfies CircleConfig
)

const outerTabConfigs = computed<RectConfig[]>(
  () =>
    [
      { x: 0, y: 10, width: 4, height: 4, cornerRadius: 2, fill: 'white', listening: false },
      { x: 20, y: 10, width: 4, height: 4, cornerRadius: 2, fill: 'white', listening: false },
      { x: 10, y: 0, width: 4, height: 4, cornerRadius: 2, fill: 'white', listening: false },
      { x: 10, y: 20, width: 4, height: 4, cornerRadius: 2, fill: 'white', listening: false }
    ] satisfies RectConfig[]
)

const innerShapeConfigs = computed<RectConfig[]>(
  () =>
    [
      { x: 1, y: 11, width: 4, height: 2, cornerRadius: 1, fill: props.primaryColor, listening: false },
      { x: 19, y: 11, width: 4, height: 2, cornerRadius: 1, fill: props.primaryColor, listening: false },
      { x: 11, y: 1, width: 2, height: 4, cornerRadius: 1, fill: props.primaryColor, listening: false },
      { x: 11, y: 19, width: 2, height: 4, cornerRadius: 1, fill: props.primaryColor, listening: false },
      { x: 9, y: 11, width: 6, height: 2, cornerRadius: 1, fill: props.primaryColor, listening: false },
      { x: 11, y: 9, width: 2, height: 6, cornerRadius: 1, fill: props.primaryColor, listening: false }
    ] satisfies RectConfig[]
)

const ringConfig = computed<CircleConfig>(
  () =>
    ({
      x: markerViewBoxSize / 2,
      y: markerViewBoxSize / 2,
      radius: 7,
      stroke: props.primaryColor,
      strokeWidth: 2,
      listening: false
    }) satisfies CircleConfig
)
</script>

<template>
  <v-circle v-if="showHitArea" :config="hitConfig" />
  <v-group :config="drawingGroupConfig">
    <v-circle :config="circleConfig" />
    <v-rect v-for="(rectConfig, idx) in outerTabConfigs" :key="`pivot-outer-${idx}`" :config="rectConfig" />
    <v-rect v-for="(rectConfig, idx) in innerShapeConfigs" :key="`pivot-inner-${idx}`" :config="rectConfig" />
    <v-circle :config="ringConfig" />
  </v-group>
</template>
