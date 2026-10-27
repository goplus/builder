import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { File } from '@/models/common/file'
import { cloudHelpers } from '@/models/common/cloud'
import { Video } from '@/models/tutorial/video'

import CoursePlaygroundMessageModal from './CoursePlaygroundMessageModal.vue'
import CoursePlaygroundVideoModal from './CoursePlaygroundVideoModal.vue'

const globalOptions = {
  mocks: { $t: (message: { en: string }) => message.en },
  directives: { radar: () => {} },
  stubs: {
    UIModal: { props: ['visible'], template: '<div v-if="visible"><slot /></div>' },
    UIButton: { template: '<button><slot /></button>' },
    UIError: { props: ['retry'], template: '<div><slot /><button @click="retry">Retry</button></div>' },
    UILoading: true,
    UIIcon: true
  }
}
const wrappers: VueWrapper[] = []

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.restoreAllMocks()
})

function mountVideo(visible = true) {
  const file = new File('lesson.mp4', async () => new ArrayBuffer(0), { type: 'video/mp4' })
  vi.spyOn(cloudHelpers, 'getFileWebUrl').mockResolvedValue('https://example.com/lesson.mp4')
  const wrapper = mount(CoursePlaygroundVideoModal, {
    props: { visible, video: new Video('lesson', file) },
    global: globalOptions
  })
  wrappers.push(wrapper)
  return { wrapper }
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
    const { wrapper } = mountVideo()
    await flushPromises()
    const signal = vi.mocked(cloudHelpers.getFileWebUrl).mock.calls[0][1] as AbortSignal
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(signal.aborted).toBe(true)
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled()
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it('opens initially hidden remote media with CORS and plays when data is ready', async () => {
    const { wrapper } = mountVideo(false)
    await wrapper.setProps({ visible: true })
    await flushPromises()
    const video = wrapper.get('video')
    expect(video.attributes('src')).toBe('https://example.com/lesson.mp4')
    expect(video.attributes('crossorigin')).toBe('anonymous')
    await video.trigger('loadeddata')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  })

  it('offers manual playback when autoplay is blocked', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('Autoplay blocked'))
    const { wrapper } = mountVideo()
    await flushPromises()
    await wrapper.find('video').trigger('loadeddata')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(true)
    await wrapper.find('button[aria-label="Play video"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(false)
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it('toggles sound without restarting playback and preserves it for replay', async () => {
    const { wrapper } = mountVideo()
    await flushPromises()
    const video = wrapper.find('video')
    await wrapper.find('button[aria-label="Turn sound off"]').trigger('click')
    expect(video.element.muted).toBe(true)
    await video.trigger('ended')
    await wrapper.find('button[aria-label="Play video"]').trigger('click')
    expect(video.element.muted).toBe(true)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    await wrapper.find('button[aria-label="Turn sound on"]').trigger('click')
    expect(video.element.muted).toBe(false)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it('shows a media error while allowing the learner to close the video', async () => {
    const { wrapper } = mountVideo()
    await flushPromises()
    await wrapper.find('video').trigger('error')
    expect(wrapper.text()).toContain('Failed to play the Course video')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(wrapper.emitted('resolved')).toHaveLength(1)
  })

  it('lets the component retry a failed native source and resolve the URL again', async () => {
    const { wrapper } = mountVideo()
    await flushPromises()
    await wrapper.get('video').trigger('error')
    expect(wrapper.find('video').exists()).toBe(false)
    vi.mocked(cloudHelpers.getFileWebUrl).mockResolvedValueOnce('https://example.com/retried.mp4')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.get('video').attributes('src')).toBe('https://example.com/retried.mp4')
    expect(cloudHelpers.getFileWebUrl).toHaveBeenCalledTimes(2)
    await wrapper.get('video').trigger('loadeddata')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  })

  it('shows and retries URL acquisition failures without a media element', async () => {
    vi.spyOn(cloudHelpers, 'getFileWebUrl')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('https://example.com/retried.mp4')
    const file = new File('lesson.mp4', async () => new ArrayBuffer(0))
    const wrapper = mount(CoursePlaygroundVideoModal, {
      props: { visible: true, video: new Video('lesson', file) },
      global: globalOptions
    })
    wrappers.push(wrapper)
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to play the Course video')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.get('video').attributes('src')).toBe('https://example.com/retried.mp4')
  })
})
