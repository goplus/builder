import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { File, fromBlob } from '@/models/common/file'
import { Video } from '@/models/tutorial/video'
import { cloudHelpers } from '@/models/common/cloud'
import CourseResourceCard from './CourseResourceCard.vue'
import CourseResourcePreviewModal from './CourseResourcePreviewModal.vue'

enableAutoUnmount(afterEach)

const global = {
  mocks: { $t: (message: { en: string }) => message.en },
  directives: { radar: () => {} },
  stubs: {
    UIModal: { props: ['visible'], template: '<div v-if="visible"><slot /></div>' },
    UIModalClose: true,
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
  cloudHelpers.setConfig({ baseUrl: 'https://example.com', bucket: 'bucket' })
})

afterEach(() => vi.restoreAllMocks())

function remoteVideo() {
  return new Video(
    'lesson',
    new File('lesson.mp4', () => new Promise(() => {}), {
      meta: { universalUrl: 'https://example.com/lesson.mp4' }
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
    await wrapper.setProps({ visible: false })
    expect(wrapper.find('video').exists()).toBe(false)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:unsaved')
  })

  it('uses native controls for the remote resource preview', async () => {
    const wrapper = mount(CourseResourcePreviewModal, { props: { visible: true, resource: remoteVideo() }, global })
    await flushPromises()
    expect(wrapper.get('video').attributes()).toMatchObject({
      src: 'https://example.com/lesson.mp4',
      crossorigin: 'anonymous',
      controls: '',
      autoplay: ''
    })
  })
})
