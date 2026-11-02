import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import StageRuler, { type Pos } from './StageRuler.vue'

async function setup() {
  let pointer: Pos | null = null
  const images: HTMLImageElement[] = []
  class TestImage extends Image {
    constructor() {
      super()
      images.push(this)
    }
  }
  vi.stubGlobal('Image', TestImage)
  onTestFinished(() => {
    vi.unstubAllGlobals()
  })

  const Layer = defineComponent({
    props: { config: { type: Object, required: true } },
    setup(_, { expose }) {
      expose({ getNode: () => ({ getRelativePointerPosition: () => pointer }) })
    },
    template: '<div><slot /></div>'
  })
  const Rect = defineComponent({ props: { config: { type: Object, required: true } }, template: '<div />' })
  const Cursor = defineComponent({ props: { config: { type: Object, required: true } }, template: '<div />' })
  const Line = defineComponent({ props: { config: { type: Object, required: true } }, template: '<div />' })
  const wrapper = mount(StageRuler, {
    props: {
      active: true,
      mapPos: { x: -40, y: -20 },
      mapSize: { width: 600, height: 400 },
      viewportSize: { width: 480, height: 360 },
      stageScale: 1,
      snapTargets: [
        { x: 100, y: 100, heading: 0 },
        { x: 300, y: 100, heading: null }
      ]
    },
    global: {
      stubs: {
        'v-layer': Layer,
        'v-rect': Rect,
        'v-image': Cursor,
        'v-line': Line,
        'v-group': true,
        'v-arc': true,
        'v-text': true
      },
      renderStubDefaultSlot: true
    }
  })
  onTestFinished(() => wrapper.unmount())

  // Happy DOM does not load image resources or measure canvas text.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    measureText: (text: string) => ({ width: text.length * 8 })
  } as CanvasRenderingContext2D)
  onTestFinished(() => {
    vi.restoreAllMocks()
  })

  const capture = wrapper.getComponent(Rect)
  async function move(pos: Pos) {
    pointer = pos
    capture.vm.$emit('mousemove')
    await nextTick()
  }
  async function click() {
    capture.vm.$emit('click')
    await nextTick()
  }
  function cursor() {
    return wrapper.findComponent(Cursor)
  }
  function measurement() {
    return wrapper.findAllComponents(Line).find((line) => line.props('config').dash != null)
  }
  async function loadImage() {
    images[0].dispatchEvent(new Event('load'))
    await nextTick()
  }
  return { wrapper, capture, move, click, cursor, measurement, loadImage }
}

describe('Ruler origin preview', () => {
  it('follows the pointer, stays at the reference point inside the origin radius, and releases outside it', async () => {
    const { move, cursor, measurement, loadImage } = await setup()
    await loadImage()
    await move({ x: 180, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 180, y: 100, listening: false })
    await move({ x: 148, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 100, y: 100 })
    await move({ x: 120, y: 130 })
    expect(cursor().props('config')).toMatchObject({ x: 100, y: 100 })
    await move({ x: 149, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 149, y: 100 })
    expect(measurement()).toBeUndefined()
  })

  it('starts at the previewed reference point and preserves the smaller endpoint snap radius', async () => {
    const { wrapper, move, click, cursor, measurement, loadImage } = await setup()
    await loadImage()
    await move({ x: 140, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 100, y: 100 })
    await click()
    expect(cursor().exists()).toBe(false)
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([false])
    await move({ x: 324, y: 100 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    await move({ x: 325, y: 100 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 325, 100])
    await click()
    expect(measurement()!.props('config').points).toEqual([100, 100, 325, 100])
    expect(cursor().props('config')).toMatchObject({ x: 300, y: 100 })

    await move({ x: 200, y: 200 })
    await click()
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([200, 200, 400, 200])
  })

  it('keeps the cursor size in screen pixels while using map-relative positions', async () => {
    const { wrapper, move, cursor, loadImage } = await setup()
    await loadImage()
    await wrapper.setProps({ stageScale: 0.5 })
    await move({ x: 140, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 100, y: 100, width: 64, height: 64 })
    await wrapper.setProps({ stageScale: 2 })
    expect(cursor().props('config')).toMatchObject({ x: 100, y: 100, width: 16, height: 16 })
  })

  it('only replaces the native cursor when the preview is loaded and restores it on leave, disable, and unmount', async () => {
    const { wrapper, capture, move, cursor, loadImage } = await setup()
    await move({ x: 140, y: 100 })
    expect(cursor().exists()).toBe(false)
    expect(wrapper.emitted('cursorPreviewChange')).toBeUndefined()
    await loadImage()
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([true])
    capture.vm.$emit('mouseleave')
    await nextTick()
    expect(cursor().exists()).toBe(false)
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([false])
    await move({ x: 140, y: 100 })
    await wrapper.setProps({ active: false })
    expect(cursor().exists()).toBe(false)
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([false])
    await wrapper.setProps({ active: true })
    expect(cursor().exists()).toBe(false)
    await move({ x: 140, y: 100 })
    wrapper.unmount()
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([false])
  })
})
