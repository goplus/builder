import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { ResourceType } from '@/models/spx/common/resource'
import EditorList from './EditorList.vue'

const dispose: (() => void)[] = []
let resizeCallback: ResizeObserverCallback
const observe = vi.fn()
const disconnect = vi.fn()

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }
      observe = observe
      disconnect = disconnect
    }
  )
})

afterEach(() => {
  dispose.splice(0).forEach((fn) => fn())
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

async function setup(resourceType: ResourceType) {
  const wrapper = mount(EditorList, {
    props: { resourceType },
    slots: { default: '<div class="ui-block-item">Resource</div>' },
    global: {
      directives: { radar: {} },
      mocks: { $t: (message: { en: string }) => message.en },
      stubs: { UIDropdownWithTooltip: true, UIIcon: true }
    }
  })
  dispose.push(() => wrapper.unmount())
  await nextTick()
  const items = wrapper.get('.items').element as HTMLElement
  let gutterWidth = 0
  Object.defineProperties(items, {
    offsetWidth: { get: () => 91 + gutterWidth },
    clientWidth: { get: () => 91 }
  })
  async function resizeWithGutter(width: number) {
    gutterWidth = width
    resizeCallback([{ contentRect: { width: 72, height: 400 } } as ResizeObserverEntry], {} as ResizeObserver)
    await nextTick()
  }
  return { wrapper, items, resizeWithGutter }
}

describe('EditorList compact sidebar', () => {
  it.each(['costume', 'animation', 'backdrop', 'sound', 'widget'] as const)(
    'reserves native scrollbar space outside the %s card area',
    async (resourceType) => {
      const { wrapper, items, resizeWithGutter } = await setup(resourceType)
      expect(wrapper.classes()).toContain('editor-list-compact')
      expect(observe).toHaveBeenCalledWith(items)

      for (const gutterWidth of [0, 8, 15, 0]) {
        await resizeWithGutter(gutterWidth)
        const sidebar = wrapper.get('.editor-list-sidebar').element as HTMLElement
        expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe(`${gutterWidth}px`)
      }
    }
  )

  it('stops observing a removed list', async () => {
    const { wrapper } = await setup('sound')
    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
