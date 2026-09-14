<script lang="ts">
import { headingToScreenDeg, segmentScreenDeg, turnAngle, type Pos } from './ruler-math'

export type { Pos }

/** A point the ruler endpoints stick to; when it has a heading, measuring from it also reads the turn angle. */
export type RulerSnapTarget = Pos & { heading: number | null }

const lineColor = 'rgba(255, 108, 39, 1)'
const labelColor = 'rgba(51, 51, 51, 0.85)'
const angleColor = 'rgba(10, 124, 255, 1)'

/** Distance (in map coordinates) within which an endpoint sticks to a snap target. */
const snapRadius = 24

/** Minimum measurement length (in map coordinates) before the turn angle is readable. */
const minAngleDistance = 12

const headingRayLength = 48
const angleArcRadius = 32
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type Konva from 'konva'
import type { LayerConfig } from 'konva/lib/Layer'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { LineConfig } from 'konva/lib/shapes/Line'
import type { CircleConfig } from 'konva/lib/shapes/Circle'
import type { ArcConfig } from 'konva/lib/shapes/Arc'

const props = defineProps<{
  /** Whether the user is currently in measuring mode. */
  active: boolean
  /** Position of the map layer, which the ruler follows so measurements stay pinned while panning. */
  mapPos: Pos
  mapSize: { width: number; height: number }
  /** Points the endpoints stick to, in map coordinates. */
  snapTargets: RulerSnapTarget[]
}>()

const layerRef = ref<{ getNode(): Konva.Layer } | null>(null)
const measurement = ref<{ from: Pos; fromHeading: number | null; to: Pos } | null>(null)
let measuring = false

const distance = computed(() => {
  if (measurement.value == null) return 0
  const { from, to } = measurement.value
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y))
})

function snap(pos: Pos): { pos: Pos; target: RulerSnapTarget | null } {
  let nearest: RulerSnapTarget | null = null
  let nearestDistance = Infinity
  for (const target of props.snapTargets) {
    const targetDistance = Math.hypot(target.x - pos.x, target.y - pos.y)
    if (targetDistance < nearestDistance) {
      nearest = target
      nearestDistance = targetDistance
    }
  }
  if (nearest != null && nearestDistance <= snapRadius) return { pos: { x: nearest.x, y: nearest.y }, target: nearest }
  return { pos, target: null }
}

function getPointerPos(): { pos: Pos; target: RulerSnapTarget | null } | null {
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
  const snapped = getPointerPos()
  if (snapped == null) return
  measurement.value = { from: snapped.pos, fromHeading: snapped.target?.heading ?? null, to: snapped.pos }
  measuring = true
  // The mouse may be released outside the stage; keep listening globally until it is.
  window.addEventListener('mouseup', stopMeasuring)
}

function handleMouseMove() {
  if (!measuring || measurement.value == null) return
  const snapped = getPointerPos()
  if (snapped == null) return
  measurement.value = { ...measurement.value, to: snapped.pos }
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

function screenDegToVector(deg: number): Pos {
  return { x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) }
}

/**
 * When the measurement starts on a sprite, also read the angle between the sprite's heading and
 * the measured segment — the exact number `turn` expects (signed: right positive, left negative).
 */
const angle = computed(() => {
  const m = measurement.value
  if (m == null || m.fromHeading == null) return null
  if (Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) < minAngleDistance) return null
  return {
    headingDeg: headingToScreenDeg(m.fromHeading),
    lineDeg: segmentScreenDeg(m.from, m.to),
    turn: Math.round(turnAngle(m.from, m.to, m.fromHeading))
  }
})

const headingRayConfig = computed<LineConfig | null>(() => {
  if (measurement.value == null || angle.value == null) return null
  const { from } = measurement.value
  const dir = screenDegToVector(angle.value.headingDeg)
  return {
    points: [from.x, from.y, from.x + dir.x * headingRayLength, from.y + dir.y * headingRayLength],
    stroke: angleColor,
    strokeWidth: 2,
    dash: [3, 3],
    listening: false
  }
})

const angleArcConfig = computed<ArcConfig | null>(() => {
  if (measurement.value == null || angle.value == null) return null
  const { headingDeg, lineDeg, turn } = angle.value
  return {
    ...measurement.value.from,
    innerRadius: angleArcRadius - 1,
    outerRadius: angleArcRadius + 1,
    // Konva sweeps clockwise from `rotation`; a left turn is drawn from the segment back to the ray.
    rotation: turn >= 0 ? headingDeg : lineDeg,
    angle: Math.abs(turn),
    fill: angleColor,
    listening: false
  }
})

const angleLabelPos = computed<Pos | null>(() => {
  if (measurement.value == null || angle.value == null) return null
  const { from } = measurement.value
  const midDeg = angle.value.headingDeg + angle.value.turn / 2
  const dir = screenDegToVector(midDeg)
  const distance = angleArcRadius + 14
  return { x: from.x + dir.x * distance, y: from.y + dir.y * distance }
})
</script>

<template>
  <v-layer ref="layerRef" :config="layerConfig">
    <v-rect :config="captureRectConfig" @mousedown="handleMouseDown" @mousemove="handleMouseMove" />
    <template v-if="measurement != null && lineConfig != null && labelPos != null">
      <template v-if="headingRayConfig != null && angleArcConfig != null && angleLabelPos != null && angle != null">
        <v-line :config="headingRayConfig" />
        <v-arc :config="angleArcConfig" />
        <v-label :config="{ ...angleLabelPos, listening: false }">
          <v-tag :config="{ fill: angleColor, cornerRadius: 4 }" />
          <v-text :config="{ text: `${angle.turn}°`, fontSize: 13, fontStyle: 'bold', fill: '#fff', padding: 4 }" />
        </v-label>
      </template>
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
