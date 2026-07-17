import { userLocalStorageRef } from '@/utils/user-storage'
import type { LocaleMessage } from '@/utils/i18n'

export type ApiVideoInfo = {
  /** Title shown on the video card, typically the API name */
  title: LocaleMessage
  /** URL of the video */
  src: string
}

/**
 * DEMO MODE: every API without its own library entry falls back to this shared demonstration
 * video, so the whole video flow can be experienced before per-API videos are produced.
 * TODO: remove the fallback (return `null` for unknown IDs) once real videos land.
 */
export const apiVideoDemoFallback = true
const demoVideoSrc = '/tutorial-api-videos/api-demo.mov'

/**
 * Global library of knowledge-point explainer videos for APIs, keyed by API definition ID —
 * the same IDs used by `list_api_reference_items` and the `api-reference-filter` element.
 * Each API has one globally reused explainer video (10–20s, pure demonstration).
 * Add entries here as videos are produced.
 */
const apiVideoLibrary: Record<string, ApiVideoInfo> = {
  'xgo:github.com/goplus/spx/v2?Sprite.step#0': {
    title: { en: 'step', zh: 'step 前进' },
    src: 'https://qnyproj-api-assets-dev.s3.us-east-1.amazonaws.com/step.mp4'
  }
}

/** Human-readable API name from a definition ID, e.g. `xgo:...?Sprite.step#0` -> `step`. */
function getApiDisplayName(apiId: string): string {
  const name = decodeURIComponent(apiId.split('?').at(-1) ?? apiId).split('#')[0]
  return name.split('.').at(-1) || name
}

export function getApiVideo(apiId: string): ApiVideoInfo | null {
  const entry = apiVideoLibrary[apiId]
  if (entry != null) return entry
  if (!apiVideoDemoFallback) return null
  const name = getApiDisplayName(apiId)
  return {
    title: { en: name, zh: name },
    src: demoVideoSrc
  }
}

export function getAvailableApiVideoIds(): string[] {
  return Object.keys(apiVideoLibrary)
}

// Which APIs the user has watched the explainer video for, so already-learned knowledge
// points are not pushed again.
const learnedApisRef = userLocalStorageRef<string[]>('builder-tutorial-learned-apis', [])

export function isApiLearned(apiId: string): boolean {
  return learnedApisRef.value.includes(apiId)
}

export function markApiLearned(apiId: string) {
  if (learnedApisRef.value.includes(apiId)) return
  learnedApisRef.value = [...learnedApisRef.value, apiId]
}
