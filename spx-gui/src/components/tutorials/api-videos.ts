import { userLocalStorageRef } from '@/utils/user-storage'
import type { LocaleMessage } from '@/utils/i18n'
import { createCourseApiMatcher } from './course-config'

export type ApiVideoInfo = {
  /** Title shown on the video card, typically the API name */
  title: LocaleMessage
  /** URL of the video */
  src: string
}

/**
 * DEMO MODE: every API without its own library entry falls back to this shared demonstration
 * video (currently the `step` explainer — the only one produced so far), so the whole video flow
 * can be experienced before per-API videos are produced.
 * TODO: remove the fallback (return `null` for unknown IDs) once real videos land.
 */
export const apiVideoDemoFallback = true

/**
 * Base URL of the host serving tutorial videos (an S3 bucket during the demo phase). Exported as
 * the single source of truth for the host, so the course story-video origin allowlist can trust
 * the same host without re-declaring it (see `course-start.vue`).
 */
export const tutorialVideoAssetBaseUrl = 'https://qnyproj-api-assets-dev.s3.us-east-1.amazonaws.com'

const demoVideoSrc = `${tutorialVideoAssetBaseUrl}/step.mp4`

/**
 * Global library of knowledge-point explainer videos for APIs, keyed by API definition ID —
 * the same IDs used by `list_api_reference_items` and the `api-reference-filter` element.
 * Each API has one globally reused explainer video (10–20s, pure demonstration).
 * Add entries here as videos are produced.
 */
const apiVideoLibrary: Record<string, ApiVideoInfo> = {
  'xgo:github.com/goplus/spx/v2?Sprite.step#0': {
    title: { en: 'step', zh: 'step 前进' },
    src: `${tutorialVideoAssetBaseUrl}/step.mp4`
  },
  // Language-construct knowledge points (ids from the code editor's document base). They carry
  // the demo video until their real explainer videos are produced — listed here so the dialog
  // titles read naturally instead of exposing the raw ids.
  'xgo:?if_statement': {
    title: { en: 'if', zh: 'if 条件判断' },
    src: demoVideoSrc
  },
  'xgo:?if_else_statement': {
    title: { en: 'if / else', zh: 'if / else 分支' },
    src: demoVideoSrc
  },
  'xgo:?var_declaration': {
    title: { en: 'var', zh: 'var 变量' },
    src: demoVideoSrc
  },
  'xgo:?for_iterate': {
    title: { en: 'for in', zh: 'for in 遍历' },
    src: demoVideoSrc
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

/**
 * Resolve a single course video entry (an API name or definition ID, see `createCourseApiMatcher`)
 * to its playable video ID + info. An entry matching a library video uses that video's ID;
 * otherwise the entry itself is the key, which still plays in demo-fallback mode. Returns null
 * when the API is already learned (a knowledge point is not pushed twice) or has no video.
 */
export function resolveApiVideo(entry: string): { id: string; info: ApiVideoInfo } | null {
  const matches = createCourseApiMatcher([entry])
  const id = getAvailableApiVideoIds().find(matches) ?? entry
  if (isApiLearned(id)) return null
  const info = getApiVideo(id)
  return info != null ? { id, info } : null
}

/**
 * Resolve the course config's `videos` entries to playable videos, in order and de-duplicated.
 * Used for the legacy `videos` field; the ordered `opening` sequence resolves each video step
 * with `resolveApiVideo` instead.
 */
export function resolveCourseVideos(entries: string[]): Array<{ id: string; info: ApiVideoInfo }> {
  const resolved: Array<{ id: string; info: ApiVideoInfo }> = []
  for (const entry of entries) {
    const video = resolveApiVideo(entry)
    if (video == null || resolved.some((v) => v.id === video.id)) continue
    resolved.push(video)
  }
  return resolved
}
