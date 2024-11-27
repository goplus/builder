import { ref, watch, type WatchSource } from 'vue'

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
