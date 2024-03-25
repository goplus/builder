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
