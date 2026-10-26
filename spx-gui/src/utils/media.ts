import { ref, watch, type Ref, type WatchSource } from 'vue'
import type { File } from '@/models/common/file'
import { getCleanupSignal } from './disposable'

/** Own a media source and stop native requests when it is replaced or disposed. */
export function useFileMediaUrl(fileSource: WatchSource<File | null>, element: Ref<HTMLMediaElement | null>) {
  const url = ref<string | null>(null)
  const loading = ref(false)
  const failed = ref(false)
  const revision = ref(0)

  watch(
    [fileSource, revision],
    async ([file], _, onCleanup) => {
      onCleanup(() => {
        const media = element.value
        if (media == null) return
        media.pause()
        media.removeAttribute('src')
        media.load()
      })
      const signal = getCleanupSignal(onCleanup)
      url.value = null
      failed.value = false
      loading.value = file != null
      if (file == null) return
      try {
        const source = await file.mediaUrl(signal)
        if (!signal.aborted) url.value = source
      } catch {
        if (!signal.aborted) {
          failed.value = true
          loading.value = false
        }
      }
    },
    { immediate: true }
  )

  return { url, loading, failed, reload: () => revision.value++ }
}
