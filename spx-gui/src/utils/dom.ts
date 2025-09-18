import { ref, toValue, watch, type WatchSource } from 'vue'
import { throttle } from 'lodash'
import { getCleanupSignal } from './disposable'
import { createResettableObject } from '@/utils/utils'

export function useContentSize(elSource: WatchSource<HTMLElement | null>) {
  const width = ref<number | null>(null)
  const height = ref<number | null>(null)

  function onElementResize(entries: ResizeObserverEntry[]) {
    const { width: elementWidth, height: elementHeight } = entries[0].contentRect
    width.value = elementWidth
    height.value = elementHeight
  }

  watch(
    elSource,
    (el, _, onCleanup) => {
      if (el != null) {
        const observer = new ResizeObserver(onElementResize)
        observer.observe(el)
        onCleanup(() => observer.disconnect())
      }
    },
    { immediate: true }
  )

  return {
    width,
    height
  }
}

export function loadImg(src: string, timeout?: number) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(new Error(`load image failed: ${e.toString()}`))
    img.crossOrigin = 'anonymous'
    img.alt = ''
    img.src = src
    if (timeout != null) {
      setTimeout(() => reject(new Error('load image timeout')), timeout)
    }
  })
}

/** Add (and remove when not needed) `<link rel=prefetch>` */
export function addPrefetchLink(url: string) {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  link.crossOrigin = 'anonymous'
  link.onload = link.onerror = () => {
    document.head.removeChild(link)
  }
  document.head.appendChild(link)
}

export function useHovered(elSource: WatchSource<HTMLElement | null>) {
  const hovered = ref(false)
  watch(
    elSource,
    (el, _, onCleanup) => {
      if (el == null) return
      const signal = getCleanupSignal(onCleanup)
      el.addEventListener('mouseenter', () => (hovered.value = true), { signal })
      el.addEventListener('mouseleave', () => (hovered.value = false), { signal })
    },
    { immediate: true }
  )
  return hovered
}

/**
 * When content of given element changes, `useBottomSticky` ensures the element's scroll position
 * - sticky to bottom if it's already scrolled to bottom
 * - not changed if it's not scrolled to bottom
 */
export function useBottomSticky(elSource: WatchSource<HTMLElement | null>) {
  let isScrolledToBottom = true

  const handleScroll = throttle((e: Event) => {
    const el = e.target as HTMLElement
    isScrolledToBottom = el.scrollHeight < el.scrollTop + el.clientHeight + 1
  }, 50)

  watch(
    elSource,
    (el, _, onCleanup) => {
      if (el == null) return
      el.addEventListener('scroll', handleScroll)
      onCleanup(() => el.removeEventListener('scroll', handleScroll))
    },
    { immediate: true }
  )

  const onContentChange = () => {
    if (!isScrolledToBottom) return
    const el = toValue<HTMLElement | null>(elSource)
    if (el == null) return

    el.scrollTop = el.scrollHeight
  }

  watch(
    elSource,
    (el, _, onCleanup) => {
      if (el != null) {
        const observer = new MutationObserver(onContentChange)
        observer.observe(el, { childList: true, subtree: true })
        onCleanup(() => observer.disconnect())
      }
    },
    { immediate: true }
  )
}

export function useDraggableAngleForElement(
  elSource: WatchSource<HTMLElement | null>,
  { initialValue = 0, snap = 1 } = {}
) {
  const angleRef = ref(initialValue)

  const [rotateState, reset] = createResettableObject(() => ({
    centerX: 0,
    centerY: 0,
    left: 0,
    top: 0
  }))

  function calcAngle(x: number, y: number, centerX: number, centerY: number) {
    const angle = Math.atan2(x - centerX, centerY - y) * (180 / Math.PI)
    return Math.floor(angle < 0 ? angle + 360 : angle)
  }

  function angleOverlaySnap(angle: number, snap: number) {
    return Math.round(angle / snap) * snap
  }

  function handleDragAngle(e: MouseEvent) {
    const { left, top, centerX, centerY } = rotateState
    const angle = calcAngle(e.clientX - left, e.clientY - top, centerX, centerY)
    angleRef.value = angleOverlaySnap(angle, snap)
  }

  function handleEndDragAngle() {
    reset()
    document.removeEventListener('mousemove', handleDragAngle)
    document.removeEventListener('mouseup', handleEndDragAngle)
  }

  function handleStartDragAngle(e: MouseEvent, el: HTMLElement) {
    e.preventDefault()
    const rect = el.getBoundingClientRect()
    const { left, top, centerX, centerY } = Object.assign(rotateState, {
      left: rect.left,
      top: rect.top,
      centerX: rect.width / 2,
      centerY: rect.height / 2
    })
    angleRef.value = angleOverlaySnap(calcAngle(e.clientX - left, e.clientY - top, centerX, centerY), snap)
    document.addEventListener('mousemove', handleDragAngle)
    document.addEventListener('mouseup', handleEndDragAngle)
  }

  watch(
    elSource,
    (el, _, onCleanup) => {
      if (!el) return
      const handleMousedown = (e: MouseEvent) => handleStartDragAngle(e, el)
      el.addEventListener('mousedown', handleMousedown, { capture: true })
      onCleanup(() => el.removeEventListener('mousedown', handleMousedown, { capture: true }))
    },
    { immediate: true }
  )

  return angleRef
}

/**
 * Provides a composable utility for using the browser's EyeDropper API to pick colors from the screen.
 */
export function useEyeDropper() {
  const isSupported = Boolean('EyeDropper' in window)

  return {
    isSupported,
    /**
     * Opens the EyeDropper tool.
     * @param openOptions - Options for opening the EyeDropper, including an optional AbortSignal.
     * @returns A promise that resolves to the selected color in sRGBHex format.
     */
    async open(openOptions: { signal?: AbortSignal } = {}): Promise<string> {
      if (!isSupported) {
        throw new Error('EyeDropper is not supported in this browser')
      }
      const eyeDropper = new (window as any).EyeDropper()
      const { sRGBHex } = await eyeDropper.open(openOptions)
      return sRGBHex
    }
  }
}

export function isRectIntersecting(rect1: DOMRect, rect2: DOMRect) {
  return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom)
}
