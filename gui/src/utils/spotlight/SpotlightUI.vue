<script lang="ts">
type Position = {
  x: number
  y: number
}

function getPointAlongDirection(x1: number, y1: number, x2: number, y2: number, distance: number): Position {
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len === 0) {
    return {
      x: x1,
      y: y1
    }
  }
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  return {
    x: x2 - ux * distance,
    y: y2 - uy * distance
  }
}

function getDefaultPosition(): Position {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  }
}
</script>

<script lang="ts" setup>
import { watch, ref, computed } from 'vue'
import { throttle } from 'lodash'
import { useSpotlight } from '@/utils/spotlight/index'
import anchor from './anchor.svg?raw'
import { getSpotlightPosition, spotlightMetrics, type SpotlightPlacement } from './placement'

const maskCutoutPadding = 6
const maskCutoutRadius = 8

const spotlightRef = ref<HTMLElement | null>(null)
const tipsEl = ref<HTMLElement | null>(null)
const placementRef = ref<SpotlightPlacement>('bottom-right')
const positionRef = ref<Position>(getDefaultPosition())
const spotlightAnimated = ref(false)
const tipScrollable = ref(false)
const maskRectRef = ref<DOMRect | null>(null)
const viewportRef = ref({ width: window.innerWidth, height: window.innerHeight })

const spotlight = useSpotlight()

const spotlightItem = computed(() => spotlight.spotlightItem.value)
const maskPath = computed(() => {
  const rect = maskRectRef.value
  if (rect == null) return ''

  const left = rect.left - maskCutoutPadding
  const top = rect.top - maskCutoutPadding
  const right = rect.right + maskCutoutPadding
  const bottom = rect.bottom + maskCutoutPadding
  const radius = Math.min(maskCutoutRadius, (right - left) / 2, (bottom - top) / 2)
  const { width, height } = viewportRef.value

  return `M0 0H${width}V${height}H0Z
    M${left + radius} ${top}H${right - radius}
    A${radius} ${radius} 0 0 1 ${right} ${top + radius}V${bottom - radius}
    A${radius} ${radius} 0 0 1 ${right - radius} ${bottom}H${left + radius}
    A${radius} ${radius} 0 0 1 ${left} ${bottom - radius}V${top + radius}
    A${radius} ${radius} 0 0 1 ${left + radius} ${top}Z`
})

function providerRevealEl() {
  const revealEl = spotlightItem.value?.el
  if (!revealEl) {
    throw new Error('SpotlightUI must have an associated element')
  }
  return revealEl
}

function syncPlacementAndPosition() {
  const revealEl = providerRevealEl()
  const tipEl = tipsEl.value
  if (tipEl == null) throw new Error('Spotlight tip is not mounted yet')
  const revealRect = revealEl.getBoundingClientRect()
  const tipRect = tipEl.getBoundingClientRect()
  tipScrollable.value = tipEl.scrollHeight > tipEl.clientHeight
  viewportRef.value = { width: window.innerWidth, height: window.innerHeight }
  const { x, y, placement } = getSpotlightPosition(revealRect, tipRect, viewportRef.value)

  placementRef.value = placement
  positionRef.value = { x, y }
  maskRectRef.value = revealRect
}

function revealElement(revealEl: HTMLElement) {
  revealEl.scrollIntoView({ block: 'nearest' })
  revealEl.classList.add('spotlight-attach-element-highlight')
  spotlightAnimated.value = true
  syncPlacementAndPosition()
}

function concealElement(revealEl: HTMLElement) {
  revealEl.classList.remove('spotlight-attach-element-highlight')
}

const throttledHandleScroll = throttle(() => {
  syncPlacementAndPosition()
  // Prevent frequent triggering of animation
  spotlightAnimated.value = false
}, 20)

function handleScrollEnd() {
  spotlightAnimated.value = true
}

const throttledHandleRefresh = throttle(syncPlacementAndPosition, 20)
const resizeObserver = new ResizeObserver(throttledHandleRefresh)
watch(
  () => spotlightItem.value,
  (value, _, onCleanUp) => {
    if (value == null) {
      maskRectRef.value = null
      return
    }

    maskRectRef.value = value.el.getBoundingClientRect()
    viewportRef.value = { width: window.innerWidth, height: window.innerHeight }

    // After the spotlight is concealed, if it is revealed again,
    // the positions of `center` and `reveal` will be recalculated — this position represents a portion of the distance between them.
    if (!spotlightRef.value) {
      // center position
      const center = getDefaultPosition()
      const { x: x1, y: y1 } = center
      // reveal position
      const { x: x2, y: y2, width: revealWidth } = value.el.getBoundingClientRect()
      const len = Math.hypot(x2 - x1, y2 - y1)
      // If the distance is too short, animate from center to reveal
      positionRef.value = len > revealWidth ? getPointAlongDirection(x1, y1, x2, y2, len / 3) : center
    }
    requestAnimationFrame(() => {
      if (spotlightItem.value !== value) return
      revealElement(value.el)
      spotlight.emit('revealed', { rect: value.el.getBoundingClientRect() })
    })

    resizeObserver.observe(document.body)
    resizeObserver.observe(value.el)
    document.body.addEventListener('scroll', throttledHandleScroll, { capture: true, passive: true })
    document.body.addEventListener('scrollend', handleScrollEnd, { capture: true })
    window.addEventListener('resize', throttledHandleRefresh)
    onCleanUp(() => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', throttledHandleRefresh)
      throttledHandleScroll.cancel()
      throttledHandleRefresh.cancel()
      document.body.removeEventListener('scroll', throttledHandleScroll, { capture: true })
      document.body.removeEventListener('scrollend', handleScrollEnd, { capture: true })
      concealElement(value.el)
    })
  },
  { immediate: true }
)
</script>

<template>
  <div
    class="spotlight-ui"
    :style="{
      '--spotlight-anchor-size': `${spotlightMetrics.anchorSize}px`,
      '--spotlight-anchor-offset-x': `${spotlightMetrics.anchorOffsetX}px`,
      '--spotlight-anchor-offset-y': `${spotlightMetrics.anchorOffsetY}px`,
      '--spotlight-edge-padding': `${spotlightMetrics.edgePadding}px`
    }"
  >
    <Transition>
      <svg v-if="spotlightItem?.mask && maskRectRef != null" class="mask" aria-hidden="true">
        <path
          :d="maskPath"
          fill-rule="evenodd"
          @pointerdown.stop.prevent
          @pointerup.stop.prevent
          @mousedown.stop.prevent
          @mouseup.stop.prevent
          @click.stop.prevent="spotlight.conceal()"
        />
      </svg>
    </Transition>
    <Transition>
      <div
        v-if="spotlightItem"
        ref="spotlightRef"
        :class="['spotlight-item', placementRef, { animated: spotlightAnimated }]"
        :style="{ transform: `translate(${positionRef.x}px, ${positionRef.y}px)` }"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="anchor" v-html="anchor"></div>
        <div ref="tipsEl" class="tips" :class="{ scrollable: tipScrollable }">
          <div class="content">{{ spotlightItem.tip }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
:global(.spotlight-attach-element-highlight) {
  box-shadow: var(--ui-box-shadow-sm);
}

.v-enter-active {
  transition:
    opacity 0.4s ease-in,
    var(--spotlight-transform-transition);
}
.v-leave-active {
  transition:
    opacity 0.4s ease-out,
    var(--spotlight-transform-transition);
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.spotlight-ui {
  --spotlight-transform-transition: transform 0.4s cubic-bezier(0.8, -0.3, 0.265, 1.2);
  --spotlight-z-index: 10000; /* TODO: Adjust as needed */

  position: fixed;
  overflow: visible;
  inset: 0;
  pointer-events: none;
  z-index: var(--spotlight-z-index);
}

.spotlight-ui .spotlight-item {
  position: absolute;
}

.spotlight-ui .mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.spotlight-ui .mask path {
  fill: rgba(15, 23, 42, 0.45);
  pointer-events: fill;
}

.spotlight-ui .mask.v-leave-active path {
  pointer-events: none;
}

.spotlight-ui .spotlight-item.animated {
  transition: var(--spotlight-transform-transition);
}

.spotlight-ui .spotlight-item.bottom-right .anchor {
  transform: rotate(0deg);
}

.spotlight-ui .spotlight-item.bottom-right .tips {
  transform: translate(
    calc(var(--spotlight-anchor-size) - var(--spotlight-anchor-offset-x)),
    calc(-1 * var(--spotlight-anchor-offset-y))
  );
  border-top-left-radius: 2px;
}

.spotlight-ui .spotlight-item.bottom-right .tips .content {
  border-top-left-radius: 2px;
}

.spotlight-ui .spotlight-item.bottom-left .anchor {
  transform: rotate(90deg);
}

.spotlight-ui .spotlight-item.bottom-left .tips {
  transform: translate(
    calc(-100% - var(--spotlight-anchor-size) + var(--spotlight-anchor-offset-x)),
    calc(-1 * var(--spotlight-anchor-offset-y))
  );
  border-top-right-radius: 2px;
}

.spotlight-ui .spotlight-item.bottom-left .tips .content {
  border-top-right-radius: 2px;
}

.spotlight-ui .spotlight-item.top-right .anchor {
  transform: rotate(270deg);
}

.spotlight-ui .spotlight-item.top-right .tips {
  transform: translate(
    calc(var(--spotlight-anchor-size) - var(--spotlight-anchor-offset-x) / 2),
    calc(-100% - 2 * var(--spotlight-anchor-size) + var(--spotlight-anchor-offset-y) / 2)
  );
  border-bottom-left-radius: 2px;
}

.spotlight-ui .spotlight-item.top-right .tips .content {
  border-bottom-left-radius: 2px;
}

.spotlight-ui .spotlight-item.top-left .anchor {
  transform: rotate(180deg);
}

.spotlight-ui .spotlight-item.top-left .tips {
  transform: translate(
    calc(-100% - var(--spotlight-anchor-size) + var(--spotlight-anchor-offset-x) / 2),
    calc(-100% - 2 * var(--spotlight-anchor-size) + var(--spotlight-anchor-offset-y) / 2)
  );
  border-bottom-right-radius: 2px;
}

.spotlight-ui .spotlight-item.top-left .tips .content {
  border-bottom-right-radius: 2px;
}

.spotlight-ui .spotlight-item .anchor {
  width: var(--spotlight-anchor-size);
  height: var(--spotlight-anchor-size);
  transform-origin: left top;
}

.spotlight-ui .spotlight-item .tips {
  border-radius: 14px;
  padding: 2px;
  font-size: 12px;
  background: var(--ui-color-grey-100);
  word-wrap: break-word;
  box-sizing: border-box;
  max-width: min(
    300px,
    calc(100vw - var(--spotlight-edge-padding) - var(--spotlight-edge-padding) - var(--spotlight-anchor-size))
  );
  max-height: calc(
    100vh - var(--spotlight-edge-padding) - var(--spotlight-edge-padding) - var(--spotlight-anchor-size)
  );
  overflow: auto;
  box-shadow: var(--ui-box-shadow-sm);
}

.spotlight-ui .spotlight-item:not(.v-leave-active) .tips.scrollable {
  pointer-events: auto;
}

.spotlight-ui .spotlight-item .tips .content {
  border-radius: 12px;
  padding: 5px 8px;
  background: #7e66fc;
  color: var(--ui-color-grey-100);
}
</style>
