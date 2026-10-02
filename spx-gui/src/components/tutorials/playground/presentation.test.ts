import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { File } from '@/models/common/file'
import { Video } from '@/models/tutorial/video'

import CoursePlaygroundMessageModal from './CoursePlaygroundMessageModal.vue'
import CoursePlaygroundVideoModal from './CoursePlaygroundVideoModal.vue'

const globalOptions = {
  mocks: { $t: (message: { en: string }) => message.en },
  directives: { radar: () => {} },
  stubs: {
    UIModal: { props: ['visible'], template: '<div v-if="visible"><slot /></div>' },
    UIButton: { template: '<button><slot /></button>' },
    UIError: { template: '<div><slot /></div>' },
    UILoading: true,
    UIIcon: true
  }
}
const wrappers: VueWrapper[] = []

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

function mountVideo() {
  const file = new File('lesson.mp4', async () => new ArrayBuffer(0), { type: 'video/mp4' })
  vi.spyOn(file, 'url').mockResolvedValue('blob:lesson')
  const wrapper = mount(CoursePlaygroundVideoModal, {
    props: { visible: true, video: new Video('lesson', file) },
    global: globalOptions
  })
  wrappers.push(wrapper)
  return { wrapper, file }
}

describe('Course presentation', () => {
  it.each(['prelude', 'message'] as const)('renders %s Markdown and waits for confirmation', async (kind) => {
    const wrapper = mount(CoursePlaygroundMessageModal, {
      props: { visible: true, kind, content: '**Goal**: use `stepTo`' },
      global: globalOptions
    })
    wrappers.push(wrapper)
    expect(wrapper.find('strong').text()).toBe('Goal')
    expect(wrapper.find('code').text()).toBe('stepTo')
    expect(wrapper.emitted('resolved')).toBeUndefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('resolved')).toHaveLength(1)
  })

  it('keeps an ended video open for replay and resolves only on Continue', async () => {
    const { wrapper } = mountVideo()
    await flushPromises()
    await wrapper.find('video').trigger('ended')
    expect(wrapper.emitted('resolved')).toBeUndefined()
    await wrapper.find('button[aria-label="Play video"]').trigger('click')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    expect(wrapper.emitted('resolved')).toBeUndefined()
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(wrapper.emitted('resolved')).toHaveLength(1)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
  })

  it('aborts video loading and pauses playback when unmounted', async () => {
    const { wrapper, file } = mountVideo()
    await flushPromises()
    const signal = vi.mocked(file.url).mock.calls[0][0] as AbortSignal
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(signal.aborted).toBe(true)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it('offers a play action if both autoplay attempts are blocked', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(new Error('Autoplay blocked'))
    const { wrapper } = mountVideo()
    await flushPromises()
    await wrapper.find('video').trigger('loadeddata')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(true)
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it('shows a media error while allowing the learner to close the video', async () => {
    const { wrapper } = mountVideo()
    await flushPromises()
    await wrapper.find('video').trigger('error')
    expect(wrapper.text()).toContain('Failed to play the Course video')
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('resolved')).toHaveLength(1)
  })
})
