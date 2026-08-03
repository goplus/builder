import { computed, ref, type ComputedRef } from 'vue'

/**
 * Start playback with sound. The tutorial dialogs render no controls, so a video the browser
 * refuses to autoplay would freeze on its first frame with no way to recover — if unmuted playback
 * is rejected (autoplay policy without a qualifying gesture), fall back to muted playback rather
 * than not playing at all. Bind to the video's `loadeddata` event alongside the `autoplay`
 * attribute; when autoplay already succeeded, the extra `play()` is a no-op.
 */
export async function handlePlayWithSound(e: Event): Promise<void> {
  const el = e.target as HTMLVideoElement
  try {
    await el.play()
  } catch {
    el.muted = true
    try {
      await el.play()
    } catch {
      // Leave it to the user agent; the poster frame is the best we can do.
    }
  }
}

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
