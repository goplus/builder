import { shallowMount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { mockFile } from '@/models/common/test'
import AnimationVideoPreview from './AnimationVideoPreview.vue'

vi.mock('@/utils/file', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/file')>()),
  useFileUrl: () => [ref('blob:animation')]
}))

async function setup() {
  const wrapper = shallowMount(AnimationVideoPreview, {
    props: { video: mockFile('animation.mp4'), framesConfig: null },
    global: { plugins: [createI18n({ lang: 'en' })], directives: { radar: () => {} } }
  })
  onTestFinished(() => wrapper.unmount())
  await nextTick()
  const video = wrapper.get('video')
  Object.defineProperty(video.element, 'duration', { configurable: true, value: 5 })
  await video.trigger('loadedmetadata')
  vi.spyOn(wrapper.get('.track-inner').element, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 0, 500, 20))
  for (const marker of wrapper.findAll('.segment-marker')) marker.element.setPointerCapture = vi.fn()
  wrapper.get('.segment').element.setPointerCapture = vi.fn()

  async function move(clientX: number, type = 'pointermove') {
    window.dispatchEvent(new PointerEvent(type, { pointerId: 1, clientX }))
    await nextTick()
  }
  async function start(side: 'left' | 'right', clientX: number) {
    await wrapper.get(`.segment-marker.${side}`).trigger('pointerdown', { pointerId: 1, clientX })
  }
  // Start each test with a 1–4s cut range in the 5s video.
  await start('left', 100)
  await move(200)
  await move(200, 'pointerup')
  await start('right', 600)
  await move(500)
  await move(500, 'pointerup')
  return { wrapper, start, move }
}

describe('Animation trim dragging', () => {
  it.each(['left', 'right'] as const)('preserves the grab position at the center of the %s handle', async (side) => {
    const { wrapper, start, move } = await setup()
    const segment = wrapper.get<HTMLDivElement>('.segment')
    const initialStyle = segment.attributes('style')
    const clientX = side === 'left' ? 194 : 506
    await start(side, clientX)
    await move(clientX)
    expect(segment.attributes('style')).toBe(initialStyle)

    const movedX = clientX + (side === 'left' ? 20 : -20)
    await move(movedX)
    expect(parseFloat(segment.element.style[side])).toBeCloseTo(24)
    expect(parseFloat(segment.element.style[side === 'left' ? 'right' : 'left'])).toBeCloseTo(20)
    await move(movedX, 'pointerup')
    expect(wrapper.emitted('update:framesConfig')!.at(-1)).toEqual([
      { startTime: side === 'left' ? 1200 : 1000, duration: 2800, interval: 100 }
    ])
  })

  it('keeps preview seeking anchored to the pointer without changing the cut range', async () => {
    const { wrapper, move } = await setup()
    const initialStyle = wrapper.get('.segment').attributes('style')
    const updates = wrapper.emitted('update:framesConfig')!.length
    await wrapper.get('.segment').trigger('pointerdown', { pointerId: 1, clientX: 350 })
    expect(wrapper.get('video').element.currentTime).toBe(2.5)
    await move(400)
    expect(wrapper.get('video').element.currentTime).toBe(3)
    await move(400, 'pointerup')
    expect(wrapper.get('.segment').attributes('style')).toBe(initialStyle)
    expect(wrapper.emitted('update:framesConfig')).toHaveLength(updates)
  })
})
