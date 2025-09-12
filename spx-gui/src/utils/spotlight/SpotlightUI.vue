<script lang="ts">
enum Placement {
  BOTTOM_RIGHT = 'bottom-right',
  TOP_RIGHT = 'top-right',
  TOP_LEFT = 'top-left',
  BOTTOM_LEFT = 'bottom-left'
}

type Rect = {
  top: number
  left: number
  bottom: number
  right: number
  width: number
  height: number
}

type Position = {
  x: number
  y: number
  half: 'lower' | 'upper'
}

function getPointAlongDirection(x1: number, y1: number, x2: number, y2: number, distance: number): Position {
  const len = Math.hypot(x2 - x1, y2 - y1)
  if (len === 0) {
    return {
      x: x1,
      y: y1,
      half: 'lower'
    }
  }
  const ux = (x2 - x1) / len
  const uy = (y2 - y1) / len
  return {
    x: x2 - ux * distance,
    y: y2 - uy * distance,
    half: 'lower'
  }
}

function getDefaultPosition(): Position {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    half: 'lower'
  }
}
</script>

<script lang="ts" setup>
import { watch, ref, computed } from 'vue'
import { useSpotlight } from '@/utils/spotlight/index'
import anchor from './anchor.svg?raw'
import { throttle } from 'lodash'

const anchorSize = 26
const anchorOffset = [0, 0]
const conflictBuffer = 20

const spotlightRef = ref<HTMLElement | null>(null)
const placementRef = ref<Placement>(Placement.BOTTOM_RIGHT)
const positionRef = ref<Position>(getDefaultPosition())
const spotlightAnimated = ref(false)

const spotlight = useSpotlight()

const spotlightItem = computed(() => spotlight.spotlightItem.value)

function getRect(el: HTMLElement): Rect {
  const rect = el.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.left,
    bottom: window.innerHeight - rect.bottom,
    right: window.innerWidth - rect.right,
    width: rect.width,
    height: rect.height
  }
}

function setRectByPosition(rect: Rect, position: Position) {
  const { x, y } = position
  const { left, top, right, bottom, width, height } = rect
  const offsetX = left - x
  const offsety = top - y

  return {
    left: x,
    top: y,
    right: right + offsetX,
    bottom: bottom + offsety,
    width,
    height
  }
}

function correctSpotlightRect(placement: Placement, spotlightRect: Rect) {
  let { top, left, bottom, right, width, height } = spotlightRect
  width += anchorSize
  right -= anchorSize
  const tipsWidth = width - anchorSize
  const tipsHeight = height - anchorSize

  switch (placement) {
    case Placement.TOP_RIGHT:
      bottom += tipsHeight
      top -= tipsHeight
      break
    case Placement.TOP_LEFT:
      right += tipsWidth
      left -= tipsWidth
      top -= tipsHeight
      bottom += tipsHeight
      break
    case Placement.BOTTOM_LEFT:
      right += tipsWidth
      left -= tipsWidth
      break
  }

  return {
    top,
    left,
    bottom,
    right,
    width,
    height
  }
}

function getPlacementByHalf(spotlightRect: Rect, lowerHalf: boolean) {
  let placement = lowerHalf ? Placement.BOTTOM_RIGHT : Placement.TOP_RIGHT
  const correctRect = correctSpotlightRect(placement, spotlightRect)
  const { right } = correctRect
  const conflictRight = right - conflictBuffer

  if (lowerHalf) {
    return conflictRight > 0 ? Placement.BOTTOM_RIGHT : Placement.BOTTOM_LEFT
  }
  return conflictRight > 0 ? Placement.TOP_RIGHT : Placement.TOP_LEFT
}

function getRevealPosition(revealRect: Rect, spotlightRect: Rect): Position {
  const { left, top, bottom, width, height } = revealRect
  const [anchorOffsetLeft, anchorOffsetTop] = anchorOffset
  const spotlightHeight = spotlightRect.height

  const conflictTop = top - anchorOffsetTop
  const conflictBottom = bottom - anchorOffsetTop - conflictBuffer
  const lowerHalf = conflictBottom - spotlightHeight > 0
  const centerX = left + Math.round(width / 2)

  return {
    x: centerX + anchorOffsetLeft,
    y: lowerHalf ? conflictTop + height : conflictTop,
    half: lowerHalf ? 'lower' : 'upper'
  }
}

function providerRevealEl() {
  const revealEl = spotlightItem.value?.el
  if (!revealEl) {
    throw new Error('SpotlightUI must have an associated element')
  }
  return revealEl
}

function providerSpotlightEl() {
  const spotlightEl = spotlightRef.value
  if (!spotlightEl) {
    throw new Error('SpotlightUI element is not mounted yet')
  }
  return spotlightEl
}

function syncPlacementAndPosition() {
  const revealEl = providerRevealEl()
  const spotlightEl = providerSpotlightEl()
  const revealRect = getRect(revealEl)
  let spotlightRect = getRect(spotlightEl)

  const position = (positionRef.value = getRevealPosition(revealRect, spotlightRect))
  placementRef.value = getPlacementByHalf(setRectByPosition(spotlightRect, position), position.half === 'lower')

  spotlightEl.style.transform = `translateX(${position.x}px) translateY(${position.y}px)`
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

let lastBodyWidth = 0
let lastBodyHeight = 0
const throttledHandleRefresh = throttle((entries) => {
  for (let entry of entries) {
    const { width, height } = entry.contentRect
    // ResizeObserver triggers too frequently — avoid triggering in non-resize
    if (width === lastBodyWidth && height === lastBodyHeight) {
      continue
    }
    lastBodyWidth = width
    lastBodyHeight = height
    syncPlacementAndPosition()
  }
}, 20)
const resizeObserver = new ResizeObserver(throttledHandleRefresh)
watch(
  () => spotlightItem.value,
  (value, _, onCleanUp) => {
    if (!value) return

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
      revealElement(value.el)
      spotlight.emit('revealed', { rect: value.el.getBoundingClientRect() })
    })

    resizeObserver.observe(document.body)
    document.body.addEventListener('scroll', throttledHandleScroll, { capture: true, passive: true })
    document.body.addEventListener('scrollend', handleScrollEnd, { capture: true })
    onCleanUp(() => {
      resizeObserver.disconnect()
      document.body.removeEventListener('scroll', throttledHandleScroll, { capture: true })
      document.body.removeEventListener('scrollend', handleScrollEnd, { capture: true })
      concealElement(value.el)
    })
  },
  { immediate: true }
)
</script>

<template>
  <div class="spotlight-ui">
    <Transition>
      <div
        v-if="spotlightItem"
        ref="spotlightRef"
        :class="['spotlight-item', placementRef, { animated: spotlightAnimated }]"
        :style="{ transform: `translate(${positionRef.x}px, ${positionRef.y}px)` }"
      >
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="anchor" v-html="anchor"></div>
        <div ref="tipsEl" class="tips">
          <div class="content">{{ spotlightItem.tips }}</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
$anchor-size: 26px;
$anchor-offset-x: 6px;
$anchor-offset-y: 4px;
$transform-transition-property: transform 0.4s cubic-bezier(0.8, -0.3, 0.265, 1.2);
$z-index: 10000; // TODO: Adjust as needed

:global(.spotlight-attach-element-highlight) {
  box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.17);
}

.v-enter-active {
  transition:
    opacity 0.4s ease-in,
    $transform-transition-property;
}
.v-leave-active {
  transition:
    opacity 0.4s ease-out,
    $transform-transition-property;
}
.v-enter-from,
.v-leave-to {
  opacity: 0;
}

.spotlight-ui {
  position: absolute;
  overflow: hidden;
  inset: 0;
  pointer-events: none;
  z-index: $z-index;

  .spotlight-item {
    position: absolute;

    &.animated {
      transition: $transform-transition-property;
    }

    &.bottom-right {
      .anchor {
        transform: rotate(0deg);
      }
      .tips {
        transform: translate(calc($anchor-size - $anchor-offset-x), -$anchor-offset-y);
        border-top-left-radius: 2px;
        .content {
          border-top-left-radius: 2px;
        }
      }
    }
    &.bottom-left {
      .anchor {
        transform: rotate(90deg);
      }
      .tips {
        transform: translate(calc(-100% - $anchor-size + $anchor-offset-x), -$anchor-offset-y);
        border-top-right-radius: 2px;
        .content {
          border-top-right-radius: 2px;
        }
      }
    }
    &.top-right {
      .anchor {
        transform: rotate(270deg);
      }
      .tips {
        transform: translate(
          calc($anchor-size - $anchor-offset-x / 2),
          calc(-100% - 2 * $anchor-size + $anchor-offset-y / 2)
        );
        border-bottom-left-radius: 2px;
        .content {
          border-bottom-left-radius: 2px;
        }
      }
    }
    &.top-left {
      .anchor {
        transform: rotate(180deg);
      }
      .tips {
        transform: translate(
          calc(-100% - $anchor-size + $anchor-offset-x / 2),
          calc(-100% - 2 * $anchor-size + $anchor-offset-y / 2)
        );
        border-bottom-right-radius: 2px;
        .content {
          border-bottom-right-radius: 2px;
        }
      }
    }

    .anchor {
      width: $anchor-size;
      height: $anchor-size;
      transform-origin: left top;
    }

    .tips {
      border-radius: 14px;
      padding: 2px;
      font-size: 12px;
      font-weight: 600;
      background: var(--ui-color-grey-100);
      word-wrap: break-word;
      max-width: 300px;
      box-shadow: 0px 4px 16px 0px rgba(0, 0, 0, 0.17);

      .content {
        border-radius: 12px;
        padding: 5px 8px;
        background: #7e66fc;
        color: var(--ui-color-grey-100);
      }
    }
  }
}
</style>
