<script lang="ts">
import { headingToScreenDeg, segmentScreenDeg, turnAngle, type Pos } from './ruler-math'
import { clampLabelToRect, getVisibleMapRect, type LabelLayout } from './ruler-layout'
import { color } from '@/components/ui/tokens'

export type { Pos }

export type RulerSnapTarget = Pos & { spriteId: string; heading: number | null }

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

const snapRadius = 24
const originSnapDuration = 140
const originReleaseDuration = 80
const dragThreshold = 4
const minAngleDistance = 12
const angleArcRadius = 36
const headingRayLength = angleArcRadius
const labelFontSize = 13
const labelLineHeight = 22
const labelHorizontalPadding = 6
const labelCornerRadius = 35
const labelBoundaryPadding = 4
const distanceLabelGap = 12
const angleLabelGap = 12
const smallAngleThreshold = 32
const smallAngleOuterOffset = 18
const nearStraightAngleThreshold = 8
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { LayerConfig } from 'konva/lib/Layer'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { LineConfig } from 'konva/lib/shapes/Line'
import type { ArcConfig } from 'konva/lib/shapes/Arc'

const props = withDefaults(
  defineProps<{
    active: boolean
    mapPos: Pos
    mapSize: { width: number; height: number }
    viewportSize: { width: number; height: number }
    stageScale: number
    simpleMode?: boolean
    snapTargets: RulerSnapTarget[]
  }>(),
  { simpleMode: false }
)

// Decoration units have a fixed screen size, enlarged in Simple Mode.
const displayScale = computed(() => props.stageScale / (props.simpleMode ? 1.3 : 1))

const emit = defineEmits<{
  cursorOutlineChange: [outlined: boolean]
  snapTargetChange: [spriteId: string | null]
}>()

const layerRef = ref<{ getNode(): Konva.Layer } | null>(null)
const measurement = ref<{ from: Pos; fromHeading: number | null; to: Pos } | null>(null)
const start = ref<{ pos: Pos; heading: number | null } | null>(null)
const awaitingEnd = ref(false)
let mousePress: { pos: Pos; origin: NonNullable<typeof start.value>; dragging: boolean } | null = null
let suppressClick = false
const pointerPos = ref<Pos | null>(null)
let pointerUpdateFrame: number | null = null
const markerPos = ref<Pos | null>(null)
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const reducedMotion = ref(motionPreference.matches)
let markerAnimationFrame: number | null = null
function updateMotionPreference() {
  reducedMotion.value = motionPreference.matches
}
onMounted(() => {
  motionPreference.addEventListener('change', updateMotionPreference)
  window.addEventListener('blur', handleWindowBlur)
})

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

function beginMeasurement(origin: NonNullable<typeof start.value>) {
  stopMarkerAnimation()
  markerPos.value = origin.pos
  start.value = origin
  measurement.value = null
  awaitingEnd.value = true
}

function handleClick(event: KonvaEventObject<MouseEvent>) {
  if (!props.active || event.evt.button !== 0) return
  // Konva also emits a click after a drag on the capture rectangle.
  if (suppressClick) {
    suppressClick = false
    return
  }
  flushPointerUpdate()
  const snapped = pointerSnap.value
  if (snapped == null) return
  if (!awaitingEnd.value) {
    beginMeasurement({ pos: snapped.pos, heading: snapped.target?.heading ?? null })
    return
  }
  if (start.value == null) return
  measurement.value = { from: start.value.pos, fromHeading: start.value.heading, to: snapped.pos }
  stopMarkerAnimation()
  markerPos.value = snapped.pos
  awaitingEnd.value = false
}

function handleMouseDown(event: KonvaEventObject<MouseEvent>) {
  if (!props.active || event.evt.button !== 0) return
  suppressClick = false
  event.evt.preventDefault()
  if (awaitingEnd.value) return
  const pos = getPointerPos()
  if (pos == null) return
  const snapped = snap(pos)
  pointerPos.value = pos
  mousePress = { pos, origin: { pos: snapped.pos, heading: snapped.target?.heading ?? null }, dragging: false }
  window.addEventListener('mouseup', handleWindowMouseUp)
}

function updatePointer() {
  pointerUpdateFrame = null
  pointerPos.value = getPointerPos()
  if (mousePress != null && !mousePress.dragging && pointerPos.value != null) {
    const moved = Math.hypot(pointerPos.value.x - mousePress.pos.x, pointerPos.value.y - mousePress.pos.y)
    if (moved * props.stageScale >= dragThreshold) {
      mousePress.dragging = true
      beginMeasurement(mousePress.origin)
    }
  }
  if (!awaitingEnd.value || start.value == null) return
  const snapped = pointerSnap.value
  if (snapped == null) return
  measurement.value = { from: start.value.pos, fromHeading: start.value.heading, to: snapped.pos }
}

function schedulePointerUpdate() {
  if (pointerUpdateFrame != null) return
  pointerUpdateFrame = requestAnimationFrame(updatePointer)
}

function flushPointerUpdate() {
  stopPointerUpdate()
  updatePointer()
}

function stopPointerUpdate() {
  if (pointerUpdateFrame == null) return
  cancelAnimationFrame(pointerUpdateFrame)
  pointerUpdateFrame = null
}

function resetMousePress() {
  mousePress = null
  window.removeEventListener('mouseup', handleWindowMouseUp)
}

function finishDrag() {
  stopPointerUpdate()
  if (mousePress?.dragging) {
    stopMarkerAnimation()
    markerPos.value = pointerSnap.value?.pos ?? null
    awaitingEnd.value = false
    suppressClick = true
  }
  resetMousePress()
}

function handleMouseUp(event: KonvaEventObject<MouseEvent>) {
  if (event.evt.button !== 0 || mousePress == null) return
  flushPointerUpdate()
  finishDrag()
}

function handleWindowMouseUp(event: MouseEvent) {
  if (event.button !== 0) return
  // Outside the map, retain the last valid endpoint instead of leaving a drag active.
  finishDrag()
}

function handleWindowBlur() {
  finishDrag()
  hidePointer()
}

function hidePointer() {
  stopPointerUpdate()
  stopMarkerAnimation()
  pointerPos.value = null
  markerPos.value = null
}

function stopMeasuring() {
  resetMousePress()
  suppressClick = false
  hidePointer()
  awaitingEnd.value = false
  start.value = null
  measurement.value = null
}

watch(
  () => props.active,
  (active) => {
    if (active) return
    stopMeasuring()
  }
)

onUnmounted(() => {
  motionPreference.removeEventListener('change', updateMotionPreference)
  window.removeEventListener('blur', handleWindowBlur)
  labelMeasureNode?.destroy()
  stopMeasuring()
  emit('cursorOutlineChange', false)
  emit('snapTargetChange', null)
})

const pointerSnap = computed(() => {
  if (!props.active || pointerPos.value == null) return null
  return snap(pointerPos.value)
})

watch(
  () => pointerSnap.value?.target?.spriteId ?? null,
  (spriteId) => emit('snapTargetChange', spriteId),
  { immediate: true }
)

function stopMarkerAnimation() {
  if (markerAnimationFrame == null) return
  cancelAnimationFrame(markerAnimationFrame)
  markerAnimationFrame = null
}

watch([pointerSnap, reducedMotion], ([next, reduce], [previous]) => {
  if (next == null || reduce || awaitingEnd.value) {
    stopMarkerAnimation()
    markerPos.value = next?.pos ?? null
    return
  }
  if (next.target === previous?.target || (previous == null && next.target == null)) {
    if (markerAnimationFrame == null) markerPos.value = next.pos
    return
  }

  stopMarkerAnimation()
  const from = markerPos.value ?? pointerPos.value ?? next.pos
  if (from.x === next.pos.x && from.y === next.pos.y) {
    markerPos.value = next.pos
    return
  }
  const startedAt = performance.now()
  const duration = next.target == null ? originReleaseDuration : originSnapDuration
  markerPos.value = from

  function animate(time: number) {
    markerAnimationFrame = null
    const to = pointerSnap.value?.pos
    if (to == null) return
    const progress = Math.min(Math.max((time - startedAt) / duration, 0), 1)
    const eased = 1 - (1 - progress) ** 3
    markerPos.value = { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased }
    if (progress < 1) markerAnimationFrame = requestAnimationFrame(animate)
  }
  markerAnimationFrame = requestAnimationFrame(animate)
})

const cursorOutlined = computed(
  () =>
    pointerPos.value != null && (awaitingEnd.value || (measurement.value == null && pointerSnap.value?.target != null))
)
watch(cursorOutlined, (outlined) => emit('cursorOutlineChange', outlined))

const markerPositions = computed(() => {
  const positions: Pos[] = []
  if (measurement.value != null) positions.push(measurement.value.from, measurement.value.to)
  else if (start.value != null) positions.push(start.value.pos)
  if (markerPos.value != null) positions.push(markerPos.value)
  return positions
    .filter((pos, index) => positions.findIndex((other) => other.x === pos.x && other.y === pos.y) === index)
    .map(toDisplayPos)
})

function toDisplayPos(pos: Pos): Pos {
  return { x: pos.x * displayScale.value, y: pos.y * displayScale.value }
}

function getPointerPos(): Pos | null {
  const pos = layerRef.value?.getNode().getRelativePointerPosition()
  return pos == null ? null : { x: pos.x / displayScale.value, y: pos.y / displayScale.value }
}

// Convert map coordinates into the fixed-size decoration coordinate system.
const displayMeasurement = computed(() => {
  if (measurement.value == null) return null
  return { ...measurement.value, from: toDisplayPos(measurement.value.from), to: toDisplayPos(measurement.value.to) }
})

const layerConfig = computed(
  () =>
    ({
      ...props.mapPos,
      scaleX: 1 / displayScale.value,
      scaleY: 1 / displayScale.value,
      listening: props.active
    }) satisfies LayerConfig
)

const captureRectConfig = computed(
  () =>
    ({
      width: props.mapSize.width * displayScale.value,
      height: props.mapSize.height * displayScale.value,
      fill: 'transparent'
    }) satisfies RectConfig
)

const lineConfig = computed<LineConfig | null>(() => {
  if (displayMeasurement.value == null) return null
  const { from, to } = displayMeasurement.value
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

const visibleMapRect = computed(() => ({
  ...getVisibleMapRect(
    toDisplayPos(props.mapPos),
    { width: props.mapSize.width * displayScale.value, height: props.mapSize.height * displayScale.value },
    { width: props.viewportSize.width * displayScale.value, height: props.viewportSize.height * displayScale.value }
  )
}))

function clampLabelToViewport(layout: LabelLayout): LabelLayout {
  return clampLabelToRect(layout, visibleMapRect.value, labelBoundaryPadding)
}

let labelMeasureNode: Konva.Text | null = null

function getLabelSize(text: string) {
  labelMeasureNode ??= new Konva.Text({ fontFamily: 'Inter', fontSize: labelFontSize, fontStyle: '500' })
  return {
    width: Math.ceil(labelMeasureNode.measureSize(text).width) + labelHorizontalPadding * 2,
    height: labelLineHeight
  }
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
  if (displayMeasurement.value == null) return layout
  const { from, to } = displayMeasurement.value
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
  if (displayMeasurement.value == null || angle.value == null) return true
  const center = { x: layout.x + layout.width / 2, y: layout.y + layout.height / 2 }
  const clearance = layout.height / 2 + 2
  const origin = displayMeasurement.value.from
  return (
    distanceToRay(center, origin, angle.value.headingDeg) >= clearance &&
    distanceToRay(center, origin, angle.value.lineDeg) >= clearance
  )
}

const distanceLabelLayout = computed<LabelLayout | null>(() => {
  if (displayMeasurement.value == null) return null
  return clampLabelToViewport(
    getLineLabelLayout(displayMeasurement.value.from, displayMeasurement.value.to, `${distance.value}`)
  )
})

const angle = computed(() => {
  const m = measurement.value
  if (m == null || m.fromHeading == null) return null
  if (Math.hypot(m.to.x - m.from.x, m.to.y - m.from.y) * displayScale.value < minAngleDistance) return null
  return {
    headingDeg: headingToScreenDeg(m.fromHeading),
    lineDeg: segmentScreenDeg(m.from, m.to),
    turn: Math.round(turnAngle(m.from, m.to, m.fromHeading))
  }
})

const headingRayConfig = computed<LineConfig | null>(() => {
  if (displayMeasurement.value == null || angle.value == null) return null
  const { from } = displayMeasurement.value
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
  if (displayMeasurement.value == null || angle.value == null) return null
  const { headingDeg, lineDeg, turn } = angle.value
  return {
    ...displayMeasurement.value.from,
    innerRadius: angleArcRadius - 0.8,
    outerRadius: angleArcRadius + 0.8,
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
  if (displayMeasurement.value == null || angle.value == null) return null
  const text = `${angle.value.turn}°`
  const size = getLabelSize(text)
  const midDeg = angle.value.headingDeg + angle.value.turn / 2
  const nearStraightAngle = Math.abs(angle.value.turn) <= nearStraightAngleThreshold
  const smallAngle = Math.abs(angle.value.turn) <= smallAngleThreshold
  const outerOffset = smallAngle ? smallAngleOuterOffset : 0
  const headingDeg = angle.value.headingDeg
  const turn = angle.value.turn
  const makeLayout = (deg: number, extraDistance = 0): LabelLayout => {
    const dir = screenDegToVector(deg)
    const distanceFromOrigin = angleArcRadius + size.height / 2 + angleLabelGap + outerOffset + extraDistance
    const center = {
      x: displayMeasurement.value!.from.x + dir.x * distanceFromOrigin,
      y: displayMeasurement.value!.from.y + dir.y * distanceFromOrigin
    }
    return { x: center.x - size.width / 2, y: center.y - size.height / 2, ...size, text }
  }
  const makeBelowMeasurementLineLayout = (alongLine = 0): LabelLayout => {
    const { from, to } = displayMeasurement.value!
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
          makeLayout(midDeg),
          makeLayout(headingDeg + turn * 0.35),
          makeLayout(headingDeg + turn * 0.65),
          makeLayout(headingDeg + turn * 0.2),
          makeLayout(headingDeg + turn * 0.8)
        ]
  const safeCandidates = candidates.map(clampLabelToViewport)
  const lineSafeCandidates = nearStraightAngle
    ? safeCandidates
    : safeCandidates.filter((candidate) => clearOfAngleLines(candidate))
  if (distanceLabelLayout.value == null) return lineSafeCandidates[0] ?? safeCandidates[0]
  const clearCandidate = lineSafeCandidates.find((candidate) => !rectsOverlap(candidate, distanceLabelLayout.value!, 6))
  if (clearCandidate != null) return clearCandidate

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
    <v-rect
      :config="captureRectConfig"
      @click="handleClick"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseenter="schedulePointerUpdate"
      @mousemove="schedulePointerUpdate"
      @mouseleave="hidePointer"
    />
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
    <v-group v-for="(pos, index) in markerPositions" :key="index" :config="{ ...pos, listening: false }">
      <v-circle :config="{ radius: 7, stroke: 'rgba(255, 255, 255, 0.5)', strokeWidth: 1.2 }" />
      <v-circle :config="{ radius: 4.1, fill: 'rgba(255, 255, 255, 0.7)', stroke: '#fff', strokeWidth: 1.2 }" />
    </v-group>
  </v-layer>
</template>
