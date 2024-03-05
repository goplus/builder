import { onMounted, onUnmounted, ref } from 'vue'
import type { Ref } from 'vue'
export function useSize(elRef: Ref<HTMLElement | null>) {
  const width = ref(0)
  const height = ref(0)
  let observer: ResizeObserver | null = null

  // monitor element size change
  const onElementResize = (entries: any) => {
    for (const entry of entries) {
      const { width: elementWidth, height: elementHeight } = entry.contentRect
      width.value = elementWidth
      height.value = elementHeight
    }
  }

  onMounted(() => {
    if (elRef.value) {
      observer = new ResizeObserver(onElementResize)
      observer.observe(elRef.value)
    }
  })
  onUnmounted(() => {
    if (observer) {
      observer.disconnect()
    }
  })
  return {
    width,
    height
  }
}
