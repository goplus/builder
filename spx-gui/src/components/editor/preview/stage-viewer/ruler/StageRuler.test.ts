import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import StageRuler, { type Pos } from './StageRuler.vue'

async function setup(reducedMotion = false) {
  let pointer: Pos | null = null
  let time = 0
  let nextFrameId = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrameId, callback)
    return nextFrameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(performance, 'now').mockImplementation(() => time)
  const motionPreference = Object.assign(new EventTarget(), { matches: reducedMotion })
  vi.spyOn(window, 'matchMedia').mockReturnValue(motionPreference as MediaQueryList)
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
  const Outline = defineComponent({ props: { config: { type: Object, required: true } }, template: '<div />' })
  const Line = defineComponent({ props: { config: { type: Object, required: true } }, template: '<div />' })
  const Circle = defineComponent({ props: { config: { type: Object, required: true } }, template: '<div />' })
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
        'v-path': Outline,
        'v-line': Line,
        'v-circle': Circle,
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
  function queueMove(pos: Pos) {
    pointer = pos
    capture.vm.$emit('mousemove')
  }
  async function move(pos: Pos) {
    queueMove(pos)
    const pointerFrame = frames.get(nextFrameId)!
    frames.delete(nextFrameId)
    pointerFrame(time)
    await nextTick()
  }
  async function click() {
    capture.vm.$emit('mousedown', { evt: new MouseEvent('mousedown', { button: 0, cancelable: true }) })
    capture.vm.$emit('mouseup', { evt: new MouseEvent('mouseup', { button: 0 }) })
    capture.vm.$emit('click', { evt: new MouseEvent('click', { button: 0 }) })
    await nextTick()
  }
  async function press(pos: Pos, button = 0) {
    pointer = pos
    capture.vm.$emit('mousedown', { evt: new MouseEvent('mousedown', { button, cancelable: true }) })
    await nextTick()
  }
  async function release(pos: Pos, button = 0) {
    pointer = pos
    capture.vm.$emit('mouseup', { evt: new MouseEvent('mouseup', { button }) })
    capture.vm.$emit('click', { evt: new MouseEvent('click', { button }) })
    await nextTick()
  }
  function cursor() {
    return wrapper.findComponent(Cursor)
  }
  function outline() {
    return wrapper.findComponent(Outline)
  }
  function measurement() {
    return wrapper.findAllComponents(Line).find((line) => line.props('config').dash != null)
  }
  function markers() {
    return wrapper.findAllComponents(Circle).filter((circle) => circle.props('config').strokeWidth === 1.5)
  }
  function marker() {
    return markers().at(-1)!
  }
  async function loadImage() {
    images[0].dispatchEvent(new Event('load'))
    await nextTick()
  }
  async function advance(ms: number) {
    time += ms
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback(time))
    await nextTick()
  }
  return {
    wrapper,
    capture,
    queueMove,
    move,
    click,
    press,
    release,
    cursor,
    outline,
    measurement,
    markers,
    marker,
    loadImage,
    advance,
    frames,
    motionPreference
  }
}

describe('Ruler cursor preview', () => {
  it('coalesces pointer moves and snaps the marker without displacing the cursor', async () => {
    const { move, queueMove, click, cursor, marker, measurement, loadImage, advance, frames } = await setup()
    await loadImage()
    await move({ x: 100, y: 100 })
    await click()
    queueMove({ x: 180, y: 160 })
    queueMove({ x: 250, y: 160 })
    queueMove({ x: 320, y: 100 })
    expect(frames.size).toBe(1)
    expect(measurement()).toBeUndefined()
    await advance(16)
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(cursor().props('config')).toMatchObject({ x: 320, y: 100 })
    expect(marker().props('config')).toMatchObject({ x: 300, y: 100 })
    expect(frames.size).toBe(0)
  })

  it('flushes the latest pointer on drag release and cancels the pending frame', async () => {
    const { press, queueMove, release, move, outline, measurement, advance, loadImage, frames } = await setup()
    await loadImage()
    await press({ x: 120, y: 100 })
    queueMove({ x: 200, y: 160 })
    await release({ x: 320, y: 100 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(outline().exists()).toBe(false)
    expect(frames.size).toBe(0)
    await advance(16)
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
  })

  it('confirms the latest queued click position even before the cursor image loads', async () => {
    const { move, queueMove, click, cursor, measurement, frames } = await setup()
    await move({ x: 100, y: 100 })
    await click()
    queueMove({ x: 320, y: 100 })
    await click()
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(cursor().exists()).toBe(false)
    expect(frames.size).toBe(0)
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
  })

  it('cancels queued pointer work on leave, disable, and unmount', async () => {
    const { wrapper, capture, queueMove, cursor, loadImage, advance, frames } = await setup()
    await loadImage()
    queueMove({ x: 200, y: 160 })
    capture.vm.$emit('mouseleave')
    expect(frames.size).toBe(0)
    await advance(16)
    expect(cursor().exists()).toBe(false)
    queueMove({ x: 200, y: 160 })
    await wrapper.setProps({ active: false })
    expect(frames.size).toBe(0)
    await wrapper.setProps({ active: true })
    queueMove({ x: 200, y: 160 })
    wrapper.unmount()
    expect(frames.size).toBe(0)
  })

  it('measures from the pressed origin, snaps the endpoint, and keeps the result after releasing a drag', async () => {
    const { move, press, release, click, cursor, marker, outline, measurement, loadImage } = await setup()
    await loadImage()
    await press({ x: 120, y: 100 })
    await move({ x: 200, y: 160 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 200, 160])
    expect(outline().props('config')).toMatchObject({ x: 200, y: 160 })
    await move({ x: 320, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 320, y: 100 })
    expect(marker().props('config')).toMatchObject({ x: 300, y: 100 })
    await release({ x: 320, y: 100 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(outline().exists()).toBe(false)
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(outline().exists()).toBe(false)

    // A subsequent measurement can still use the original two-click interaction.
    await click()
    await move({ x: 500, y: 200 })
    await click()
    expect(measurement()!.props('config').points).toEqual([400, 200, 500, 200])
    await move({ x: 450, y: 250 })
    expect(measurement()!.props('config').points).toEqual([400, 200, 500, 200])
  })

  it('treats small pointer jitter as a click at any stage scale', async () => {
    const { wrapper, press, move, release, outline, measurement, loadImage } = await setup()
    await loadImage()
    await wrapper.setProps({ stageScale: 0.5 })
    await press({ x: 180, y: 160 })
    await move({ x: 186, y: 160 })
    expect(measurement()).toBeUndefined()
    await release({ x: 186, y: 160 })
    expect(outline().exists()).toBe(true)
    await move({ x: 250, y: 160 })
    expect(measurement()!.props('config').points).toEqual([186, 160, 250, 160])
  })

  it('can drag from an arbitrary point and uses the release position even without a final move event', async () => {
    const { press, release, move, outline, measurement, loadImage } = await setup()
    await loadImage()
    await press({ x: 180, y: 160 })
    await release({ x: 420, y: 220 })
    expect(measurement()!.props('config').points).toEqual([180, 160, 420, 220])
    expect(outline().exists()).toBe(false)
    await move({ x: 500, y: 250 })
    expect(measurement()!.props('config').points).toEqual([180, 160, 420, 220])
  })

  it('ignores right and middle buttons', async () => {
    const { press, release, move, measurement } = await setup()
    for (const button of [1, 2]) {
      await press({ x: 120, y: 100 }, button)
      await move({ x: 320, y: 100 })
      await release({ x: 320, y: 100 }, button)
      expect(measurement()).toBeUndefined()
    }
  })

  it('fixes the last valid result when the mouse is released outside the map', async () => {
    const { capture, press, move, click, outline, measurement, loadImage } = await setup()
    await loadImage()
    await press({ x: 120, y: 100 })
    await move({ x: 320, y: 100 })
    capture.vm.$emit('mouseleave')
    window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }))
    await nextTick()
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(outline().exists()).toBe(false)
    await click()
    await move({ x: 500, y: 200 })
    expect(measurement()!.props('config').points).toEqual([400, 200, 500, 200])
  })

  it('ends a drag on window blur and clears pending presses when disabled', async () => {
    const { wrapper, press, move, outline, measurement, loadImage } = await setup()
    await loadImage()
    await press({ x: 120, y: 100 })
    await move({ x: 320, y: 100 })
    window.dispatchEvent(new Event('blur'))
    await nextTick()
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(outline().exists()).toBe(false)
    await press({ x: 120, y: 100 })
    await wrapper.setProps({ active: false })
    await wrapper.setProps({ active: true })
    await move({ x: 320, y: 100 })
    expect(measurement()).toBeUndefined()
  })

  it('keeps the ruler at the pointer while the origin marker snaps and releases', async () => {
    const { move, cursor, marker, outline, measurement, loadImage, advance } = await setup()
    await loadImage()
    await move({ x: 180, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 180, y: 100, listening: false })
    expect(marker().props('config')).toMatchObject({ x: 180, y: 100, listening: false })
    expect(outline().exists()).toBe(false)
    await move({ x: 124, y: 100 })
    expect(outline().props('config')).toMatchObject({ x: 124, y: 100, listening: false })
    await advance(140)
    expect(cursor().props('config')).toMatchObject({ x: 124, y: 100 })
    expect(marker().props('config')).toMatchObject({ x: 100, y: 100 })
    expect(outline().props('config')).toMatchObject({ x: 124, y: 100 })
    await move({ x: 110, y: 110 })
    expect(cursor().props('config')).toMatchObject({ x: 110, y: 110 })
    expect(marker().props('config')).toMatchObject({ x: 100, y: 100 })
    await move({ x: 125, y: 100 })
    expect(outline().exists()).toBe(false)
    await advance(80)
    expect(cursor().props('config')).toMatchObject({ x: 125, y: 100 })
    expect(marker().props('config')).toMatchObject({ x: 125, y: 100 })
    expect(measurement()).toBeUndefined()
  })

  it('uses the exact reference point when clicked during the animation and preserves endpoint snapping', async () => {
    const { wrapper, move, click, cursor, marker, outline, measurement, loadImage, advance, frames } = await setup()
    await loadImage()
    await move({ x: 120, y: 100 })
    await advance(70)
    expect(marker().props('config').x).toBeGreaterThan(100)
    expect(marker().props('config').x).toBeLessThan(120)
    expect(cursor().props('config')).toMatchObject({ x: 120, y: 100 })
    await click()
    expect(marker().props('config')).toMatchObject({ x: 100, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 120, y: 100 })
    expect(outline().props('config')).toMatchObject({ x: 120, y: 100 })
    expect(frames.size).toBe(0)
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([true])
    await move({ x: 324, y: 100 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(marker().props('config')).toMatchObject({ x: 300, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 324, y: 100 })
    expect(outline().props('config')).toMatchObject({ x: 324, y: 100 })
    await move({ x: 325, y: 100 })
    expect(measurement()!.props('config').points).toEqual([100, 100, 325, 100])
    expect(outline().props('config')).toMatchObject({ x: 325, y: 100 })
    await click()
    expect(measurement()!.props('config').points).toEqual([100, 100, 325, 100])
    expect(cursor().props('config')).toMatchObject({ x: 325, y: 100 })
    expect(outline().exists()).toBe(false)

    await move({ x: 200, y: 200 })
    await click()
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([200, 200, 400, 200])
  })

  it('keeps the outline throughout a measurement and hides it between measurements, even over a target', async () => {
    const { move, click, cursor, outline, measurement, loadImage, advance } = await setup()
    await loadImage()
    await move({ x: 120, y: 100 })
    await advance(140)
    expect(outline().exists()).toBe(true)
    await click()
    expect(outline().exists()).toBe(true)
    await move({ x: 200, y: 160 })
    expect(outline().props('config')).toMatchObject({ x: 200, y: 160 })
    await move({ x: 320, y: 100 })
    expect(outline().props('config')).toMatchObject({ x: 320, y: 100 })
    await click()
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(cursor().exists()).toBe(true)
    expect(outline().exists()).toBe(false)
    await move({ x: 310, y: 110 })
    expect(outline().exists()).toBe(false)
    await move({ x: 200, y: 160 })
    await move({ x: 120, y: 100 })
    await advance(140)
    expect(outline().exists()).toBe(false)
    await click()
    expect(measurement()).toBeUndefined()
    expect(outline().props('config')).toMatchObject({ x: 120, y: 100 })
  })

  it('keeps the cursor and endpoint markers the same screen size at different stage scales', async () => {
    const { wrapper, move, cursor, marker, outline, loadImage, advance } = await setup()
    await loadImage()
    await wrapper.setProps({ stageScale: 0.5 })
    await move({ x: 120, y: 100 })
    await advance(140)
    expect(cursor().props('config')).toMatchObject({ x: 120, y: 100, width: 64, height: 64 })
    expect(marker().props('config')).toMatchObject({ x: 100, y: 100, radius: 12, strokeScaleEnabled: false })
    expect(outline().props('config').scaleX * 24).toBe(64)
    expect(outline().props('config').strokeScaleEnabled).toBe(false)
    await wrapper.setProps({ stageScale: 2 })
    expect(cursor().props('config')).toMatchObject({ x: 120, y: 100, width: 16, height: 16 })
    expect(marker().props('config')).toMatchObject({ x: 100, y: 100, radius: 3, strokeScaleEnabled: false })
    expect(outline().props('config').scaleX * 24).toBe(16)
  })

  it('only replaces the native cursor when the preview is loaded and restores it on leave, disable, and unmount', async () => {
    const { wrapper, capture, move, cursor, loadImage, frames } = await setup()
    await move({ x: 120, y: 100 })
    expect(cursor().exists()).toBe(false)
    expect(wrapper.emitted('cursorPreviewChange')).toBeUndefined()
    await loadImage()
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([true])
    capture.vm.$emit('mouseleave')
    await nextTick()
    expect(cursor().exists()).toBe(false)
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([false])
    expect(frames.size).toBe(0)
    await move({ x: 120, y: 100 })
    await wrapper.setProps({ active: false })
    expect(cursor().exists()).toBe(false)
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([false])
    expect(frames.size).toBe(0)
    await wrapper.setProps({ active: true })
    expect(cursor().exists()).toBe(false)
    await move({ x: 120, y: 100 })
    wrapper.unmount()
    expect(wrapper.emitted('cursorPreviewChange')!.at(-1)).toEqual([false])
    expect(frames.size).toBe(0)
  })

  it('eases the marker into a target without restarting on every pointer move and releases continuously', async () => {
    const { move, cursor, marker, loadImage, advance, frames } = await setup()
    await loadImage()
    await move({ x: 130, y: 100 })
    await move({ x: 124, y: 100 })
    expect(marker().props('config').x).toBe(130)
    expect(cursor().props('config').x).toBe(124)
    await advance(70)
    const halfway = marker().props('config').x
    expect(halfway).toBeGreaterThan(100)
    expect(halfway).toBeLessThan(115)
    await move({ x: 110, y: 110 })
    await advance(70)
    expect(marker().props('config')).toMatchObject({ x: 100, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 110, y: 110 })
    expect(frames.size).toBe(0)

    await move({ x: 140, y: 100 })
    expect(marker().props('config').x).toBe(100)
    expect(cursor().props('config').x).toBe(140)
    await advance(40)
    const releasing = marker().props('config').x
    expect(releasing).toBeGreaterThan(120)
    expect(releasing).toBeLessThan(140)
    await move({ x: 160, y: 100 })
    await advance(40)
    expect(marker().props('config').x).toBe(160)
    expect(cursor().props('config').x).toBe(160)
    await move({ x: 190, y: 100 })
    expect(cursor().props('config').x).toBe(190)
    expect(frames.size).toBe(0)
  })

  it('interrupts a snap immediately when reduced motion is requested', async () => {
    const { move, cursor, marker, loadImage, advance, frames, motionPreference } = await setup()
    await loadImage()
    await move({ x: 124, y: 100 })
    await advance(35)
    expect(marker().props('config').x).toBeGreaterThan(100)
    motionPreference.matches = true
    motionPreference.dispatchEvent(new Event('change'))
    await nextTick()
    expect(marker().props('config')).toMatchObject({ x: 100, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 124, y: 100 })
    expect(frames.size).toBe(0)
    await move({ x: 125, y: 100 })
    expect(cursor().props('config')).toMatchObject({ x: 125, y: 100 })
    expect(marker().props('config')).toMatchObject({ x: 125, y: 100 })
    expect(frames.size).toBe(0)
  })

  it('keeps both confirmed endpoint markers on the measurement when the pointer leaves', async () => {
    const { capture, move, click, markers, measurement, loadImage, advance } = await setup()
    await loadImage()
    await move({ x: 120, y: 100 })
    await advance(140)
    expect(markers()).toHaveLength(1)
    await click()
    expect(markers()).toHaveLength(1)
    await move({ x: 320, y: 100 })
    expect(markers().map((marker) => marker.props('config'))).toMatchObject([
      { x: 100, y: 100 },
      { x: 300, y: 100 }
    ])
    await click()
    capture.vm.$emit('mouseleave')
    await nextTick()
    expect(measurement()!.props('config').points).toEqual([100, 100, 300, 100])
    expect(markers().map((marker) => marker.props('config'))).toMatchObject([
      { x: 100, y: 100 },
      { x: 300, y: 100 }
    ])
  })

  it('places unsnapped markers exactly at the pointer and clears fixed markers for a new measurement', async () => {
    const { wrapper, move, click, markers, marker, cursor, measurement, loadImage } = await setup()
    await loadImage()
    await move({ x: 180, y: 160 })
    expect(marker().props('config')).toMatchObject({ x: 180, y: 160 })
    expect(cursor().props('config')).toMatchObject({ x: 180, y: 160 })
    await click()
    await move({ x: 250, y: 160 })
    expect(markers().map((marker) => marker.props('config'))).toMatchObject([
      { x: 180, y: 160 },
      { x: 250, y: 160 }
    ])
    await click()
    await move({ x: 400, y: 200 })
    expect(measurement()!.props('config').points).toEqual([180, 160, 250, 160])
    await click()
    expect(measurement()).toBeUndefined()
    expect(markers()).toHaveLength(1)
    expect(marker().props('config')).toMatchObject({ x: 400, y: 200 })
    await wrapper.setProps({ active: false })
    expect(markers()).toHaveLength(0)
  })
})
