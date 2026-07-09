import { userLocalStorageRef } from '@/utils/user-storage'
import type { LocaleMessage } from '@/utils/i18n'

export type ApiVideoInfo = {
  /** Title shown on the video card, typically the API name */
  title: LocaleMessage
  /** URL of the video */
  src: string
}

/**
 * Global library of knowledge-point explainer videos for APIs, keyed by API definition ID —
 * the same IDs used by `list_api_reference_items` and the `api-reference-filter` element.
 * Each API has one globally reused explainer video (10–20s, pure demonstration).
 * Add entries here as videos are produced.
 */
const apiVideoLibrary: Record<string, ApiVideoInfo> = {
  // The video files are served from `public/tutorial-api-videos/` during development;
  // switch to usercontent CDN URLs once the videos are formally hosted.
  'xgo:github.com/goplus/spx/v2?Sprite.step#0': {
    title: { en: 'step', zh: 'step 前进' },
    src: '/tutorial-api-videos/step.mp4'
  }
}

export function getApiVideo(apiId: string): ApiVideoInfo | null {
  return apiVideoLibrary[apiId] ?? null
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
