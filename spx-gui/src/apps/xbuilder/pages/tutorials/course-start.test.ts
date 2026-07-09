import { describe, expect, it } from 'vitest'
import { getOpeningSteps, resolveStoryVideoUrl } from './course-start.vue'

describe('resolveStoryVideoUrl', () => {
  const origin = window.location.origin
  const defaultUrl = '/default/story.mp4'

  it('should fall back to the default when the query param is absent or empty', () => {
    expect(resolveStoryVideoUrl(undefined, defaultUrl)).toBe(defaultUrl)
    expect(resolveStoryVideoUrl('', defaultUrl)).toBe(defaultUrl)
    expect(resolveStoryVideoUrl(['/a.mp4'], defaultUrl)).toBe(defaultUrl)
    expect(resolveStoryVideoUrl(undefined, null)).toBeNull()
  })

  it('should accept same-origin URLs', () => {
    expect(resolveStoryVideoUrl('/videos/story.mp4', defaultUrl)).toBe(`${origin}/videos/story.mp4`)
    expect(resolveStoryVideoUrl(`${origin}/videos/story.mp4`, defaultUrl)).toBe(`${origin}/videos/story.mp4`)
  })

  it('should reject URLs on other origins', () => {
    expect(resolveStoryVideoUrl('https://evil.example.com/story.mp4', defaultUrl)).toBe(defaultUrl)
    expect(resolveStoryVideoUrl('//evil.example.com/story.mp4', defaultUrl)).toBe(defaultUrl)
  })

  it('should accept URLs on extra allowed origins', () => {
    expect(
      resolveStoryVideoUrl('https://usercontent.example.com/story.mp4', defaultUrl, ['https://usercontent.example.com'])
    ).toBe('https://usercontent.example.com/story.mp4')
    expect(
      resolveStoryVideoUrl('https://another.example.com/story.mp4', defaultUrl, ['https://usercontent.example.com'])
    ).toBe(defaultUrl)
  })
})

describe('getOpeningSteps', () => {
  const promptWithPrelude = 'Course goal.\n<course-prelude>先捡3个香蕉。</course-prelude>'

  it('should order the story video before the prelude', () => {
    expect(getOpeningSteps(promptWithPrelude, '/story.mp4')).toEqual([
      { kind: 'story-video', src: '/story.mp4' },
      { kind: 'prelude', text: '先捡3个香蕉。' }
    ])
  })

  it('should omit unconfigured steps', () => {
    expect(getOpeningSteps(promptWithPrelude, null)).toEqual([{ kind: 'prelude', text: '先捡3个香蕉。' }])
    expect(getOpeningSteps('No prelude here', '/story.mp4')).toEqual([{ kind: 'story-video', src: '/story.mp4' }])
    expect(getOpeningSteps('No prelude here', null)).toEqual([])
  })
})
