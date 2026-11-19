import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import StageRuler, { type Pos } from './StageRuler.vue'

async function setup(scale = 1, reduce = true, simpleMode = false) {
  let pointer: Pos | null = null
  let time = 0
  let frameId = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(performance, 'now').mockImplementation(() => time)
  const motionPreference = Object.assign(new EventTarget(), { matches: reduce })
  vi.spyOn(window, 'matchMedia').mockReturnValue(motionPreference as MediaQueryList)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    save() {},
    restore() {},
    measureText: (text: string) => ({ width: text.length * 8 })
  } as CanvasRenderingContext2D)
  const Layer = defineComponent({
    props: { config: { type: Object, required: true } },
    setup(_, { expose }) {
      expose({ getNode: () => ({ getRelativePointerPosition: () => pointer }) })
    },
    template: '<div><slot /></div>'
  })
  const shape = () => defineComponent({ props: { config: { type: Object, required: true } }, template: '<div />' })
  const Rect = shape()
  const Line = shape()
  const Arc = shape()
  const Text = shape()
  const Circle = shape()
  const Group = defineComponent({
    props: { config: { type: Object, required: true } },
    template: '<div><slot /></div>'
  })
  const wrapper = mount(StageRuler, {
    props: {
      active: true,
      mapPos: { x: -40, y: -20 },
      mapSize: { width: 600, height: 400 },
      viewportSize: { width: 480, height: 360 },
      stageScale: scale,
      simpleMode,
      snapTargets: [
        { spriteId: 'lita', x: 100, y: 100, heading: 0 },
        { spriteId: 'pinecone', x: 300, y: 100, heading: null }
      ]
    },
    global: {
      stubs: {
        'v-layer': Layer,
        'v-rect': Rect,
        'v-line': Line,
        'v-arc': Arc,
        'v-text': Text,
        'v-circle': Circle,
        'v-group': Group
      }
    }
  })
  onTestFinished(() => {
    wrapper.unmount()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  const capture = wrapper.getComponent(Rect)
  function point(pos: Pos) {
    pointer = {
      x: (pos.x * wrapper.props('stageScale')) / (wrapper.props('simpleMode') ? 1.3 : 1),
      y: (pos.y * wrapper.props('stageScale')) / (wrapper.props('simpleMode') ? 1.3 : 1)
    }
  }
  async function advance(ms = 16) {
    time += ms
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback(time))
    await nextTick()
  }
  function queueMove(pos: Pos) {
    point(pos)
    capture.vm.$emit('mousemove')
  }
  async function move(pos: Pos) {
    queueMove(pos)
    await advance()
  }
  async function press(pos: Pos, button = 0) {
    point(pos)
    capture.vm.$emit('mousedown', { evt: new MouseEvent('mousedown', { button }) })
    await nextTick()
  }
  async function release(pos: Pos, button = 0) {
    point(pos)
    capture.vm.$emit('mouseup', { evt: new MouseEvent('mouseup', { button }) })
    capture.vm.$emit('click', { evt: new MouseEvent('click', { button }) })
    await nextTick()
  }
  async function click() {
    capture.vm.$emit('mousedown', { evt: new MouseEvent('mousedown', { button: 0 }) })
    capture.vm.$emit('mouseup', { evt: new MouseEvent('mouseup', { button: 0 }) })
    capture.vm.$emit('click', { evt: new MouseEvent('click', { button: 0 }) })
    await nextTick()
  }
  const configs = () =>
    [Rect, Line, Arc, Text, Circle].flatMap((type) =>
      wrapper.findAllComponents(type).map((shape) => shape.props('config'))
    )
  const line = () => configs().find((config) => config.dash != null)
  const labels = () => configs().filter((config) => config.text != null)
  const markers = () =>
    wrapper
      .findAllComponents(Group)
      .filter((group) => group.findAllComponents(Circle).length > 0)
      .map((group) => group.props('config'))
  const outlined = () => wrapper.emitted('cursorOutlineChange')?.at(-1)?.[0] ?? false
  const labelLayouts = () =>
    wrapper
      .findAllComponents(Group)
      .filter((group) => group.findAllComponents(Text).length > 0)
      .map((group) => ({ ...group.props('config'), ...group.getComponent(Rect).props('config') }))
  return {
    wrapper,
    layer: wrapper.getComponent(Layer),
    capture,
    move,
    queueMove,
    press,
    release,
    click,
    advance,
    configs,
    line,
    labels,
    markers,
    outlined,
    frames,
    motionPreference,
    labelLayouts
  }
}

describe('Ruler', () => {
  it('reports the exact snapped sprite and clears the highlight on leave and deactivation', async () => {
    const { wrapper, move, capture } = await setup()
    const target = () => wrapper.emitted('snapTargetChange')?.at(-1)?.[0]
    await move({ x: 118, y: 100 })
    expect(target()).toBe('lita')
    await move({ x: 300, y: 115 })
    expect(target()).toBe('pinecone')
    capture.vm.$emit('mouseleave')
    await nextTick()
    expect(target()).toBeNull()
    await move({ x: 100, y: 100 })
    await wrapper.setProps({ active: false })
    expect(target()).toBeNull()
  })

  it.each([0.5, 1, 2])('keeps decorations fixed and measures map units at stage scale %s', async (scale) => {
    const { wrapper, layer, move, click, line, labels, configs, markers } = await setup(scale)
    expect(layer.props('config')).toMatchObject({ x: -40, y: -20, scaleX: 1 / scale, scaleY: 1 / scale })
    await move({ x: 120, y: 100 })
    await click()
    await move({ x: 320, y: 100 })
    await click()
    expect(line()).toMatchObject({
      points: [100 * scale, 100 * scale, 300 * scale, 100 * scale],
      strokeWidth: 1.6,
      dash: [12, 12]
    })
    expect(labels().map((label) => label.text)).toEqual(['90°', '200'])
    for (const label of labels()) expect(label).toMatchObject({ fontSize: 13, height: 22 })
    expect(configs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ innerRadius: 35.2, outerRadius: 36.8 }),
        expect.objectContaining({ radius: 7, strokeWidth: 1.2 })
      ])
    )
    expect(markers()).toMatchObject([
      { x: 100 * scale, y: 100 * scale },
      { x: 300 * scale, y: 100 * scale }
    ])
    await wrapper.setProps({ stageScale: scale * 1.5 })
    expect(line()!.points).toEqual([150 * scale, 150 * scale, 450 * scale, 150 * scale])
    expect(labels().map((label) => label.text)).toEqual(['90°', '200'])
  })
  it.each([0.5, 1, 2])('enlarges Simple Mode decorations by a fixed factor at stage scale %s', async (scale) => {
    const { layer, move, click, line, labels, markers, configs, wrapper } = await setup(scale, true, true)
    await move({ x: 120, y: 100 })
    await click()
    await move({ x: 320, y: 100 })
    await click()
    const screenScale = scale * layer.props('config').scaleX
    expect(screenScale).toBeCloseTo(1.3)
    expect(line()!.points.map((value: number) => value * screenScale)).toEqual([
      100 * scale,
      100 * scale,
      300 * scale,
      100 * scale
    ])
    expect(labels().map((label) => label.text)).toEqual(['90°', '200'])
    expect(labels()[0].fontSize * screenScale).toBeCloseTo(16.9)
    expect(labels()[0].height * screenScale).toBeCloseTo(28.6)
    expect(configs().find((config) => config.radius === 7)!.radius * 2 * screenScale).toBeCloseTo(18.2)
    expect(configs().find((config) => config.outerRadius != null)!.outerRadius * screenScale).toBeCloseTo(47.84)
    expect(line()!.strokeWidth * screenScale).toBeCloseTo(2.08)
    expect(markers()[0]!.x * screenScale).toBeCloseTo(100 * scale)
    await wrapper.setProps({ stageScale: scale * 1.5 })
    expect(scale * 1.5 * layer.props('config').scaleX).toBeCloseTo(1.3)
    expect(labels().map((label) => label.text)).toEqual(['90°', '200'])
  })
  it('animates origin snap and release, honors reduced motion and confirms exact coordinates', async () => {
    const { move, advance, markers, click, line, motionPreference, frames } = await setup(1, false)
    await move({ x: 130, y: 100 })
    await move({ x: 124, y: 100 })
    await advance(70)
    expect(markers()[0]!.x).toBeGreaterThan(100)
    expect(markers()[0]!.x).toBeLessThan(124)
    await advance(70)
    expect(markers()[0]!.x).toBe(100)
    await move({ x: 140, y: 100 })
    await advance(40)
    expect(markers()[0]!.x).toBeGreaterThan(100)
    expect(markers()[0]!.x).toBeLessThan(140)
    motionPreference.matches = true
    motionPreference.dispatchEvent(new Event('change'))
    await nextTick()
    expect(markers()[0]!.x).toBe(140)
    expect(frames.size).toBe(0)
    motionPreference.matches = false
    motionPreference.dispatchEvent(new Event('change'))
    await nextTick()
    await move({ x: 124, y: 100 })
    await advance(35)
    await click()
    expect(markers()[0]!.x).toBe(100)
    await move({ x: 324, y: 100 })
    expect(line()!.points).toEqual([100, 100, 300, 100])
  })
  it('keeps the outline during measurement and retains fixed results after leaving', async () => {
    const { capture, move, click, outlined, line, markers } = await setup()
    await move({ x: 120, y: 100 })
    expect(outlined()).toBe(true)
    await click()
    await move({ x: 220, y: 200 })
    expect(outlined()).toBe(true)
    await move({ x: 320, y: 100 })
    await click()
    expect(outlined()).toBe(false)
    capture.vm.$emit('mouseleave')
    await nextTick()
    expect(line()!.points).toEqual([100, 100, 300, 100])
    expect(markers()).toHaveLength(2)
    await move({ x: 120, y: 100 })
    expect(outlined()).toBe(false)
    await click()
    expect(line()).toBeUndefined()
    expect(outlined()).toBe(true)
  })
  it('coalesces moves and confirms the latest click and drag release position', async () => {
    const { queueMove, click, press, release, line, frames } = await setup()
    queueMove({ x: 120, y: 100 })
    await click()
    queueMove({ x: 200, y: 100 })
    queueMove({ x: 320, y: 100 })
    expect(frames.size).toBe(1)
    await click()
    expect(line()!.points).toEqual([100, 100, 300, 100])
    expect(frames.size).toBe(0)
    await press({ x: 180, y: 160 })
    queueMove({ x: 250, y: 200 })
    await release({ x: 420, y: 220 })
    expect(line()!.points).toEqual([180, 160, 420, 220])
    expect(frames.size).toBe(0)
  })
  it.each([0.5, 2])('distinguishes click jitter from a drag in screen pixels at scale %s', async (scale) => {
    const { press, release, move, line, outlined, click } = await setup(scale)
    await press({ x: 180, y: 160 })
    await release({ x: 180 + 3 / scale, y: 160 })
    expect(outlined()).toBe(true)
    await move({ x: 400, y: 160 })
    expect(line()!.points[0]).toBeCloseTo(180 * scale + 3)
    await click()
    expect(outlined()).toBe(false)
    await press({ x: 180, y: 160 })
    await release({ x: 180 + 5 / scale, y: 160 })
    expect(outlined()).toBe(false)
  })
  it.each(['mouseup', 'blur'])('finishes an outside drag on window %s', async (event) => {
    const { capture, press, move, line, outlined } = await setup()
    await press({ x: 120, y: 100 })
    await move({ x: 320, y: 100 })
    capture.vm.$emit('mouseleave')
    window.dispatchEvent(event === 'mouseup' ? new MouseEvent(event, { button: 0 }) : new Event(event))
    await nextTick()
    await move({ x: 450, y: 200 })
    expect(line()!.points).toEqual([100, 100, 300, 100])
    expect(outlined()).toBe(false)
  })
  it('ignores other buttons and cancels pending frames on leave, disable and unmount', async () => {
    const { wrapper, capture, press, release, queueMove, line, markers, frames } = await setup()
    for (const button of [1, 2]) {
      await press({ x: 120, y: 100 }, button)
      await release({ x: 320, y: 100 }, button)
      expect(line()).toBeUndefined()
    }
    queueMove({ x: 120, y: 100 })
    capture.vm.$emit('mouseleave')
    expect(frames.size).toBe(0)
    queueMove({ x: 120, y: 100 })
    await wrapper.setProps({ active: false })
    expect(frames.size).toBe(0)
    expect(markers()).toEqual([])
    await wrapper.setProps({ active: true })
    queueMove({ x: 120, y: 100 })
    wrapper.unmount()
    expect(frames.size).toBe(0)
  })
  it.each([0.5, 2])('clamps labels to visible map boundaries at scale %s', async (scale) => {
    const { move, click, labelLayouts } = await setup(scale)
    await move({ x: 100, y: 100 })
    await click()
    await move({ x: 40, y: 20 })
    expect(labelLayouts()).toHaveLength(2)
    for (const label of labelLayouts()) {
      expect(label.x).toBeGreaterThanOrEqual(40 * scale + 4)
      expect(label.y).toBeGreaterThanOrEqual(20 * scale + 4)
      expect(label.x + label.width).toBeLessThanOrEqual(520 * scale - 4)
      expect(label.y + label.height).toBeLessThanOrEqual(380 * scale - 4)
    }
  })
})
