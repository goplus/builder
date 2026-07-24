import { describe, expect, it } from 'vitest'
import { getApiVideo, rulerVideoId, topicVideos, tutorialVideoAssetBaseUrl } from './api-videos'

describe('getApiVideo', () => {
  it('resolves a library API by its exact definition ID', () => {
    const video = getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.turn#0')
    expect(video?.src).toBe(`${tutorialVideoAssetBaseUrl}/turn.mp4`)
  })

  it('resolves any overload (or a bare name) of a library API to the same video', () => {
    // The video explains the API, not one overload — #1 and the bare name must find it too.
    const bySecondOverload = getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.turn#1')
    const byBareName = getApiVideo('turn')
    expect(bySecondOverload?.src).toBe(`${tutorialVideoAssetBaseUrl}/turn.mp4`)
    expect(byBareName?.src).toBe(`${tutorialVideoAssetBaseUrl}/turn.mp4`)
  })

  it('resolves the non-API topic videos, including by bare name', () => {
    expect(getApiVideo(rulerVideoId)?.src).toBe(`${tutorialVideoAssetBaseUrl}/ruler.mp4`)
    expect(getApiVideo('ruler')?.src).toBe(`${tutorialVideoAssetBaseUrl}/ruler.mp4`)
  })

  it('falls back to the demo video for an API with no library entry', () => {
    const video = getApiVideo('xgo:github.com/goplus/spx/v2?Sprite.glide#0')
    expect(video?.src).toBe(`${tutorialVideoAssetBaseUrl}/step.mp4`)
    expect(video?.title).toEqual({ en: 'glide', zh: 'glide' })
  })
})

describe('topicVideos', () => {
  it('lists the ruler so the copilot can discover an ID that is not in the API reference', () => {
    expect(topicVideos.map((t) => t.id)).toContain(rulerVideoId)
    expect(topicVideos.every((t) => t.whenToUse.trim() !== '')).toBe(true)
  })
})
