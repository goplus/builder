import { computed, ref, type ComputedRef } from 'vue'

/**
 * Size a video box to the video itself. Tutorial videos are not one shape — the knowledge-point
 * library mixes 4:3 and 16:9, and story videos vary per series — so the box reads the intrinsic
 * ratio from the loaded metadata instead of pinning one, which would letterbox everything else.
 * `fallback` is the shape used until the metadata arrives.
 */
export function useVideoAspect(fallback: number): {
  aspectStyle: ComputedRef<{ aspectRatio: string }>
  handleLoadedMetadata: (e: Event) => void
} {
  const detectedRef = ref<number | null>(null)

  function handleLoadedMetadata(e: Event) {
    const el = e.target as HTMLVideoElement
    if (el.videoWidth > 0 && el.videoHeight > 0) detectedRef.value = el.videoWidth / el.videoHeight
  }

  const aspectStyle = computed(() => ({ aspectRatio: String(detectedRef.value ?? fallback) }))

  return { aspectStyle, handleLoadedMetadata }
}
