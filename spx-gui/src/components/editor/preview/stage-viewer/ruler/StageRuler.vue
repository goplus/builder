<script lang="ts">
import { headingToScreenDeg, segmentScreenDeg, turnAngle, type Pos } from './ruler-math'
import { clampLabelToRect, getVisibleMapRect, type LabelLayout } from './ruler-layout'
import { color } from '@/components/ui/tokens'
import rulerCursorSvg from './triangle-ruler-cursor.svg?raw'

export type { Pos }

export type RulerSnapTarget = Pos & { heading: number | null }

function rgba(hex: string, alpha: number) {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const measurementColor = 'rgba(0, 0, 0, 0.3)'
const angleColor = rgba(color.blue[600], 0.8)
const cursorOutlineColor = rgba(color.grey[100], 0.65)
const cursorSize = 32
const cursorOutlinePath = new DOMParser()
  .parseFromString(rulerCursorSvg, 'image/svg+xml')
  .querySelector('path')!
  .getAttribute('d')!

const originSnapRadius = 24
const endpointSnapRadius = 24
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
const markerDesignSize = 24
const markerCenterDesignSize = 16
const markerCenterInset = (markerDesignSize - markerCenterDesignSize) / 2
const markerDisplaySize = 14
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { LayerConfig } from 'konva/lib/Layer'
import type { GroupConfig } from 'konva/lib/Group'
import type { RectConfig } from 'konva/lib/shapes/Rect'
import type { LineConfig } from 'konva/lib/shapes/Line'
import type { ArcConfig } from 'konva/lib/shapes/Arc'
import type { ImageConfig } from 'konva/lib/shapes/Image'
import type { PathConfig } from 'konva/lib/shapes/Path'
import rulerCursorUrl from './triangle-ruler-cursor.svg?url&no-inline'

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

const emit = defineEmits<{
  cursorPreviewChange: [visible: boolean]
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
const cursorImage = shallowRef<HTMLImageElement | null>(null)
const markerOutlineImage = shallowRef<HTMLImageElement | null>(null)
const markerCenterImage = shallowRef<HTMLImageElement | null>(null)
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
const reducedMotion = ref(motionPreference.matches)
let markerAnimationFrame: number | null = null
const image = new Image()
image.onload = () => (cursorImage.value = image)
image.src = rulerCursorUrl
const outlineImage = new Image()
outlineImage.onload = () => (markerOutlineImage.value = outlineImage)
outlineImage.src = new URL('./measurement-point-outline.svg', import.meta.url).href
const centerImage = new Image()
centerImage.onload = () => (markerCenterImage.value = centerImage)
centerImage.src = new URL('./measurement-point-center.svg', import.meta.url).href

function updateMotionPreference() {
  reducedMotion.value = motionPreference.matches
}
motionPreference.addEventListener('change', updateMotionPreference)

const distance = computed(() => {
  if (measurement.value == null) return 0
  const { from, to } = measurement.value
  return Math.round(Math.hypot(to.x - from.x, to.y - from.y))
})

function snap(pos: Pos, radius: number): { pos: Pos; target: RulerSnapTarget | null } {
  let nearest: RulerSnapTarget | null = null
  let nearestDistance = Infinity
  for (const target of props.snapTargets) {
    const targetDistance = Math.hypot(target.x - pos.x, target.y - pos.y)
    if (targetDistance < nearestDistance) {
      nearest = target
      nearestDistance = targetDistance
    }
  }
  if (nearest != null && nearestDistance <= radius) return { pos: { x: nearest.x, y: nearest.y }, target: nearest }
  return { pos, target: null }
}

function beginMeasurement(origin: NonNullable<typeof start.value>) {
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
  const pos = layerRef.value?.getNode().getRelativePointerPosition()
  if (pos == null) return
  const snapped = snap(pos, originSnapRadius)
  pointerPos.value = pos
  mousePress = { pos, origin: { pos: snapped.pos, heading: snapped.target?.heading ?? null }, dragging: false }
  window.addEventListener('mouseup', handleWindowMouseUp)
  window.addEventListener('blur', handleWindowBlur)
}

function updatePointer() {
  pointerUpdateFrame = null
  pointerPos.value = layerRef.value?.getNode().getRelativePointerPosition() ?? null
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
  window.removeEventListener('blur', handleWindowBlur)
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
  hideCursorPreview()
}

function hideCursorPreview() {
  stopPointerUpdate()
  stopMarkerAnimation()
  pointerPos.value = null
  markerPos.value = null
}

function stopMeasuring() {
  resetMousePress()
  suppressClick = false
  hideCursorPreview()
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
  image.onload = null
  outlineImage.onload = null
  centerImage.onload = null
  motionPreference.removeEventListener('change', updateMotionPreference)
  labelMeasureNode?.destroy()
  stopMeasuring()
  emit('cursorPreviewChange', false)
})

const pointerSnap = computed(() => {
  if (!props.active || pointerPos.value == null) return null
  return snap(pointerPos.value, awaitingEnd.value ? endpointSnapRadius : originSnapRadius)
})

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

// Follow the map scale in simple mode; keep a fixed screen size in the full editor.
const rulerDisplayScale = computed(() => (props.simpleMode ? props.stageScale : 1))

const cursorConfig = computed<ImageConfig | null>(() => {
  if (!props.active || pointerPos.value == null || cursorImage.value == null) return null
  return {
    ...pointerPos.value,
    image: cursorImage.value,
    width: (cursorSize * rulerDisplayScale.value) / props.stageScale,
    height: (cursorSize * rulerDisplayScale.value) / props.stageScale,
    listening: false
  }
})

const cursorOutlineConfig = computed<PathConfig | null>(() => {
  if (cursorConfig.value == null || pointerPos.value == null) return null
  if (!awaitingEnd.value && (measurement.value != null || pointerSnap.value?.target == null)) return null
  const scale = ((cursorSize / 24) * rulerDisplayScale.value) / props.stageScale
  return {
    ...pointerPos.value,
    data: cursorOutlinePath,
    scaleX: scale,
    scaleY: scale,
    stroke: cursorOutlineColor,
    strokeWidth: 4 * rulerDisplayScale.value,
    strokeScaleEnabled: false,
    lineJoin: 'round',
    lineCap: 'round',
    fillEnabled: false,
    listening: false
  }
})

const endpointMarkerConfigs = computed<GroupConfig[]>(() => {
  if (!props.active || markerOutlineImage.value == null || markerCenterImage.value == null) return []
  const positions: Pos[] = []
  if (measurement.value != null) {
    positions.push(measurement.value.from, measurement.value.to)
  } else if (awaitingEnd.value && start.value != null) {
    positions.push(start.value.pos)
  }
  if (markerPos.value != null) positions.push(markerPos.value)
  return positions
    .filter((pos, index) => positions.findIndex((other) => other.x === pos.x && other.y === pos.y) === index)
    .map((pos) => ({
      ...pos,
      offsetX: markerDesignSize / 2,
      offsetY: markerDesignSize / 2,
      scaleX: ((markerDisplaySize / markerDesignSize) * rulerDisplayScale.value) / props.stageScale,
      scaleY: ((markerDisplaySize / markerDesignSize) * rulerDisplayScale.value) / props.stageScale,
      listening: false
    }))
})

watch(
  () => cursorConfig.value != null,
  (visible) => emit('cursorPreviewChange', visible)
)

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
      fill: 'transparent'
    }) satisfies RectConfig
)

const lineConfig = computed<LineConfig | null>(() => {
  if (measurement.value == null) return null
  const { from, to } = measurement.value
  return {
    points: [from.x, from.y, to.x, to.y],
    stroke: measurementColor,
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
  ...getVisibleMapRect(props.mapPos, props.mapSize, props.viewportSize)
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
      @mouseleave="hideCursorPreview"
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
            fill: measurementColor,
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
    <v-path v-if="cursorOutlineConfig != null" :config="cursorOutlineConfig" />
    <v-image v-if="cursorConfig != null" :config="cursorConfig" />
    <v-group v-for="(marker, index) in endpointMarkerConfigs" :key="index" :config="marker">
      <v-image
        :config="{ image: markerOutlineImage, width: markerDesignSize, height: markerDesignSize, listening: false }"
      />
      <v-image
        :config="{
          image: markerCenterImage,
          x: markerCenterInset,
          y: markerCenterInset,
          width: markerCenterDesignSize,
          height: markerCenterDesignSize,
          listening: false
        }"
      />
    </v-group>
  </v-layer>
</template>
