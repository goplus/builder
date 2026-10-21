import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import type { ResourceType } from '@/models/spx/common/resource'
import EditorList from './EditorList.vue'

const dispose: (() => void)[] = []
let resizeCallback: ResizeObserverCallback
let mutationCallback: MutationCallback
const resizeObserve = vi.fn()
const resizeDisconnect = vi.fn()
const mutationObserve = vi.fn()
const mutationDisconnect = vi.fn()

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback
      }
      observe = resizeObserve
      disconnect = resizeDisconnect
    }
  )
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: MutationCallback) {
        mutationCallback = callback
      }
      observe = mutationObserve
      disconnect = mutationDisconnect
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
  let contentHeight = 400
  Object.defineProperties(items, {
    offsetWidth: { get: () => 91 + gutterWidth },
    clientWidth: { get: () => 91 },
    clientHeight: { get: () => 400 },
    scrollHeight: { get: () => contentHeight }
  })
  async function resizeWithGutter(width: number, height = 400) {
    gutterWidth = width
    contentHeight = height
    resizeCallback([{ contentRect: { width: 72, height: 400 } } as ResizeObserverEntry], {} as ResizeObserver)
    await nextTick()
  }
  async function changeContent(height: number) {
    contentHeight = height
    mutationCallback([{ type: 'childList', target: items } as unknown as MutationRecord], {} as MutationObserver)
    await nextTick()
  }
  return { wrapper, items, resizeWithGutter, changeContent }
}

describe('EditorList compact sidebar', () => {
  it.each(['costume', 'animation', 'backdrop', 'sound', 'widget'] as const)(
    'fits the %s card area and reserves only the scrollbar space it needs',
    async (resourceType) => {
      const { wrapper, items, resizeWithGutter } = await setup(resourceType)
      expect(wrapper.classes()).toContain('editor-list-compact')
      expect(resizeObserve).toHaveBeenCalledWith(items)
      expect(mutationObserve).toHaveBeenCalledWith(items, { childList: true })
      const sidebar = wrapper.get('.editor-list-sidebar').element as HTMLElement

      await resizeWithGutter(0)
      expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe('0px')

      for (const [gutterWidth, expectedWidth] of [
        [0, 8],
        [8, 8],
        [15, 15],
        [0, 8]
      ]) {
        await resizeWithGutter(gutterWidth, 800)
        expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe(`${expectedWidth}px`)
      }

      await resizeWithGutter(15)
      expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe('15px')
      await resizeWithGutter(0)
      expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe('0px')
    }
  )

  it('updates scrollbar clearance when cards are added or removed without resizing the list', async () => {
    const { wrapper, changeContent } = await setup('costume')
    const sidebar = wrapper.get('.editor-list-sidebar').element as HTMLElement

    expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe('0px')
    await changeContent(800)
    expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe('8px')
    await changeContent(400)
    expect(sidebar.style.getPropertyValue('--editor-list-scrollbar-width')).toBe('0px')
  })

  it('stops observing a removed list', async () => {
    const { wrapper } = await setup('sound')
    wrapper.unmount()
    expect(resizeDisconnect).toHaveBeenCalledOnce()
    expect(mutationDisconnect).toHaveBeenCalledOnce()
  })
})
