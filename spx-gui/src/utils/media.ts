import { ref, watch, type WatchSource } from 'vue'
import type { File } from '@/models/common/file'
import { cloudHelpers } from '@/models/common/cloud'
import { capture } from './exception'
import { getCleanupSignal } from './disposable'

/** Get a saved WebUrl or create an owned object URL, released when the signal is aborted. */
export async function getFileMediaUrl(file: File, signal: AbortSignal): Promise<string> {
  const webUrl = await cloudHelpers.getFileWebUrl(file, signal)
  signal.throwIfAborted()
  return webUrl ?? file.url(signal)
}

/**
 * Acquire and release URLs for media consumers. Unlike useFileUrl and useExternalUrl,
 * this uses saved WebUrls directly instead of fetching them into a Blob first.
 * Files without a saved URL fall back to File.url. Loading covers URL acquisition
 * only; playback state belongs to the consumer. Remote media requires
 * crossorigin="anonymous" under COEP.
 *
 * Temporary adapter until File uses Source variants with native url() and explicit
 * objectUrl() access (https://github.com/goplus/builder/issues/3656). Then URL
 * selection belongs to File; this composable only needs to manage URL lifetimes.
 */
export function useFileMediaUrl(fileSource: WatchSource<File | null>) {
  const url = ref<string | null>(null)
  const loading = ref(false)
  watch(
    fileSource,
    async (file, _, onCleanup) => {
      const signal = getCleanupSignal(onCleanup)
      url.value = null
      loading.value = file != null
      if (file == null) return
      try {
        const source = await getFileMediaUrl(file, signal)
        if (!signal.aborted) url.value = source
      } catch (error) {
        if (!signal.aborted) capture(error)
      } finally {
        if (!signal.aborted) loading.value = false
      }
    },
    { immediate: true }
  )
  return [url, loading] as const
}
