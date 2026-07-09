import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import CourseIntroVideo from './CourseIntroVideo.vue'

function mountVideo() {
  return mount(CourseIntroVideo, {
    props: {
      src: '/tutorial-intro/code-drag-hint.mov'
    },
    global: {
      mocks: {
        $t: (msg: { en: string }) => msg.en
      }
    }
  })
}

describe('CourseIntroVideo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the configured video source', () => {
    const wrapper = mountVideo()

    expect(wrapper.get('video').attributes('src')).toBe('/tutorial-intro/code-drag-hint.mov')
  })

  it('plays the video from the overlay action', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const wrapper = mountVideo()

    await wrapper.get('.course-intro-play').trigger('click')

    expect(play).toHaveBeenCalledTimes(1)
  })

  it('continues to the course when the video ends', async () => {
    const wrapper = mountVideo()

    await wrapper.get('video').trigger('ended')

    expect(wrapper.emitted('continue')).toHaveLength(1)
  })

  it('lets learners skip the intro', async () => {
    const wrapper = mountVideo()

    await wrapper.get('.course-intro-skip').trigger('click')

    expect(wrapper.emitted('continue')).toHaveLength(1)
  })
})
