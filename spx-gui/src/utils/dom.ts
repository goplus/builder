import { ref, watch, type WatchSource } from 'vue'
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

  watch(
    elSource,
    (el, _, onCleanup) => {
      if (!el) return

      updateRect(el)

      // Use ResizeObserver to monitor size changes
      const resizeObserver = new ResizeObserver(() => {
        console.log('ResizeObserver triggered', el.getBoundingClientRect())
        updateRect(el)
      })
      resizeObserver.observe(el)

      /**
       * Use `MutationObserver` to monitor `style/class` changes.
       * It is mainly used to deal with special cases such as the use of `transform`.
       * `transform` is the rendering done by the browser on the existing element, which will not change the position and size
       */
      const mutationObserver = new MutationObserver(() => {
        console.log('MutationObserver triggered', el.getBoundingClientRect())
        updateRect(el)
      })
      mutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ['style', 'class']
      })

      // Use IntersectionObserver to monitor scroll/viewport changes
      const intersectionObserver = new IntersectionObserver(() => {
        console.log('IntersectionObserver triggered', el.getBoundingClientRect())
        updateRect(el)
      })
      intersectionObserver.observe(el)

      // Use window resize to monitor window size changes
      const onWindowResize = () => {
        updateRect(el)
      }
      window.addEventListener('resize', onWindowResize)

      el.addEventListener('transitionend', () => updateRect(el))
      el.addEventListener('animationend', () => updateRect(el))

      onCleanup(() => {
        resizeObserver.disconnect()
        mutationObserver.disconnect()
        intersectionObserver.disconnect()
        window.removeEventListener('resize', onWindowResize)
        el.removeEventListener('transitionend', () => updateRect(el))
        el.removeEventListener('animationend', () => updateRect(el))
      })
    },
    { immediate: true }
  )

  return rect
}

type Pos = {
  x: number
  y: number
}
type DragOptions = {
  onDragStart?: () => void // 开始拖拽
  onDragEnd?: () => void // 结束拖拽
  onDrag?: (deltaX: number, deltaY: number) => void // 拖拽中
  onClick?: () => void // 点击
  bondary?: {
    // 边界
    minX?: number
    maxX?: number
    minY?: number
    maxY?: number
  }
}

export function useDrag(
  elSource: WatchSource<HTMLElement | null>,
  getPos: () => Pos,
  setPos: (pos: Pos) => void,
  options?: DragOptions
) {
  const isDragging = ref<boolean>(false)
  const startPos = ref<Pos>({ x: 0, y: 0 })
  const startTime = ref<number>(0)

  function handleMousedown(e: MouseEvent): void {
    const { x, y } = getPos()
    startTime.value = Date.now()
    isDragging.value = true
    startPos.value = {
      x: e.clientX - x,
      y: e.clientY - y
    }
    options?.onDragStart?.()
    window.addEventListener('mousemove', handleMousemove)
    window.addEventListener('mouseup', handleMouseup)
    e.preventDefault()
  }

  function handleMousemove(e: MouseEvent): void {
    if (!isDragging.value) return
    requestAnimationFrame(() => {
      let newX = e.clientX - startPos.value.x
      let newY = e.clientY - startPos.value.y

      // 边界处理
      if (options?.bondary) {
        newX = Math.max(options.bondary.minX || 0, Math.min(options.bondary.maxX || Infinity, newX))
        newY = Math.max(options.bondary.minY || 0, Math.min(options.bondary.maxY || Infinity, newY))
      }

      options?.onDrag?.(newX, newY)

      setPos({
        x: newX,
        y: newY
      })
    })
  }

  function handleMouseup(): void {
    isDragging.value = false
    options?.onDragEnd?.()
    if (Date.now() - startTime.value < 200) {
      options?.onClick?.()
    }
    window.removeEventListener('mousemove', handleMousemove)
    window.removeEventListener('mouseup', handleMouseup)
  }

  watch(
    elSource,
    (el, _, onCleanup) => {
      if (el == null) return
      el.addEventListener('mousedown', handleMousedown)
      onCleanup(() => {
        el.removeEventListener('mousedown', handleMousedown)
        window.removeEventListener('mousemove', handleMousemove)
        window.removeEventListener('mouseup', handleMouseup)
      })
    },
    { immediate: true }
  )

  return {
    isDragging
  }
}
