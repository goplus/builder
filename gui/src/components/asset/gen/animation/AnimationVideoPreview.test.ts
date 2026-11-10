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

vi.mock('@/components/ui/message/UIMessageProvider.vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui/message/UIMessageProvider.vue')>()),
  useMessage: () => ({ error: vi.fn(), success: vi.fn() })
}))

function setup(initialConfig: FramesConfig | null) {
  const framesConfig = shallowRef(initialConfig)
  const visible = ref(true)
  const showControls = ref(true)
  const video = mockFile('animation.mp4')
  const host = shallowMount(
    defineComponent(
      () => () =>
        visible.value
          ? h(AnimationVideoPreview, {
              video,
              framesConfig: framesConfig.value,
              showControls: showControls.value,
              'onUpdate:framesConfig': (config) => (framesConfig.value = config)
            })
          : null
    ),
    {
      global: {
        plugins: [createI18n({ lang: 'zh' })],
        stubs: {
          AnimationVideoPreview: false,
          ResourceCanvas: false,
          Teleport: false,
          UITooltip: { template: '<div><slot /><slot name="trigger" /></div>' }
        },
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
    for (const control of wrapper.findAll<HTMLButtonElement>('.segment-marker, .seek-surface'))
      control.element.setPointerCapture = vi.fn()
    vi.spyOn(wrapper.get('.track-inner').element, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 20))
    return wrapper
  }

  async function dragMarker(side: 'left' | 'right', clientX: number) {
    const marker = host.get(`.segment-marker.${side}`)
    const config = framesConfig.value!
    const time = (config.startTime ?? 0) + (side === 'right' ? config.duration : 0)
    const duration = host.get('video').element.duration * 1000
    await marker.trigger('pointerdown', { pointerId: 1, clientX: (time / duration) * 500 })
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX }))
    await nextTick()
  }

  return { host, framesConfig, visible, showControls, loadVideo, dragMarker }
}

describe('AnimationVideoPreview', () => {
  it('stops the trim hint on hover without changing the selection or restarting when controls reappear', async () => {
    const config = { startTime: 1000, duration: 2000, interval: 100 }
    const { framesConfig, showControls, loadVideo } = setup(config)
    const wrapper = await loadVideo()
    expect(wrapper.get('.track-inner').classes()).toContain('nudge')
    expect(wrapper.text()).toContain('拖动两端裁剪')

    await wrapper.get('.track-inner').trigger('mouseenter')
    expect(wrapper.get('.track-inner').classes()).not.toContain('nudge')
    expect(wrapper.text()).not.toContain('拖动两端裁剪')
    showControls.value = false
    await nextTick()
    showControls.value = true
    await nextTick()
    expect(wrapper.get('.track-inner').classes()).not.toContain('nudge')
    expect(framesConfig.value).toBe(config)
    expect(wrapper.emitted('update:framesConfig')).toBeUndefined()
  })

  it('stops the trim hint when a keyboard user focuses a handle', async () => {
    const config = { startTime: 1000, duration: 2000, interval: 100 }
    const { framesConfig, loadVideo } = setup(config)
    const wrapper = await loadVideo()
    await wrapper.get('.segment-marker.left').trigger('focusin')
    expect(wrapper.get('.track-inner').classes()).not.toContain('nudge')
    expect(framesConfig.value).toBe(config)
  })

  it('hides trimming and playback controls without resetting the video or selection', async () => {
    const config = { startTime: 1000, duration: 2000, interval: 100 }
    const { framesConfig, showControls, loadVideo } = setup(config)
    const wrapper = await loadVideo()
    const video = wrapper.get('video').element
    video.currentTime = 1.5
    showControls.value = false
    await nextTick()
    expect(wrapper.find('.timeline').exists()).toBe(false)
    expect(wrapper.find('.timecode').exists()).toBe(false)
    expect(wrapper.get('video').element).toBe(video)
    showControls.value = true
    await nextTick()
    expect(wrapper.find('.timeline').exists()).toBe(true)
    expect(wrapper.find('.timecode').exists()).toBe(true)
    expect(video.currentTime).toBe(1.5)
    expect(framesConfig.value).toBe(config)
    expect(wrapper.emitted('update:framesConfig')).toBeUndefined()
  })

  it('preserves the saved cut range and frame interval when metadata loads and when reopened', async () => {
    const initialConfig = { startTime: 1000, duration: 800, interval: 200 }
    const { framesConfig, visible, loadVideo, dragMarker } = setup(initialConfig)
    const wrapper = await loadVideo()
    expect(framesConfig.value).toBe(initialConfig)
    expect(wrapper.emitted('update:framesConfig')).toBeUndefined()
    expect(wrapper.get('.segment').attributes('style')).toBe('left: 20%; right: 64%;')

    await dragMarker('right', 225)
    expect(wrapper.get('.track-inner').classes()).not.toContain('nudge')
    expect(framesConfig.value).toEqual({ startTime: 1000, duration: 1300, interval: 200 })
    expect(wrapper.get('.selection-duration').text()).toBe('已选 1.30 秒')
    visible.value = false
    await nextTick()
    visible.value = true
    const reopened = await loadVideo()
    expect(reopened.emitted('update:framesConfig')).toBeUndefined()
    expect(reopened.get('.segment').attributes('style')).toBe('left: 20%; right: 54%;')
    expect(framesConfig.value).toEqual({ startTime: 1000, duration: 1300, interval: 200 })
  })

  it('restores the markers when undo changes the extraction range on the same video', async () => {
    const { framesConfig, loadVideo } = setup({ startTime: 1000, duration: 2000, interval: 100 })
    const wrapper = await loadVideo()
    framesConfig.value = { startTime: 0, duration: 5000, interval: 100 }
    await nextTick()
    expect(wrapper.get('.segment').attributes('style')).toContain('left: 0%')
    expect(wrapper.get('.segment').attributes('style')).toContain('right: 0%')
    framesConfig.value = { startTime: 1000, duration: 2000, interval: 100 }
    await nextTick()
    expect(wrapper.get('.segment').attributes('style')).toContain('left: 20%')
    expect(wrapper.get('.segment').attributes('style')).toContain('right: 40%')
    await wrapper.get('.track-inner').trigger('mouseenter')
    expect(wrapper.get('.selection-duration').text()).toBe('已选 2.00 秒')
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

  it.each([5.125, 5.175, 5.2])(
    'keeps the right handle at the exact end of a %s-second video after release',
    async (duration) => {
      const { framesConfig, loadVideo, dragMarker } = setup({ startTime: 1000, duration: 2000, interval: 125 })
      const wrapper = await loadVideo(duration)
      const marker = wrapper.get('.segment-marker.right')
      await marker.trigger('pointerdown', { pointerId: 1, clientX: (3 / duration) * 500 })
      window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 500 }))
      await nextTick()
      expect(marker.attributes('aria-valuenow')).toBe(String(duration))

      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 500 }))
      await nextTick()
      expect(marker.attributes('aria-valuenow')).toBe(String(duration))
      expect(wrapper.get('.segment').attributes('style')).toContain('right: 0%')
      expect(framesConfig.value).toEqual({ startTime: 1000, duration: duration * 1000 - 1000, interval: 125 })

      await dragMarker('right', 520)
      expect(marker.attributes('aria-valuenow')).toBe(String(duration))
    }
  )

  it.each([5.125, 5.175])('allows keyboard selection of the exact end of a %s-second video', async (duration) => {
    const { framesConfig, loadVideo } = setup({ startTime: 1000, duration: 2000, interval: 200 })
    const wrapper = await loadVideo(duration)
    const marker = wrapper.get('.segment-marker.right')
    await marker.trigger('keydown', { key: 'End' })
    expect(framesConfig.value).toEqual({ startTime: 1000, duration: duration * 1000 - 1000, interval: 200 })
    expect(wrapper.get('.segment').attributes('style')).toContain('right: 0%')
    await marker.trigger('keydown', { key: 'ArrowRight' })
    expect(marker.attributes('aria-valuenow')).toBe(String(duration))
  })

  it('reveals the video only after its first frame has loaded', async () => {
    const { loadVideo } = setup(null)
    const wrapper = await loadVideo()
    expect(wrapper.emitted('ready')).toBeUndefined()
    expect(wrapper.get('video').classes()).not.toContain('ready')
    await wrapper.get('video').trigger('loadeddata')
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(wrapper.get('video').classes()).toContain('ready')
  })

  it('seeks inside the selection without changing the extraction range', async () => {
    const config = { startTime: 1000, duration: 2000, interval: 200 }
    const { framesConfig, loadVideo } = setup(config)
    const wrapper = await loadVideo()
    const track = wrapper.get('.seek-surface')
    await track.trigger('pointerdown', { pointerId: 1, clientX: 250 })
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 250 }))
    await nextTick()
    expect(wrapper.get('video').element.currentTime).toBe(2.5)
    await track.trigger('keydown', { key: 'Home' })
    expect(wrapper.get('video').element.currentTime).toBe(1)
    await track.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('video').element.currentTime).toBe(1.1)
    expect(framesConfig.value).toBe(config)
    expect(wrapper.emitted('update:framesConfig')).toBeUndefined()
  })

  it('adjusts boundaries by keyboard while preserving the frame interval', async () => {
    const { framesConfig, loadVideo } = setup({ startTime: 1000, duration: 2000, interval: 200 })
    const wrapper = await loadVideo()
    await wrapper.get('.segment-marker.left').trigger('keydown', { key: 'ArrowRight' })
    expect(framesConfig.value).toEqual({ startTime: 1100, duration: 1900, interval: 200 })
    await wrapper.get('.segment-marker.right').trigger('keydown', { key: 'ArrowLeft', shiftKey: true })
    expect(framesConfig.value).toEqual({ startTime: 1100, duration: 900, interval: 200 })
  })

  it('keeps a video shorter than the snapping interval selectable', async () => {
    const { framesConfig, loadVideo, dragMarker } = setup(null)
    await loadVideo(0.05)
    expect(framesConfig.value).toEqual({ startTime: 0, duration: 50, interval: 100 })
    await dragMarker('right', 0)
    expect(framesConfig.value).toEqual({ startTime: 0, duration: 50, interval: 100 })
  })
})
