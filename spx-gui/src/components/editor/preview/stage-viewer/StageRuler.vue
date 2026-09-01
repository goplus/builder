<script lang="ts">
import { headingToScreenDeg, segmentScreenDeg, turnAngle, type Pos } from './ruler-math'
import { clampLabelToRect, getVisibleMapRect, type LabelLayout } from './ruler-layout'
import { color } from '@/components/ui/tokens'

export type { Pos }

/** A point the ruler endpoints stick to; when it has a heading, measuring from it also reads the turn angle. */
export type RulerSnapTarget = Pos & { heading: number | null }

function rgba(hex: string, alpha: number) {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const lineColor = rgba(color.grey[1000], 0.5)
const labelColor = rgba(color.grey[1000], 0.5)
const angleColor = rgba(color.blue[600], 0.8)

/** Distance (in map coordinates) within which an endpoint sticks to a snap target. */
const snapRadius = 24

/** Minimum measurement length (in map coordinates) before the turn angle is readable. */
const minAngleDistance = 12

// The arc should frame the core sprite; the blue heading ray uses this exact
// radius so both angle boundaries remain coupled and share the same endpoint.
const angleArcRadius = 36
const headingRayLength = angleArcRadius
const labelFontSize = 13
const labelLineHeight = 22
const labelHorizontalPadding = 6
const labelCornerRadius = 35
const labelBoundaryPadding = 4
// Measurement label placement rules:
// - distance values sit above the grey measurement segment;
// - near-straight angle values sit below that segment so the two pills form two rows;
// - wider angle values sit on the angle bisector, outside the arc and inside its 180-degree sector;
// - collision handling moves only the angle value and only by the smallest required amount.
const distanceLabelGap = 12
const angleLabelGap = 12
const smallAngleThreshold = 32
const smallAngleOuterOffset = 18
const nearStraightAngleThreshold = 8
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import Konva from 'konva'
import type { LayerConfig } from 'konva/lib/Layer'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { LineConfig } from 'konva/lib/shapes/Line'
import type { ArcConfig } from 'konva/lib/shapes/Arc'

const props = defineProps<{
  /** Whether the user is currently in measuring mode. */
  active: boolean
  /** Position of the map layer, which the ruler follows so measurements stay pinned while panning. */
  mapPos: Pos
  mapSize: { width: number; height: number }
  /** Size of the visible stage viewport, in the same unscaled coordinates as `mapPos`. */
  viewportSize: { width: number; height: number }
  /** Points the endpoints stick to, in map coordinates. */
  snapTargets: RulerSnapTarget[]
}>()

const layerRef = ref<{ getNode(): Konva.Layer } | null>(null)
const measurement = ref<{ from: Pos; fromHeading: number | null; to: Pos } | null>(null)
let measuring = false
let measurementLocked = false

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

function handleMouseDown() {
  const snapped = getPointerPos()
  if (snapped == null) return

  if (measurement.value != null && !measurementLocked) {
    // The second click commits the current pointer position so the complete measurement remains
    // visible after the button is released.
    measurement.value = { ...measurement.value, to: snapped.pos }
    measurementLocked = true
    return
  }

  // The first click, or any click after a committed measurement, establishes a new start point.
  measurement.value = { from: snapped.pos, fromHeading: snapped.target?.heading ?? null, to: snapped.pos }
  measurementLocked = false
  measuring = true
}

function handleMouseMove() {
  if (!measuring || measurementLocked || measurement.value == null) return
  const snapped = getPointerPos()
  if (snapped == null) return
  measurement.value = { ...measurement.value, to: snapped.pos }
}

function stopMeasuring() {
  measuring = false
  measurementLocked = false
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
    strokeWidth: 1.6,
    dash: [12, 12],
    lineCap: 'round',
    lineJoin: 'round',
    listening: false
  }
})

function screenDegToVector(deg: number): Pos {
  return { x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) }
}

/** Visible portion of the map, expressed in map coordinates after camera panning. */
const visibleMapRect = computed(() => ({
  ...getVisibleMapRect(props.mapPos, props.mapSize, props.viewportSize)
}))

/** Keep a measurement label fully inside the stage viewport, including its rounded background. */
function clampLabelToViewport(layout: LabelLayout): LabelLayout {
  return clampLabelToRect(layout, visibleMapRect.value, labelBoundaryPadding)
}

function getLabelSize(text: string) {
  const textNode = new Konva.Text({ text, fontFamily: 'Inter', fontSize: labelFontSize, fontStyle: '500' })
  return { width: Math.ceil(textNode.width()) + labelHorizontalPadding * 2, height: labelLineHeight }
}

function getLineLabelLayout(from: Pos, to: Pos, text: string): LabelLayout {
  const size = getLabelSize(text)
  const normal = getLineNormal(from, to)
  const center = {
    x: (from.x + to.x) / 2 + normal.x * (size.height / 2 + distanceLabelGap),
    y: (from.y + to.y) / 2 + normal.y * (size.height / 2 + distanceLabelGap)
  }
  return { x: center.x - size.width / 2, y: center.y - size.height / 2, ...size, text }
}

function getLineNormal(from: Pos, to: Pos): Pos {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  let normal = { x: -dy / length, y: dx / length }
  if (normal.y > 0) normal = { x: -normal.x, y: -normal.y }
  return normal
}

function offsetAlongMeasurementLine(layout: LabelLayout, distance: number): LabelLayout {
  if (measurement.value == null) return layout
  const { from, to } = measurement.value
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { ...layout, x: layout.x + (dx / length) * distance, y: layout.y + (dy / length) * distance }
}

function distanceToRay(point: Pos, origin: Pos, deg: number) {
  const dir = screenDegToVector(deg)
  return Math.abs((point.x - origin.x) * dir.y - (point.y - origin.y) * dir.x)
}

function clearOfAngleLines(layout: LabelLayout): boolean {
  if (measurement.value == null || angle.value == null) return true
  const center = { x: layout.x + layout.width / 2, y: layout.y + layout.height / 2 }
  // The pill's vertical half-height is the relevant clearance from each radial
  // boundary; using its full diagonal would reject otherwise valid wide angles.
  const clearance = layout.height / 2 + 2
  const origin = measurement.value.from
  return (
    distanceToRay(center, origin, angle.value.headingDeg) >= clearance &&
    distanceToRay(center, origin, angle.value.lineDeg) >= clearance
  )
}

const distanceLabelLayout = computed<LabelLayout | null>(() => {
  if (measurement.value == null) return null
  return clampLabelToViewport(getLineLabelLayout(measurement.value.from, measurement.value.to, `${distance.value}`))
})

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
    strokeWidth: 1.6,
    lineCap: 'round',
    listening: false
  }
})

const angleArcConfig = computed<ArcConfig | null>(() => {
  if (measurement.value == null || angle.value == null) return null
  const { headingDeg, lineDeg, turn } = angle.value
  return {
    ...measurement.value.from,
    innerRadius: angleArcRadius - 0.8,
    outerRadius: angleArcRadius + 0.8,
    // Konva sweeps clockwise from `rotation`; a left turn is drawn from the segment back to the ray.
    rotation: turn >= 0 ? headingDeg : lineDeg,
    angle: Math.abs(turn),
    fill: angleColor,
    listening: false
  }
})

function rectsOverlap(a: LabelLayout, b: LabelLayout, gap: number) {
  return (
    a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y
  )
}

const angleLabelLayout = computed<LabelLayout | null>(() => {
  if (measurement.value == null || angle.value == null) return null
  const text = `${angle.value.turn}°`
  const size = getLabelSize(text)
  const midDeg = angle.value.headingDeg + angle.value.turn / 2
  const nearStraightAngle = Math.abs(angle.value.turn) <= nearStraightAngleThreshold
  const smallAngle = Math.abs(angle.value.turn) <= smallAngleThreshold
  const outerOffset = smallAngle ? smallAngleOuterOffset : 0
  // Keep value pills outside the arc so the angle geometry remains unobstructed.
  const headingDeg = angle.value.headingDeg
  const turn = angle.value.turn
  const makeLayout = (deg: number, extraDistance = 0): LabelLayout => {
    const dir = screenDegToVector(deg)
    const distanceFromOrigin = angleArcRadius + size.height / 2 + angleLabelGap + outerOffset + extraDistance
    const center = {
      x: measurement.value!.from.x + dir.x * distanceFromOrigin,
      y: measurement.value!.from.y + dir.y * distanceFromOrigin
    }
    return { x: center.x - size.width / 2, y: center.y - size.height / 2, ...size, text }
  }
  const makeBelowMeasurementLineLayout = (alongLine = 0): LabelLayout => {
    const { from, to } = measurement.value!
    const normal = getLineNormal(from, to)
    const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
    const tangent = { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
    const offset = size.height / 2 + angleLabelGap
    const center = {
      x: (from.x + to.x) / 2 - normal.x * offset + tangent.x * alongLine,
      y: (from.y + to.y) / 2 - normal.y * offset + tangent.y * alongLine
    }
    return { x: center.x - size.width / 2, y: center.y - size.height / 2, ...size, text }
  }
  const candidates = nearStraightAngle
    ? [makeBelowMeasurementLineLayout(), makeBelowMeasurementLineLayout(size.width / 2 + angleLabelGap)]
    : smallAngle
      ? [makeLayout(headingDeg + turn * 0.2), makeLayout(headingDeg + turn * 0.35), makeLayout(midDeg)]
      : [
          // Wide angles use the outer middle first, then move toward the blue
          // heading-ray side only when collision handling requires it.
          makeLayout(midDeg),
          makeLayout(headingDeg + turn * 0.35),
          makeLayout(headingDeg + turn * 0.65),
          makeLayout(headingDeg + turn * 0.2),
          makeLayout(headingDeg + turn * 0.8)
        ]
  // Near-zero angles use the shared "above the measurement line" rule because
  // their arc sector collapses onto the line. Wider angles follow the angle
  // bisector outside the arc, while remaining inside the 180-degree sector.
  const safeCandidates = candidates.map(clampLabelToViewport)
  // For a nearly straight angle, the value intentionally sits on the opposite
  // side of the coincident rays, so the generic radial-clearance test would
  // reject the two-row placement as if it were covering a wide-angle boundary.
  const lineSafeCandidates = nearStraightAngle
    ? safeCandidates
    : safeCandidates.filter((candidate) => clearOfAngleLines(candidate))
  if (distanceLabelLayout.value == null) return lineSafeCandidates[0] ?? safeCandidates[0]
  const clearCandidate = lineSafeCandidates.find((candidate) => !rectsOverlap(candidate, distanceLabelLayout.value!, 6))
  if (clearCandidate != null) return clearCandidate

  // Tangential movement is only a collision fallback; it preserves the
  // outside-arc offset while keeping the value close to its angle sector.
  for (let distance = 8; distance <= 96; distance += 8) {
    for (const direction of [1, -1]) {
      const shifted = clampLabelToViewport(
        offsetAlongMeasurementLine(lineSafeCandidates[0] ?? safeCandidates[0], distance * direction)
      )
      if (!rectsOverlap(shifted, distanceLabelLayout.value, 6)) return shifted
    }
  }
  return clampLabelToViewport(offsetAlongMeasurementLine(lineSafeCandidates[0] ?? safeCandidates[0], 104))
})
</script>

<template>
  <v-layer ref="layerRef" :config="layerConfig">
    <v-rect :config="captureRectConfig" @mousedown="handleMouseDown" @mousemove="handleMouseMove" />
    <template v-if="measurement != null && lineConfig != null && distanceLabelLayout != null">
      <template v-if="headingRayConfig != null && angleArcConfig != null && angleLabelLayout != null && angle != null">
        <v-line :config="headingRayConfig" />
        <v-arc :config="angleArcConfig" />
        <v-group :config="{ x: angleLabelLayout.x, y: angleLabelLayout.y, listening: false }">
          <v-rect
            :config="{
              width: angleLabelLayout.width,
              height: angleLabelLayout.height,
              fill: angleColor,
              cornerRadius: labelCornerRadius
            }"
          />
          <v-text
            :config="{
              text: angleLabelLayout.text,
              y: 1,
              width: angleLabelLayout.width,
              height: angleLabelLayout.height,
              align: 'center',
              verticalAlign: 'middle',
              fontFamily: 'Inter',
              fontSize: labelFontSize,
              fontStyle: '500',
              fill: '#fff'
            }"
          />
        </v-group>
      </template>
      <v-line :config="lineConfig" />
      <v-group :config="{ x: distanceLabelLayout.x, y: distanceLabelLayout.y, listening: false }">
        <v-rect
          :config="{
            width: distanceLabelLayout.width,
            height: distanceLabelLayout.height,
            fill: labelColor,
            cornerRadius: labelCornerRadius
          }"
        />
        <v-text
          :config="{
            text: distanceLabelLayout.text,
            y: 1,
            width: distanceLabelLayout.width,
            height: distanceLabelLayout.height,
            align: 'center',
            verticalAlign: 'middle',
            fontFamily: 'Inter',
            fontSize: labelFontSize,
            fontStyle: '500',
            fill: '#fff'
          }"
        />
      </v-group>
    </template>
  </v-layer>
</template>
