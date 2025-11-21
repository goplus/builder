<template>
  <div class="canvas-pan-controls" aria-hidden="true">
    <div
      v-show="initialized"
      ref="horizontalScrollbarRef"
      :class="['scrollbar', 'horizontal', { disabled: !canScrollHorizontal }]"
      @scroll="handleHorizontalScroll"
    >
      <div class="scroll-content" :style="{ width: horizontalContentSize + 'px' }"></div>
    </div>

    <div
      v-show="initialized"
      ref="verticalScrollbarRef"
      :class="['scrollbar', 'vertical', { disabled: !canScrollVertical }]"
      @scroll="handleVerticalScroll"
    >
      <div class="scroll-content" :style="{ height: verticalContentSize + 'px' }"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted, onUnmounted, ref, watch, nextTick, type Ref } from 'vue'
import paper from 'paper'

const props = defineProps<{
  canvasRef?: HTMLCanvasElement | null
}>()

const isViewBoundsWithinBoundary = inject<(center: paper.Point, zoom: number) => boolean>('isViewBoundsWithinBoundary')!
const boundaryRect = inject<Ref<{ x: number; y: number; width: number; height: number } | null>>('boundaryRect')!

const isUpdateScheduled = ref(false)
const horizontalScrollbarRef = ref<HTMLDivElement | null>(null)
const verticalScrollbarRef = ref<HTMLDivElement | null>(null)
const canScrollHorizontal = ref<boolean>(false)
const canScrollVertical = ref<boolean>(false)
const horizontalContentSize = ref<number>(1000)
const verticalContentSize = ref<number>(1000)
const initialized = ref<boolean>(false)
const suppressScrollEvent = ref<boolean>(false)
const lastCenter = ref<paper.Point | null>(null)
const lastZoom = ref<number | null>(null)
let frameHandler: ((event: paper.Event) => void) | null = null
let resizeHandler: (() => void) | null = null
const getCanvasElement = (): HTMLCanvasElement | null => {
  return props.canvasRef ?? null
}

const scheduleViewUpdate = (): void => {
  if (isUpdateScheduled.value) return
  isUpdateScheduled.value = true
  requestAnimationFrame(() => {
    if (!paper.view) {
      isUpdateScheduled.value = false
      return
    }
    paper.view.update()
    isUpdateScheduled.value = false
  })
}

const adjustCenterToBoundary = (center: paper.Point): paper.Point => {
  if (!paper.view || !boundaryRect.value) return center

  const zoom = paper.view.zoom
  const viewWidth = paper.view.viewSize.width / zoom
  const viewHeight = paper.view.viewSize.height / zoom
  const boundary = boundaryRect.value

  const halfWidth = viewWidth / 2
  const halfHeight = viewHeight / 2

  const minX = boundary.x + halfWidth
  const maxX = boundary.x + boundary.width - halfWidth
  const minY = boundary.y + halfHeight
  const maxY = boundary.y + boundary.height - halfHeight

  const clampedX = Math.min(Math.max(center.x, minX), maxX)
  const clampedY = Math.min(Math.max(center.y, minY), maxY)

  return new paper.Point(clampedX, clampedY)
}

const normalizeWheelDelta = (event: WheelEvent): { deltaX: number; deltaY: number } => {
  const LINE_HEIGHT = 16
  const PAGE_HEIGHT = window.innerHeight || 800

  if (event.deltaMode === 1) {
    return {
      deltaX: event.deltaX * LINE_HEIGHT,
      deltaY: event.deltaY * LINE_HEIGHT
    }
  }

  if (event.deltaMode === 2) {
    return {
      deltaX: event.deltaX * PAGE_HEIGHT,
      deltaY: event.deltaY * PAGE_HEIGHT
    }
  }

  return { deltaX: event.deltaX, deltaY: event.deltaY }
}

const clampCenterWithBoundary = (center: paper.Point): paper.Point => {
  if (!paper.view || !boundaryRect.value) return center
  if (isViewBoundsWithinBoundary(center, paper.view.zoom)) {
    return center
  }
  return adjustCenterToBoundary(center)
}

const panCanvas = (deltaX: number, deltaY: number, skipScrollbarSync = false): void => {
  if (!paper.view) return
  if (deltaX === 0 && deltaY === 0) return

  const projectDelta = new paper.Point(deltaX, deltaY).divide(paper.view.zoom)
  const newCenter = clampCenterWithBoundary(paper.view.center.subtract(projectDelta))

  paper.view.center = newCenter
  if (!skipScrollbarSync) {
    syncScrollbarsWithView()
  }
  scheduleViewUpdate()
}

const isEventOverCanvas = (event: WheelEvent, canvasElement: HTMLCanvasElement): boolean => {
  const composedPath = typeof event.composedPath === 'function' ? event.composedPath() : null
  if (composedPath && composedPath.includes(canvasElement)) {
    return true
  }

  const targetNode = event.target as Node | null
  if (targetNode && canvasElement.contains(targetNode)) {
    return true
  }

  const rect = canvasElement.getBoundingClientRect()
  return event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom
}

const handleWheel = (event: WheelEvent): void => {
  const canvasElement = getCanvasElement()
  if (!canvasElement) return
  if (event.ctrlKey || event.metaKey) return

  if (!isEventOverCanvas(event, canvasElement)) return

  const { deltaX, deltaY } = normalizeWheelDelta(event)
  if (deltaX === 0 && deltaY === 0) return

  event.preventDefault()
  panCanvas(deltaX, deltaY)
}

const addWheelListener = (): void => {
  if (typeof window === 'undefined') return
  window.addEventListener('wheel', handleWheel, { passive: false })
}

const removeWheelListener = (): void => {
  if (typeof window === 'undefined') return
  window.removeEventListener('wheel', handleWheel)
}

const getViewMetrics = (): { viewWidth: number; viewHeight: number } | null => {
  if (!paper.view) return null
  const zoom = paper.view.zoom
  return {
    viewWidth: paper.view.viewSize.width / zoom,
    viewHeight: paper.view.viewSize.height / zoom
  }
}

const syncScrollbarsWithView = (): void => {
  if (!paper.view || !boundaryRect.value) return
  const metrics = getViewMetrics()
  if (!metrics) return

  const boundary = boundaryRect.value
  const { viewWidth, viewHeight } = metrics

  const left = paper.view.center.x - viewWidth / 2 - boundary.x
  const top = paper.view.center.y - viewHeight / 2 - boundary.y

  const horizontalRange = Math.max(boundary.width - viewWidth, 0)
  const verticalRange = Math.max(boundary.height - viewHeight, 0)

  suppressScrollEvent.value = true

  if (horizontalScrollbarRef.value) {
    const el = horizontalScrollbarRef.value
    const maxScrollLeft = Math.max(el.scrollWidth - el.clientWidth, 0)
    const normalized = horizontalRange > 0 ? left / horizontalRange : 0
    el.scrollLeft = normalized * maxScrollLeft
  }

  if (verticalScrollbarRef.value) {
    const el = verticalScrollbarRef.value
    const maxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0)
    const normalized = verticalRange > 0 ? top / verticalRange : 0
    el.scrollTop = normalized * maxScrollTop
  }

  requestAnimationFrame(() => {
    suppressScrollEvent.value = false
  })
}

const updateScrollbarAvailability = (): void => {
  if (!paper.view || !boundaryRect.value) {
    canScrollHorizontal.value = false
    canScrollVertical.value = false
    return
  }

  const boundary = boundaryRect.value
  const metrics = getViewMetrics()
  if (!metrics) return
  const { viewWidth, viewHeight } = metrics

  const horizontalRange = Math.max(boundary.width - viewWidth, 0)
  const verticalRange = Math.max(boundary.height - viewHeight, 0)

  canScrollHorizontal.value = horizontalRange > 0.5
  canScrollVertical.value = verticalRange > 0.5

  nextTick(() => {
    if (horizontalScrollbarRef.value) {
      const trackWidth = Math.max(horizontalScrollbarRef.value.clientWidth, 1)
      horizontalContentSize.value = canScrollHorizontal.value
        ? trackWidth * (boundary.width / viewWidth)
        : trackWidth
    }

    if (verticalScrollbarRef.value) {
      const trackHeight = Math.max(verticalScrollbarRef.value.clientHeight, 1)
      verticalContentSize.value = canScrollVertical.value
        ? trackHeight * (boundary.height / viewHeight)
        : trackHeight
    }

    syncScrollbarsWithView()
  })
}

const scrollToNormalizedPosition = (normalizedX: number | null, normalizedY: number | null): void => {
  if (!paper.view || !boundaryRect.value) return
  const metrics = getViewMetrics()
  if (!metrics) return

  const boundary = boundaryRect.value
  const { viewWidth, viewHeight } = metrics

  let center = paper.view.center.clone()

  if (normalizedX !== null) {
    const horizontalRange = Math.max(boundary.width - viewWidth, 0)
    const targetLeft = boundary.x + normalizedX * horizontalRange
    center.x = targetLeft + viewWidth / 2
  }

  if (normalizedY !== null) {
    const verticalRange = Math.max(boundary.height - viewHeight, 0)
    const targetTop = boundary.y + normalizedY * verticalRange
    center.y = targetTop + viewHeight / 2
  }

  center = clampCenterWithBoundary(center)
  paper.view.center = center
  syncScrollbarsWithView()
  scheduleViewUpdate()
}

const handleHorizontalScroll = (): void => {
  if (suppressScrollEvent.value || !canScrollHorizontal.value) return
  const el = horizontalScrollbarRef.value
  if (!el || !paper.view || !boundaryRect.value) return

  const maxScrollLeft = Math.max(el.scrollWidth - el.clientWidth, 0)
  const normalized = maxScrollLeft > 0 ? el.scrollLeft / maxScrollLeft : 0
  scrollToNormalizedPosition(normalized, null)
}

const handleVerticalScroll = (): void => {
  if (suppressScrollEvent.value || !canScrollVertical.value) return
  const el = verticalScrollbarRef.value
  if (!el || !paper.view || !boundaryRect.value) return

  const maxScrollTop = Math.max(el.scrollHeight - el.clientHeight, 0)
  const normalized = maxScrollTop > 0 ? el.scrollTop / maxScrollTop : 0
  scrollToNormalizedPosition(null, normalized)
}

const handleViewFrame = (): void => {
  if (!paper.view) return
  const currentCenter = paper.view.center.clone()
  const currentZoom = paper.view.zoom

  if (
    !lastCenter.value ||
    !lastCenter.value.equals(currentCenter) ||
    lastZoom.value === null ||
    Math.abs(lastZoom.value - currentZoom) > 0.0001
  ) {
    lastCenter.value = currentCenter
    lastZoom.value = currentZoom
    updateScrollbarAvailability()
  }
}

const setupViewListeners = (): void => {
  if (!paper.view) return
  frameHandler = () => {
    handleViewFrame()
  }
  paper.view.on('frame', frameHandler)
  updateScrollbarAvailability()
}

const removeViewListeners = (): void => {
  if (!paper.view || !frameHandler) return
  paper.view.off('frame', frameHandler)
  frameHandler = null
}

const tryInitialize = (): void => {
  if (initialized.value) return
  if (!getCanvasElement() || !paper.view) {
    requestAnimationFrame(tryInitialize)
    return
  }
  initialized.value = true
  canScrollHorizontal.value = true
  canScrollVertical.value = true
  addWheelListener()
  setupViewListeners()
  if (typeof window !== 'undefined') {
    resizeHandler = () => updateScrollbarAvailability()
    window.addEventListener('resize', resizeHandler)
  }
}

watch(
  () => boundaryRect.value,
  () => {
    if (!initialized.value) return
    updateScrollbarAvailability()
  },
  { deep: true }
)

onMounted(() => {
  tryInitialize()
})

onUnmounted(() => {
  removeWheelListener()
  removeViewListeners()
  if (resizeHandler && typeof window !== 'undefined') {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
})
</script>

<style scoped>
.canvas-pan-controls {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.scrollbar {
  pointer-events: auto;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: auto;
  scrollbar-width: thin;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.scrollbar.disabled {
  opacity: 0.4;
}

.scrollbar.horizontal {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 12px;
}

.scrollbar.vertical {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 12px;
}

.scrollbar.horizontal .scroll-content {
  height: 1px;
}

.scrollbar.vertical .scroll-content {
  width: 1px;
}

@supports selector(::-webkit-scrollbar) {
  .scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar::-webkit-scrollbar-thumb {
    background: rgba(100, 100, 100, 0.4);
  }

  .scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(100, 100, 100, 0.6);
  }
}
</style>
