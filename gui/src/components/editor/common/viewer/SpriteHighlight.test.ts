import { shallowMount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SpriteHighlight from './SpriteHighlight.vue'

describe('Sprite highlight bitmap reuse', () => {
  const drawImage = vi.fn()

  beforeEach(() => {
    drawImage.mockClear()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage,
      fillRect: vi.fn(),
      getImageData: () => ({ data: new Uint8ClampedArray([255, 255, 255, 255]) }),
      putImageData: vi.fn()
    } as unknown as CanvasRenderingContext2D)
  })

  afterEach(() => vi.restoreAllMocks())

  function setup(image = new Image(), width = 40, height = 30) {
    return shallowMount(SpriteHighlight, {
      props: { spriteConfig: { image, width, height, scaleX: 1, scaleY: 1 }, mapScale: 1 },
      global: { stubs: { 'v-image': { name: 'v-image', props: ['config'], template: '<div />' } } }
    })
  }

  it('updates transforms without redrawing and reuses the bitmap after remounting', async () => {
    const image = new Image()
    const wrapper = setup(image)
    try {
      const bitmap = wrapper.findComponent({ name: 'v-image' }).props('config').image
      const draws = drawImage.mock.calls.length
      expect(draws).toBeGreaterThan(0)
      await wrapper.setProps({
        spriteConfig: { ...wrapper.props('spriteConfig'), x: 10, y: 20, rotation: 45, visible: false, scaleX: -1 }
      })
      expect(drawImage).toHaveBeenCalledTimes(draws)
      expect(wrapper.findComponent({ name: 'v-image' }).props('config')).toMatchObject({
        image: bitmap,
        x: 10,
        y: 20,
        rotation: 45,
        visible: false,
        scaleX: -1
      })
      wrapper.unmount()
      const remounted = setup(image)
      try {
        expect(remounted.findComponent({ name: 'v-image' }).props('config').image).toBe(bitmap)
        expect(drawImage).toHaveBeenCalledTimes(draws)
      } finally {
        remounted.unmount()
      }
    } finally {
      wrapper.unmount()
    }
  })

  it('rebuilds for image, dimensions and effective scale changes, and reuses recent targets', async () => {
    const wrapper = setup()
    try {
      const original = wrapper.props('spriteConfig')
      const bitmap = wrapper.findComponent({ name: 'v-image' }).props('config').image
      const draws = drawImage.mock.calls.length
      await wrapper.setProps({ mapScale: 2 })
      expect(drawImage.mock.calls.length).toBeGreaterThan(draws)
      await wrapper.setProps({ mapScale: 1, spriteConfig: { ...original, width: 50 } })
      expect(wrapper.findComponent({ name: 'v-image' }).props('config').image).not.toBe(bitmap)
      await wrapper.setProps({ spriteConfig: { ...original, image: new Image() } })
      expect(wrapper.findComponent({ name: 'v-image' }).props('config').image).not.toBe(bitmap)
      const drawsBeforeReturn = drawImage.mock.calls.length
      await wrapper.setProps({ spriteConfig: original })
      expect(wrapper.findComponent({ name: 'v-image' }).props('config').image).toBe(bitmap)
      expect(drawImage).toHaveBeenCalledTimes(drawsBeforeReturn)
    } finally {
      wrapper.unmount()
    }
  })

  it('evicts old resize variants instead of retaining an unbounded bitmap history', async () => {
    const wrapper = setup()
    try {
      const bitmap = wrapper.findComponent({ name: 'v-image' }).props('config').image
      for (let scale = 2; scale <= 12; scale++) await wrapper.setProps({ mapScale: scale })
      await wrapper.setProps({ mapScale: 1 })
      expect(wrapper.findComponent({ name: 'v-image' }).props('config').image).not.toBe(bitmap)
    } finally {
      wrapper.unmount()
    }
  })
})
