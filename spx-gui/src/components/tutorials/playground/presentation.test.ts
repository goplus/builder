import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createRadar } from '@/utils/radar'
import { File } from '@/models/common/file'
import { cloudHelpers } from '@/models/common/cloud'
import { Video } from '@/models/tutorial/video'

import CoursePlaygroundMessageModal from './CoursePlaygroundMessageModal.vue'
import CoursePlaygroundVideoModal from './CoursePlaygroundVideoModal.vue'

const globalOptions = {
  mocks: { $t: (message: { en: string }) => message.en },
  directives: { radar: () => {} },
  stubs: {
    UIModal: {
      name: 'UIModal',
      props: ['visible', 'maskClosable', 'closeOnEsc'],
      template: '<div v-if="visible"><slot /></div>'
    },
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

function mountVideo(visible = true, lang: 'en' | 'zh' = 'en') {
  const file = new File('lesson.mp4', async () => new ArrayBuffer(0), { type: 'video/mp4' })
  vi.spyOn(cloudHelpers, 'getFileWebUrl').mockResolvedValue('https://example.com/lesson.mp4')
  const wrapper = mount(CoursePlaygroundVideoModal, {
    props: { visible, buttonText: null, video: new Video('lesson', file) },
    global: {
      ...globalOptions,
      directives: {},
      plugins: [createRadar()],
      mocks: { $t: (message: { en: string; zh: string }) => message[lang] }
    }
  })
  wrappers.push(wrapper)
  return { wrapper }
}

describe('Course presentation', () => {
  it.each([
    { kind: 'prelude', lang: 'en', label: 'Start' },
    { kind: 'prelude', lang: 'zh', label: '开始' },
    { kind: 'message', lang: 'en', label: 'Continue' },
    { kind: 'message', lang: 'zh', label: '继续' }
  ] as const)('renders $kind Markdown and waits for $label confirmation', async ({ kind, lang, label }) => {
    const wrapper = mount(CoursePlaygroundMessageModal, {
      props: { visible: true, kind, buttonText: null, contents: ['**Goal**: use `stepTo`'] },
      global: { ...globalOptions, mocks: { $t: (message: { en: string; zh: string }) => message[lang] } }
    })
    wrappers.push(wrapper)
    expect(wrapper.find('button').text()).toBe(label)
    expect(wrapper.find('strong').text()).toBe('Goal')
    expect(wrapper.find('code').text()).toBe('stepTo')
    expect(wrapper.emitted('resolved')).toBeUndefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('resolved')).toHaveLength(1)
  })

  it.each([
    { buttonText: null, label: 'Start' },
    { buttonText: 'Begin lesson', label: 'Begin lesson' }
  ])('keeps prelude pages in one modal with $label on the last page', async ({ buttonText, label }) => {
    const wrapper = mount(CoursePlaygroundMessageModal, {
      props: { visible: true, kind: 'prelude', contents: ['First', 'Second'], buttonText },
      global: globalOptions
    })
    wrappers.push(wrapper)
    const modal = wrapper.findComponent({ name: 'UIModal' })
    const surface = wrapper.element
    expect(modal.props()).toMatchObject({ closeOnEsc: false, maskClosable: false })
    expect(wrapper.find('button').text()).toBe('Next')
    expect(wrapper.text()).toContain('First')
    const scroll = wrapper.find('.overflow-y-auto').element
    scroll.scrollTop = 100
    await wrapper.find('button').trigger('click')
    expect(wrapper.element).toBe(surface)
    expect(wrapper.emitted('resolved')).toBeUndefined()
    expect(wrapper.text()).toContain('Second')
    expect(scroll.scrollTop).toBe(0)
    expect(wrapper.find('button').text()).toBe(label)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('resolved')).toHaveLength(1)
  })

  it('supports a video handoff label without ending on video completion', async () => {
    const { wrapper } = mountVideo()
    await wrapper.setProps({ buttonText: 'Start' })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'UIModal' }).props()).toMatchObject({ closeOnEsc: false, maskClosable: false })
    await wrapper.find('video').trigger('ended')
    expect(wrapper.emitted('resolved')).toBeUndefined()
    expect(wrapper.findAll('button').at(-1)!.text()).toBe('Start')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(wrapper.emitted('resolved')).toHaveLength(1)
  })

  it('keeps an ended video open for replay and resolves only on Continue', async () => {
    const { wrapper } = mountVideo()
    await flushPromises()
    expect(wrapper.findAll('button').at(-1)!.text()).toBe('Continue')
    await wrapper.find('video').trigger('playing')
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

  it('keeps loading over remote media until a video frame reaches the compositor', async () => {
    let startPlayback!: () => void
    const playback = new Promise<void>((resolve) => (startPlayback = resolve))
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(playback)
    const { wrapper } = mountVideo(false)
    await wrapper.setProps({ visible: true })
    await flushPromises()
    const video = wrapper.get('video')
    let presentFrame!: () => void
    Object.defineProperty(video.element, 'requestVideoFrameCallback', {
      value: (callback: () => void) => (presentFrame = callback)
    })
    expect(video.attributes('src')).toBe('https://example.com/lesson.mp4')
    expect(video.attributes('crossorigin')).toBe('anonymous')
    expect(wrapper.findComponent({ name: 'UILoading' }).exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(false)
    await video.trigger('loadeddata')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    expect(wrapper.findComponent({ name: 'UILoading' }).exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(false)
    await video.trigger('playing')
    startPlayback()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'UILoading' }).exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(false)
    presentFrame()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'UILoading' }).exists()).toBe(false)
  })

  it('offers manual playback when autoplay is blocked', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error('Autoplay blocked'))
    const { wrapper } = mountVideo()
    await flushPromises()
    await wrapper.find('video').trigger('loadeddata')
    await flushPromises()
    expect(wrapper.findComponent({ name: 'UILoading' }).exists()).toBe(false)
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(true)
    await wrapper.find('button[aria-label="Play video"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(false)
    expect(wrapper.emitted('resolved')).toBeUndefined()
  })

  it.each([
    { lang: 'en', soundOn: 'Turn sound on', soundOff: 'Turn sound off', play: 'Play video' },
    { lang: 'zh', soundOn: '打开声音', soundOff: '关闭声音', play: '播放视频' }
  ] as const)('keeps $lang video labels in sync with sound state and preserves it for replay', async (labels) => {
    const { wrapper } = mountVideo(true, labels.lang)
    await flushPromises()
    const video = wrapper.find('video')
    await wrapper.get(`button[aria-label="${labels.soundOff}"]`).trigger('click')
    expect(video.element.muted).toBe(true)
    expect(wrapper.get(`button[aria-label="${labels.soundOn}"]`).attributes('aria-pressed')).toBe('false')
    await video.trigger('playing')
    await video.trigger('ended')
    await wrapper.get(`button[aria-label="${labels.play}"]`).trigger('click')
    expect(video.element.muted).toBe(true)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
    await wrapper.get(`button[aria-label="${labels.soundOn}"]`).trigger('click')
    expect(video.element.muted).toBe(false)
    expect(wrapper.get(`button[aria-label="${labels.soundOff}"]`).attributes('aria-pressed')).toBe('true')
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
    expect(wrapper.findComponent({ name: 'UILoading' }).exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Play video"]').exists()).toBe(false)
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
      props: { visible: true, buttonText: null, video: new Video('lesson', file) },
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
