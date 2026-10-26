import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { File, fromBlob } from '@/models/common/file'
import { Video } from '@/models/tutorial/video'
import CourseResourceCard from './CourseResourceCard.vue'
import CourseResourcePreviewModal from './CourseResourcePreviewModal.vue'

enableAutoUnmount(afterEach)

const global = {
  mocks: { $t: (message: { en: string }) => message.en },
  directives: { radar: () => {} },
  stubs: {
    UIModal: { props: ['visible'], template: '<div v-if="visible"><slot /></div>' },
    UIModalClose: true,
    UIError: { props: ['retry'], template: '<div><slot /><button @click="retry">Retry</button></div>' },
    UILoading: true,
    UIIcon: true,
    UIDropdown: true,
    UIMenu: true,
    UIMenuGroup: true,
    UIMenuItem: true,
    CodeView: true,
    CopyButton: true
  }
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
})

afterEach(() => vi.restoreAllMocks())

function remoteVideo() {
  return new Video(
    'lesson',
    new File('lesson.mp4', () => new Promise(() => {}), {
      resolveMediaUrl: async () => 'https://example.com/lesson.mp4'
    })
  )
}

describe('Course video resources', () => {
  it('loads card thumbnails progressively with CORS and metadata preload', async () => {
    const wrapper = mount(CourseResourceCard, { props: { resource: remoteVideo() }, global })
    await flushPromises()
    expect(wrapper.get('video').attributes()).toMatchObject({
      src: 'https://example.com/lesson.mp4#t=0.1',
      crossorigin: 'anonymous',
      preload: 'metadata'
    })
    const element = wrapper.get('video').element
    wrapper.unmount()
    expect(element.hasAttribute('src')).toBe(false)
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled()
  })

  it('loads and releases unsaved video sources in the editor preview', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:unsaved')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const resource = new Video('local', fromBlob('local.mp4', new Blob(['video'], { type: 'video/mp4' })))
    const wrapper = mount(CourseResourcePreviewModal, { props: { visible: false, resource }, global })
    await wrapper.setProps({ visible: true })
    await flushPromises()
    const video = wrapper.get('video')
    expect(video.attributes('src')).toBe('blob:unsaved')
    expect(video.attributes('crossorigin')).toBe('anonymous')
    await video.trigger('loadeddata')
    expect(wrapper.findComponent({ name: 'UILoading' }).exists()).toBe(false)
    await wrapper.setProps({ visible: false })
    expect(video.element.hasAttribute('src')).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unsaved')
  })

  it('offers retry when native remote playback fails', async () => {
    const wrapper = mount(CourseResourcePreviewModal, { props: { visible: true, resource: remoteVideo() }, global })
    await flushPromises()
    await wrapper.get('video').trigger('error')
    expect(wrapper.text()).toContain('Failed to play the Course video')
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.get('video').attributes('src')).toBe('https://example.com/lesson.mp4')
  })
})
