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

export function useElementRect(elSource: WatchSource<HTMLElement | null>) {
  const rect = ref<DOMRect | null>(null)

  let rafId: number | null = null
  let lastRect: DOMRect | null = null

  function updateRect(element: HTMLElement) {
    const newRect = element.getBoundingClientRect()
    if (
      !lastRect ||
      lastRect.top !== newRect.top ||
      lastRect.left !== newRect.left ||
      lastRect.width !== newRect.width ||
      lastRect.height !== newRect.height
    ) {
      lastRect = newRect
      rect.value = newRect
    }
  }

  // Use requestAnimationFrame to poll and monitor changes in elements
  function pollPosition(element: HTMLElement) {
    if (rafId) cancelAnimationFrame(rafId)
    const check = () => {
      updateRect(element)
      rafId = requestAnimationFrame(check)
    }
    rafId = requestAnimationFrame(check)
    // Returns a function that cancels the poll
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  watch(
    elSource,
    (el, _, onCleanup) => {
      if (!el) return

      updateRect(el)

      // Use ResizeObserver to monitor size changes
      const resizeObserver = new ResizeObserver(() => {
        updateRect(el)
      })
      resizeObserver.observe(el)

      // Use MutationObserver to monitor style/class changes
      const mutationObserver = new MutationObserver(() => {
        updateRect(el)
      })
      mutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ['style', 'class']
      })

      // Use IntersectionObserver to monitor scroll/viewport changes
      const intersectionObserver = new IntersectionObserver(() => {
        updateRect(el)
      })
      intersectionObserver.observe(el)

      // Polling monitoring (capturing changes such as transform)
      const cancelPoll = pollPosition(el)

      onCleanup(() => {
        resizeObserver.disconnect()
        mutationObserver.disconnect()
        intersectionObserver.disconnect()
        cancelPoll()
      })
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    if (rafId) cancelAnimationFrame(rafId)
  })

  return rect
}
