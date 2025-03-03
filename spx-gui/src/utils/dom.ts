import { ref, watch, onBeforeUnmount, type WatchSource } from 'vue'
import { getCleanupSignal } from './disposable'

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
 * 监听元素位置变化
 * @param callback
 * @returns
 */
export function useElementPosition(callback: (rect: DOMRect) => void) {
  const mutationObserver = ref<MutationObserver | null>(null)
  const intersectionObserver = ref<IntersectionObserver | null>(null)
  let lastRect: DOMRect | null = null
  let rafId: number | null = null

  /** 使用requestAnimationFrame轮询监听元素位置信息 */
  const pollPosition = (element: HTMLElement) => {
    if (rafId) cancelAnimationFrame(rafId)
    const check = () => {
      const rect = element.getBoundingClientRect()
      if (!lastRect || lastRect.top !== rect.top || lastRect.left !== rect.left) {
        lastRect = rect
        callback(rect)
      }
      rafId = requestAnimationFrame(check)
    }
    rafId = requestAnimationFrame(check)
  }

  /** 开始监听 */
  const startPositionObserving = (element: HTMLElement | null) => {
    if (!element) return
    stopPositionObserving() // 先清除之前的监听

    // MutationObserver 监听 style/class 变化
    mutationObserver.value = new MutationObserver(() => {
      const rect = element.getBoundingClientRect()
      callback(rect)
    })
    mutationObserver.value.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    // IntersectionObserver 监听滚动/视口变化
    intersectionObserver.value = new IntersectionObserver(() => {
      const rect = element.getBoundingClientRect()
      callback(rect)
    })
    intersectionObserver.value.observe(element)

    // 轮询监听（适用于 transform 变化）
    pollPosition(element)
  }

  /** 停止监听 */
  const stopPositionObserving = () => {
    mutationObserver.value?.disconnect()
    intersectionObserver.value?.disconnect()
    if (rafId) cancelAnimationFrame(rafId)
    mutationObserver.value = null
    intersectionObserver.value = null
    rafId = null
  }

  onBeforeUnmount(() => {
    stopPositionObserving()
  })

  return {
    startPositionObserving,
    stopPositionObserving
  }
}

/**
 * 监听元素尺寸变化
 * @param callback
 * @returns
 */
export function useResizeObserver(callback: (entry: ResizeObserverEntry) => void) {
  const resizeObserver = ref<ResizeObserver | null>(null)

  /** 开始监听元素尺寸变化 */
  const startResizeObserving = (element: HTMLElement | null) => {
    if (!element) return
    stopResizeObserving() // 先移除旧的监听
    resizeObserver.value = new ResizeObserver((entries) => {
      for (const entry of entries) {
        callback(entry)
      }
    })
    resizeObserver.value.observe(element)
  }

  /** 停止监听 */
  const stopResizeObserving = () => {
    resizeObserver.value?.disconnect()
    resizeObserver.value = null
  }

  onBeforeUnmount(() => {
    stopResizeObserving()
  })

  return {
    startResizeObserving,
    stopResizeObserving
  }
}
