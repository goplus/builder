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
 * video (the `step` explainer), so the whole video flow can be experienced before per-API videos
 * are produced.
 * TODO: remove the fallback (return `null` for unknown IDs) once real videos land.
 */
export const apiVideoDemoFallback = true

/**
 * Base URL of the host serving tutorial videos (an S3 bucket during the demo phase). Exported as
 * the single source of truth for the host, so the course story-video origin allowlist can trust
 * the same host without re-declaring it (see `course-start.vue`).
 */
export const tutorialVideoAssetBaseUrl = 'https://qnyproj-api-assets-dev.s3.us-east-1.amazonaws.com'

const demoVideoSrc = `${tutorialVideoAssetBaseUrl}/step+200.mp4`

/**
 * Explainer videos exist for things that are not APIs too — editor tools a course teaches. They
 * live in the same library so `<api-video>` plays them identically, but the copilot cannot
 * discover them from `list_api_reference_items`, so they are enumerated in that element's
 * description (see `ApiVideo.vue`). IDs follow the pseudo-ID shape of the language constructs.
 */
export const rulerVideoId = 'xbuilder:?ruler'

/**
 * `turn 90` and `turn Right` are the *same* function — spx's `Direction` is a float64 and `Right`
 * is the constant 90 — so the two notations cannot be told apart by definition ID or overload, and
 * the API reference lists only the word form. The degree notation is a teaching point rather than
 * an API, so it gets an ID of its own, the way the ruler does.
 */
export const turnDegreesVideoId = 'xbuilder:?turn-degrees'

/** Non-API topics with a video, and when the copilot should play each. */
export const topicVideos: Array<{ id: string; whenToUse: string }> = [
  {
    id: rulerVideoId,
    whenToUse: 'the stage ruler — how to measure a distance or a turn angle on the stage'
  },
  {
    id: turnDegreesVideoId,
    whenToUse: 'writing a turn as an angle (`turn 90`) instead of a direction (`turn Right`)'
  }
]

/**
 * Global library of knowledge-point explainer videos, keyed by API definition ID — the same IDs
 * used by `list_api_reference_items` and the `api-reference-filter` element — plus the non-API
 * topic IDs above. Each entry has one globally reused explainer video (10–20s, pure
 * demonstration). Add entries here as videos are produced.
 */
const apiVideoLibrary: Record<string, ApiVideoInfo> = {
  'xgo:github.com/goplus/spx/v2?Sprite.step#0': {
    title: { en: 'step', zh: 'step 前进' },
    src: `${tutorialVideoAssetBaseUrl}/step+200.mp4`
  },
  'xgo:github.com/goplus/spx/v2?Sprite.turn#0': {
    title: { en: 'turn', zh: 'turn 转向' },
    src: `${tutorialVideoAssetBaseUrl}/turn+Left.mp4`
  },
  [turnDegreesVideoId]: {
    title: { en: 'turn <degrees>', zh: 'turn 的数字写法' },
    // `?v=2` because this take replaced an earlier video *under the same name*, and the bucket
    // sends neither `Cache-Control` nor `ETag` — browsers hold the old bytes on heuristic
    // freshness and never revalidate. New takes should get new filenames instead; this one
    // cannot, so the URL changes here.
    src: `${tutorialVideoAssetBaseUrl}/turn.mp4?v=2`
  },
  'xgo:github.com/goplus/spx/v2?Sprite.stepTo#0': {
    title: { en: 'stepTo', zh: 'stepTo 走向目标' },
    src: `${tutorialVideoAssetBaseUrl}/stepTo.mp4`
  },
  'xgo:github.com/goplus/spx/v2?Sprite.turnTo#0': {
    title: { en: 'turnTo', zh: 'turnTo 面向目标' },
    src: `${tutorialVideoAssetBaseUrl}/turnTo.mp4`
  },
  [rulerVideoId]: {
    title: { en: 'The ruler', zh: '尺子怎么用' },
    src: `${tutorialVideoAssetBaseUrl}/ruler.mp4`
  },
  'xgo:github.com/goplus/spx/v2?repeat': {
    title: { en: 'repeat', zh: 'repeat 重复执行' },
    // The first WebM in the library; `<video>` picks the decoder from the bucket's `video/webm`.
    src: `${tutorialVideoAssetBaseUrl}/repeat.webm`
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
  // A video explains the API, not one specific overload — so an ID the library does not carry
  // verbatim (another overload of `turn`, or a bare name) still finds it by name.
  const name = getApiDisplayName(apiId)
  const matches = createCourseApiMatcher([name])
  const matchedId = Object.keys(apiVideoLibrary).find(matches)
  if (matchedId != null) return apiVideoLibrary[matchedId]
  if (!apiVideoDemoFallback) return null
  return {
    title: { en: name, zh: name },
    src: demoVideoSrc
  }
}

export function getAvailableApiVideoIds(): string[] {
  return Object.keys(apiVideoLibrary)
}

/**
 * Whether a knowledge point already watched is skipped when a later course asks for it.
 *
 * Off for now. The library is still being shot and reshot, and the marker is per knowledge point,
 * not per file — so anyone who saw the earlier `step` or `turn` take would never be shown the one
 * that replaced it. It also makes the courses hard to review: opening a course twice shows its
 * opening only once. Watching is still recorded, so turning this back on picks up where it left off.
 */
const suppressWatchedApiVideos = false

// Which APIs the user has watched the explainer video for.
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
 * otherwise the entry itself is the key, which still plays in demo-fallback mode. Returns null when
 * the entry has no video, and — while `suppressWatchedApiVideos` is on — when it was already
 * watched.
 */
export function resolveApiVideo(entry: string): { id: string; info: ApiVideoInfo } | null {
  const matches = createCourseApiMatcher([entry])
  const id = getAvailableApiVideoIds().find(matches) ?? entry
  if (suppressWatchedApiVideos && isApiLearned(id)) return null
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
