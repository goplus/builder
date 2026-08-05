import { describe, expect, it } from 'vitest'
import { getApiVideo, rulerVideoId, topicVideos, turnDegreesVideoId, tutorialVideoAssetBaseUrl } from './api-videos'

describe('getApiVideo', () => {
  // These assert routing, not which file a knowledge point currently points at: re-shooting a
  // video (new artwork, a clearer take) should not fail the suite.
  const turnVideoSrc = getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.turn#0')?.src
  const stepVideoSrc = getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.step#0')?.src

  it('resolves a library API by its exact definition ID', () => {
    expect(turnVideoSrc).toMatch(new RegExp(`^${tutorialVideoAssetBaseUrl}/.+\\.mp4$`))
    expect(turnVideoSrc).not.toBe(stepVideoSrc)
  })

  it('resolves any overload (or a bare name) of a library API to the same video', () => {
    // The video explains the API, not one overload — #1 and the bare name must find it too.
    expect(getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.turn#1')?.src).toBe(turnVideoSrc)
    expect(getApiVideo('turn')?.src).toBe(turnVideoSrc)
  })

  it('resolves the non-API topic videos, including by bare name', () => {
    expect(getApiVideo(rulerVideoId)?.src).toBe(`${tutorialVideoAssetBaseUrl}/ruler.mp4`)
    expect(getApiVideo('ruler')?.src).toBe(`${tutorialVideoAssetBaseUrl}/ruler.mp4`)
  })

  it('resolves turnTo, which courses play before its first use', () => {
    const video = getApiVideo('turnTo')
    expect(video?.src).toBe(`${tutorialVideoAssetBaseUrl}/turnTo.mp4`)
    // Its own explainer, not the shared demo one.
    expect(video?.src).not.toBe(stepVideoSrc)
  })

  it('keeps the two turn notations apart', () => {
    // `turn 90` and `turn Right` are one function (Direction is a float64, Right is 90), so only a
    // knowledge point of its own can separate them — name matching must not collapse the two.
    const byDegrees = getApiVideo(turnDegreesVideoId)?.src
    expect(byDegrees).toMatch(new RegExp(`^${tutorialVideoAssetBaseUrl}/.+\\.mp4$`))
    expect(byDegrees).not.toBe(turnVideoSrc)
    expect(getApiVideo('turn-degrees')?.src).toBe(byDegrees)
    // The API itself keeps the direction-word take, whichever way it is addressed.
    expect(getApiVideo('turn')?.src).toBe(turnVideoSrc)
    expect(getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.turn#1')?.src).toBe(turnVideoSrc)
  })

  it('falls back to the demo video for an API with no library entry', () => {
    const video = getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.glide#0')
    expect(video?.src).toBe(stepVideoSrc)
    expect(video?.title).toEqual({ en: 'glide', zh: 'glide' })
  })
})

describe('topicVideos', () => {
  it('lists the ruler so the copilot can discover an ID that is not in the API reference', () => {
    expect(topicVideos.map((t) => t.id)).toContain(rulerVideoId)
    expect(topicVideos.every((t) => t.whenToUse.trim() !== '')).toBe(true)
  })
})
