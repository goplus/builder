import { describe, expect, it } from 'vitest'
import { tutorialVideoAssetBaseUrl } from '@/components/tutorials/api-videos'
import { getOpeningSteps, resolveAllowedVideoUrl, resolveStoryVideoUrl } from './course-start.vue'

describe('resolveAllowedVideoUrl', () => {
  const origin = window.location.origin

  it('should return null for absent or non-string values', () => {
    expect(resolveAllowedVideoUrl(undefined)).toBeNull()
    expect(resolveAllowedVideoUrl('')).toBeNull()
    expect(resolveAllowedVideoUrl(['/a.mp4'])).toBeNull()
  })

  it('should accept same-origin URLs', () => {
    expect(resolveAllowedVideoUrl('/videos/story.mp4')).toBe(`${origin}/videos/story.mp4`)
    expect(resolveAllowedVideoUrl(`${origin}/videos/story.mp4`)).toBe(`${origin}/videos/story.mp4`)
  })

  it('should reject URLs on other origins', () => {
    expect(resolveAllowedVideoUrl('https://evil.example.com/story.mp4')).toBeNull()
    expect(resolveAllowedVideoUrl('//evil.example.com/story.mp4')).toBeNull()
  })

  it('should accept URLs on extra allowed origins', () => {
    expect(
      resolveAllowedVideoUrl('https://usercontent.example.com/story.mp4', ['https://usercontent.example.com'])
    ).toBe('https://usercontent.example.com/story.mp4')
    expect(resolveAllowedVideoUrl('https://another.example.com/story.mp4', ['https://usercontent.example.com'])).toBe(
      null
    )
  })
})

describe('resolveStoryVideoUrl', () => {
  const origin = window.location.origin
  const promptWithVideo = 'Goal.\n<course-story-video>/course/opening.webm</course-story-video>'
  const defaultUrl = '/default/story.mp4'

  it('should prefer the video from the course prompt', () => {
    expect(resolveStoryVideoUrl(promptWithVideo, '/query.mp4', defaultUrl)).toBe(`${origin}/course/opening.webm`)
  })

  it('should fall back to the query param, then to the default', () => {
    expect(resolveStoryVideoUrl('No video here', '/query.mp4', defaultUrl)).toBe(`${origin}/query.mp4`)
    expect(resolveStoryVideoUrl('No video here', undefined, defaultUrl)).toBe(`${origin}${defaultUrl}`)
    expect(resolveStoryVideoUrl('No video here', undefined, null)).toBeNull()
  })

  it('should skip disallowed candidates instead of playing them', () => {
    expect(resolveStoryVideoUrl('No video here', 'https://evil.example.com/x.mp4', defaultUrl)).toBe(
      `${origin}${defaultUrl}`
    )
    const promptWithEvilVideo = '<course-story-video>https://evil.example.com/x.mp4</course-story-video>'
    expect(resolveStoryVideoUrl(promptWithEvilVideo, undefined, defaultUrl)).toBe(`${origin}${defaultUrl}`)
  })

  it('should accept a story video hosted on the tutorial asset origin', () => {
    const assetOrigin = new URL(tutorialVideoAssetBaseUrl).origin
    const src = `${tutorialVideoAssetBaseUrl}/opening.webm`
    const prompt = `<course-story-video>${src}</course-story-video>`
    // Rejected when the asset origin is not allowlisted...
    expect(resolveStoryVideoUrl(prompt, undefined, null)).toBeNull()
    // ...and played once it is (as course-start wires it in).
    expect(resolveStoryVideoUrl(prompt, undefined, null, [assetOrigin])).toBe(src)
  })
})

describe('getOpeningSteps', () => {
  const promptWithPrelude = 'Course goal.\n<course-prelude>先捡3个香蕉。</course-prelude>'

  it('should order the story video before the prelude', () => {
    expect(getOpeningSteps(promptWithPrelude, '/story.mp4', false)).toEqual([
      { kind: 'story-video', src: '/story.mp4' },
      { kind: 'prelude', text: '先捡3个香蕉。' }
    ])
  })

  it('should omit unconfigured steps', () => {
    expect(getOpeningSteps(promptWithPrelude, null, false)).toEqual([{ kind: 'prelude', text: '先捡3个香蕉。' }])
    expect(getOpeningSteps('No prelude here', '/story.mp4', false)).toEqual([
      { kind: 'story-video', src: '/story.mp4' }
    ])
    expect(getOpeningSteps('No prelude here', null, false)).toEqual([])
  })

  it('should drop the pre-editor prelude when the course runs its opening inside the editor', () => {
    // A course declaring an ordered `opening` sequence shows its prelude in-editor (via TutorialRoot);
    // the story video still plays before the editor exists.
    expect(getOpeningSteps(promptWithPrelude, '/story.mp4', true)).toEqual([{ kind: 'story-video', src: '/story.mp4' }])
    expect(getOpeningSteps(promptWithPrelude, null, true)).toEqual([])
  })
})
