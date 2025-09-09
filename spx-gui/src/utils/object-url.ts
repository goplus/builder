/**
 * @desc Utilities for managing object URLs with automatic cleanup
 */

import { ref, watch, onUnmounted, type WatchSource } from 'vue'

/**
 * Helper for using object URLs with automatic cleanup.
 * Creates object URLs for Files/Blobs and automatically revokes them when no longer needed.
 */
export function useObjectUrl(fileSource: WatchSource<File | Blob | null | undefined>) {
  const urlRef = ref<string | null>(null)
  
  watch(
    fileSource,
    (file, _, onCleanup) => {
      if (file == null) {
        urlRef.value = null
        return
      }
      
      const objectUrl = URL.createObjectURL(file)
      urlRef.value = objectUrl
      
      onCleanup(() => {
        URL.revokeObjectURL(objectUrl)
        urlRef.value = null
      })
    },
    { immediate: true }
  )
  
  return urlRef
}

/**
 * Helper for creating multiple object URLs with automatic cleanup on unmount.
 * Useful when you need to create multiple object URLs programmatically.
 */
export function useObjectUrlManager() {
  const createdUrls = new Set<string>()
  
  const createUrl = (file: File | Blob): string => {
    const url = URL.createObjectURL(file)
    createdUrls.add(url)
    return url
  }
  
  const revokeUrl = (url: string): void => {
    if (createdUrls.has(url)) {
      URL.revokeObjectURL(url)
      createdUrls.delete(url)
    }
  }
  
  const revokeAll = (): void => {
    createdUrls.forEach(url => URL.revokeObjectURL(url))
    createdUrls.clear()
  }
  
  onUnmounted(() => {
    revokeAll()
  })
  
  return {
    createUrl,
    revokeUrl,
    revokeAll
  }
}
