import { shallowRef, watch, type WatchSource } from 'vue'
import { useAsyncComputedFixed, useExternalUrl } from '@/utils/utils'
import { universalUrlToWebUrl } from '@/models/common/cloud'

export function useAvatarUrl(urlSource: WatchSource<string | null | undefined>) {
  const latestRawRef = shallowRef<string | null>(null)

  watch(
    urlSource,
    (raw) => {
      const normalized = raw == null || raw === '' ? null : raw
      if (normalized === latestRawRef.value) return
      latestRawRef.value = normalized
    },
    { immediate: true }
  )

  const resolvedUrl = useAsyncComputedFixed(async () => {
    const raw = latestRawRef.value
    if (raw == null) return null

    try {
      return await universalUrlToWebUrl(raw)
    } catch (err) {
      console.warn('Failed to resolve avatar url', raw, err)
      return null
    }
  })

  return useExternalUrl(() => resolvedUrl.value)
}
