<script lang="ts">
export type Pos = { x: number; y: number }

const lineColor = 'rgba(255, 108, 39, 1)'
const labelColor = 'rgba(51, 51, 51, 0.85)'

/** Distance (in map coordinates) within which an endpoint sticks to a snap target. */
const snapRadius = 24
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type Konva from 'konva'
import type { LayerConfig } from 'konva/lib/Layer'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { LineConfig } from 'konva/lib/shapes/Line'
import type { CircleConfig } from 'konva/lib/shapes/Circle'

const props = defineProps<{
  /** Whether the user is currently in measuring mode. */
  active: boolean
  /** Position of the map layer, which the ruler follows so measurements stay pinned while panning. */
  mapPos: Pos
  mapSize: { width: number; height: number }
  /** Points the endpoints stick to, in map coordinates. */
  snapTargets: Pos[]
}>()

const layerRef = ref<{ getNode(): Konva.Layer } | null>(null)
const measurement = ref<{ from: Pos; to: Pos } | null>(null)
let measuring = false

const distance = computed(() => {
  if (measurement.value == null) return 0
  const { from, to } = measurement.value
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y))
})

function snap(pos: Pos): Pos {
  let nearest: Pos | null = null
  let nearestDistance = Infinity
  for (const target of props.snapTargets) {
    const targetDistance = Math.hypot(target.x - pos.x, target.y - pos.y)
    if (targetDistance < nearestDistance) {
      nearest = target
      nearestDistance = targetDistance
    }
  }
  return nearest != null && nearestDistance <= snapRadius ? nearest : pos
}

function getPointerPos(): Pos | null {
  // The layer shares the map's coordinate system, so its relative pointer position is already
  // in map coordinates — the same space `snapTargets` and the measured distance live in.
  const pos = layerRef.value?.getNode().getRelativePointerPosition()
  return pos == null ? null : snap(pos)
}

function stopMeasuring() {
  measuring = false
  window.removeEventListener('mouseup', stopMeasuring)
}

function handleMouseDown() {
  const pos = getPointerPos()
  if (pos == null) return
  measurement.value = { from: pos, to: pos }
  measuring = true
  // The mouse may be released outside the stage; keep listening globally until it is.
  window.addEventListener('mouseup', stopMeasuring)
}

function handleMouseMove() {
  if (!measuring || measurement.value == null) return
  const pos = getPointerPos()
  if (pos == null) return
  measurement.value = { from: measurement.value.from, to: pos }
}

watch(
  () => props.active,
  (active) => {
    if (active) return
    stopMeasuring()
    measurement.value = null
  }
)

onUnmounted(stopMeasuring)

const layerConfig = computed(
  () =>
    ({
      ...props.mapPos,
      listening: props.active
    }) satisfies LayerConfig
)

const captureRectConfig = computed(
  () =>
    ({
      width: props.mapSize.width,
      height: props.mapSize.height,
      // Invisible, but still hit-tested: it takes the drag so that the map layer below does not
      // pan the camera while the user is measuring.
      fill: 'transparent'
    }) satisfies RectConfig
)

const lineConfig = computed<LineConfig | null>(() => {
  if (measurement.value == null) return null
  const { from, to } = measurement.value
  return {
    points: [from.x, from.y, to.x, to.y],
    stroke: lineColor,
    strokeWidth: 2,
    dash: [6, 4],
    listening: false
  }
})

function endpointConfig(pos: Pos): CircleConfig {
  return {
    ...pos,
    radius: 4,
    fill: lineColor,
    listening: false
  }
}

const labelPos = computed<Pos | null>(() => {
  if (measurement.value == null) return null
  const { from, to } = measurement.value
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 8 }
})
</script>

<template>
  <v-layer ref="layerRef" :config="layerConfig">
    <v-rect :config="captureRectConfig" @mousedown="handleMouseDown" @mousemove="handleMouseMove" />
    <template v-if="measurement != null && lineConfig != null && labelPos != null">
      <v-line :config="lineConfig" />
      <v-circle :config="endpointConfig(measurement.from)" />
      <v-circle :config="endpointConfig(measurement.to)" />
      <v-label :config="{ ...labelPos, listening: false }">
        <v-tag
          :config="{ fill: labelColor, cornerRadius: 4, pointerDirection: 'down', pointerWidth: 8, pointerHeight: 5 }"
        />
        <v-text :config="{ text: `${distance}`, fontSize: 14, fontStyle: 'bold', fill: '#fff', padding: 5 }" />
      </v-label>
    </template>
  </v-layer>
</template>
