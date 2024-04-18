export const isImage = (url: string): boolean => {
  const extension = url.split('.').pop()
  if (!extension) return false
  return ['svg', 'jpeg', 'jpg', 'png'].includes(extension)
}

export const isSound = (url: string): boolean => {
  const extension = url.split('.').pop()
  if (!extension) return false
  return ['wav', 'mp3', 'ogg'].includes(extension)
}

export function debounce<T extends (...args: any[]) => any>(func: T, delay: number = 300) {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => {
      func.apply(context, args)
    }, delay)
  }
}

/**
 * If (add-to-)library features are enabled.
 * In release v1.2, we do not allow users to add asset to library (the corresponding features are disabled).
 * These features are only enabled when there is `?library` in URL query. A simple & ugly interface will be provided.
 * This is a informal & temporary behavior.
 */
export function isLibraryEnabled() {
  return window.location.search.includes('?library')
}
