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

function getDefaultPosition(): Position {
  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    half: 'lower'
  }
}

function calcRevealDOMRect(spotlightEl: HTMLElement, placement: Placement) {
  const rect = spotlightEl.getBoundingClientRect()
  let { width, height, left, top } = rect

  switch (placement) {
    case Placement.TOP_RIGHT:
      top -= height
      break
    case Placement.TOP_LEFT:
      left -= width
      top -= height
      break
    case Placement.BOTTOM_LEFT:
      left -= width
      break
  }

  return new DOMRect(left, top, width, height)
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

function getAttachPosition(attachRect: Rect, spotlightRect: Rect): Position {
  const { left, top, bottom, width, height } = attachRect
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

function providerAttachEl() {
  const attachEl = spotlightItem.value?.el
  if (!attachEl) {
    throw new Error('SpotlightUI must have an associated element')
  }
  return attachEl
}

function providerSpotlightEl() {
  const spotlightEl = spotlightRef.value
  if (!spotlightEl) {
    throw new Error('SpotlightUI element is not mounted yet')
  }
  return spotlightEl
}

function syncPlacementAndPosition() {
  const attachEl = providerAttachEl()
  const spotlightEl = providerSpotlightEl()
  const attachRect = getRect(attachEl)
  let spotlightRect = getRect(spotlightEl)

  const position = (positionRef.value = getAttachPosition(attachRect, spotlightRect))
  placementRef.value = getPlacementByHalf(setRectByPosition(spotlightRect, position), position.half === 'lower')

  spotlightEl.style.transform = `translateX(${position.x}px) translateY(${position.y}px)`
}

function attachElement(attachEl: HTMLElement) {
  attachEl.scrollIntoView({ block: 'nearest' })
  attachEl.classList.add('spotlight-attach-element-highlight')
  spotlightRef.value?.classList.add('animated')
  syncPlacementAndPosition()
}

function detachElement(attachEl: HTMLElement) {
  attachEl.classList.remove('spotlight-attach-element-highlight')
}

function handleScroll() {
  syncPlacementAndPosition()
  spotlightRef.value?.classList.remove('animated')
}

function handleScrollEnd() {
  spotlightRef.value?.classList.add('animated')
}

const throttledHandleRefresh = throttle(handleScroll, 20)

const resizeObserver = new ResizeObserver(throttledHandleRefresh)
watch(
  () => spotlightItem.value,
  (value, _, onCleanUp) => {
    if (!value) {
      positionRef.value = getDefaultPosition()
      return
    }
    requestAnimationFrame(() => {
      attachElement(value.el)
      const spotlightEl = providerSpotlightEl()
      spotlight.emit('onReveal', { target: spotlightEl, rect: calcRevealDOMRect(spotlightEl, placementRef.value) })
    })

    resizeObserver.observe(document.body)
    document.body.addEventListener('scroll', throttledHandleRefresh, { capture: true, passive: true })
    document.body.addEventListener('scrollend', handleScrollEnd, { capture: true })
    onCleanUp(() => {
      resizeObserver.disconnect()
      document.body.removeEventListener('scroll', throttledHandleRefresh, { capture: true })
      document.body.removeEventListener('scrollend', handleScrollEnd, { capture: true })
      detachElement(value.el)
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
        :class="['spotlight-item', placementRef]"
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
