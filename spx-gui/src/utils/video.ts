import type { File } from '@/models/common/file'
import { getFileMediaUrl } from './media'

/** Best-effort metadata extraction; unavailable media must not block course saving. */
export async function readVideoDimensions(file: File, signal?: AbortSignal) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  const timeout = setTimeout(abort, 10000)
  const video = document.createElement('video')
  try {
    const url = await getFileMediaUrl(file, controller.signal)
    return await new Promise<{ width: number; height: number } | null>((resolve) => {
      const finish = () => resolve(null)
      controller.signal.addEventListener('abort', finish, { once: true })
      video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight })
      video.onerror = finish
      video.crossOrigin = 'anonymous'
      video.preload = 'metadata'
      video.src = url
      if (controller.signal.aborted) finish()
    })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
    video.onloadedmetadata = null
    video.onerror = null
    video.removeAttribute('src')
    video.load()
    controller.abort()
  }
}
