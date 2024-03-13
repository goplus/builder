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
