import { shallowMount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { mockFile } from '@/models/common/test'
import type { FramesConfig } from '@/models/spx/gen/animation-gen'
import AnimationVideoPreview from './AnimationVideoPreview.vue'

vi.mock('@/utils/file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/file')>()),
  useFileUrl: () => [ref('blob:animation')]
}))

function setup(initialConfig: FramesConfig | null) {
  const framesConfig = shallowRef(initialConfig)
  const visible = ref(true)
  const video = mockFile('animation.mp4')
  const host = shallowMount(
    defineComponent(
      () => () =>
        visible.value
          ? h(AnimationVideoPreview, {
              video,
              framesConfig: framesConfig.value,
              'onUpdate:framesConfig': (config) => (framesConfig.value = config)
            })
          : null
    ),
    {
      global: {
        plugins: [createI18n({ lang: 'zh' })],
        stubs: { AnimationVideoPreview: false },
        directives: { radar: () => {} }
      }
    }
  )
  onTestFinished(() => host.unmount())

  async function loadVideo(duration = 5) {
    await nextTick()
    const wrapper = host.getComponent(AnimationVideoPreview)
    const element = wrapper.get('video').element
    Object.defineProperty(element, 'duration', { configurable: true, value: duration })
    await wrapper.get('video').trigger('loadedmetadata')
    vi.spyOn(wrapper.get('.track-inner').element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 20))
    return wrapper
  }

  async function dragMarker(side: 'left' | 'right', clientX: number) {
    const marker = host.get(`.segment-marker.${side}`)
    await marker.trigger('pointerdown', { pointerId: 1, clientX })
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX }))
    await nextTick()
  }

  return { host, framesConfig, visible, loadVideo, dragMarker }
}

describe('AnimationVideoPreview', () => {
  it('preserves the saved cut range and frame interval when metadata loads and when reopened', async () => {
    const initialConfig = { startTime: 1000, duration: 800, interval: 200 }
    const { framesConfig, visible, loadVideo, dragMarker } = setup(initialConfig)
    const wrapper = await loadVideo()
    expect(framesConfig.value).toBe(initialConfig)
    expect(wrapper.emitted('update:framesConfig')).toBeUndefined()
    expect(wrapper.get('.segment').attributes('style')).toBe('left: 20%; right: 64%;')

    await dragMarker('right', 225)
    expect(framesConfig.value).toEqual({ startTime: 1000, duration: 1300, interval: 200 })
    visible.value = false
    await nextTick()
    visible.value = true
    const reopened = await loadVideo()
    expect(reopened.emitted('update:framesConfig')).toBeUndefined()
    expect(reopened.get('.segment').attributes('style')).toBe('left: 20%; right: 54%;')
    expect(framesConfig.value).toEqual({ startTime: 1000, duration: 1300, interval: 200 })
  })

  it('keeps short saved segments within bounds and preserves fractional frame intervals', async () => {
    const { framesConfig, loadVideo, dragMarker } = setup({ duration: 50, interval: 1000 / 60 })
    await loadVideo()
    await dragMarker('left', 500)
    expect(framesConfig.value).toEqual({ startTime: 0, duration: 50, interval: 1000 / 60 })
    await dragMarker('right', 0)
    expect(framesConfig.value).toEqual({ startTime: 0, duration: 50, interval: 1000 / 60 })
  })

  it('initializes a newly generated video with the full range and the default frame interval', async () => {
    const { framesConfig, loadVideo } = setup(null)
    const wrapper = await loadVideo(5.17)
    expect(framesConfig.value).toEqual({ startTime: 0, duration: 5170, interval: 100 })
    expect(wrapper.get('.segment').attributes('style')).toBe('left: 0%; right: 0%;')
  })

  it('keeps a video shorter than the snapping interval selectable', async () => {
    const { framesConfig, loadVideo, dragMarker } = setup(null)
    await loadVideo(0.05)
    expect(framesConfig.value).toEqual({ startTime: 0, duration: 50, interval: 100 })
    await dragMarker('right', 0)
    expect(framesConfig.value).toEqual({ startTime: 0, duration: 50, interval: 100 })
  })
})
