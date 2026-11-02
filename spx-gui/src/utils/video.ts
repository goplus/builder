import type { File } from '@/models/common/file'
import { getFileMediaUrl } from './media'

/**
 * Read and cache intrinsic video dimensions.
 * Reject on extraction failure, a 10-second timeout, or cancellation.
 */
export async function readVideoDimensions(file: File, signal?: AbortSignal) {
  if (file.meta.videoSize != null) return file.meta.videoSize
  const controller = new AbortController()
  const abort = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) abort()
  const timeout = setTimeout(
    () => controller.abort(new DOMException('Video metadata loading timed out', 'TimeoutError')),
    10000
  )
  const video = document.createElement('video')
  try {
    const url = await getFileMediaUrl(file, controller.signal)
    return await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const onAbort = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', onAbort, { once: true })
      video.onloadedmetadata = () => {
        const size = { width: video.videoWidth, height: video.videoHeight }
        if (size.width <= 0 || size.height <= 0) return reject(new Error('Invalid video dimensions'))
        file.meta.videoSize = size
        resolve(size)
      }
      video.onerror = () => reject(video.error ?? new Error('Failed to load video metadata'))
      video.crossOrigin = 'anonymous'
      video.preload = 'metadata'
      video.src = url
      if (controller.signal.aborted) onAbort()
    })
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
    video.onloadedmetadata = null
    video.onerror = null
    video.removeAttribute('src')
    // Reset the media element after removing its source to stop loading and release media resources.
    video.load()
    controller.abort()
  }
}
