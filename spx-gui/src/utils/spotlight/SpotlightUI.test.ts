import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import { Spotlight } from '.'
import SpotlightUI from './SpotlightUI.vue'

describe('SpotlightUI', () => {
  let spotlight: Spotlight
  let wrapper: VueWrapper
  let target: HTMLButtonElement
  let rect: DOMRect
  let refreshSize: () => void

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('innerWidth', 1280)
    vi.stubGlobal('innerHeight', 800)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('tips') ? new DOMRect(0, 0, 120, 40) : new DOMRect()
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0))
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          refreshSize = callback
        }
        observe() {}
        disconnect() {}
      }
    )
    rect = new DOMRect(200, 100, 50, 50)
    target = document.createElement('button')
    target.getBoundingClientRect = () => rect
    document.body.append(target)
    spotlight = new Spotlight()
    wrapper = mount(SpotlightUI, { global: { plugins: [spotlight] } })
  })

  afterEach(() => {
    spotlight.dispose()
    wrapper.unmount()
    target.remove()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  async function render() {
    await nextTick()
    await vi.advanceTimersByTimeAsync(20)
    await nextTick()
  }

  function cutoutPath() {
    return wrapper.get('.mask path').attributes('d')?.replace(/\s+/g, ' ').trim()
  }

  it('leaves 6px around the target and follows scrolling and target resizing', async () => {
    spotlight.reveal(target, { tip: 'Ask Copilot', mask: true, duration: 0 })
    await render()
    expect(cutoutPath()).toBe(
      'M0 0H1280V800H0Z M202 94H248 A8 8 0 0 1 256 102V148 A8 8 0 0 1 248 156H202 A8 8 0 0 1 194 148V102 A8 8 0 0 1 202 94Z'
    )

    rect = new DOMRect(200, 60, 50, 50)
    target.dispatchEvent(new Event('scroll'))
    await render()
    expect(cutoutPath()).toBe(
      'M0 0H1280V800H0Z M202 54H248 A8 8 0 0 1 256 62V108 A8 8 0 0 1 248 116H202 A8 8 0 0 1 194 108V62 A8 8 0 0 1 202 54Z'
    )

    rect = new DOMRect(200, 60, 100, 80)
    refreshSize()
    await render()
    expect(cutoutPath()).toBe(
      'M0 0H1280V800H0Z M202 54H298 A8 8 0 0 1 306 62V138 A8 8 0 0 1 298 146H202 A8 8 0 0 1 194 138V62 A8 8 0 0 1 202 54Z'
    )
  })

  it('moves the cutout to the next target and removes it when concealed', async () => {
    spotlight.reveal(target, { mask: true, duration: 0 })
    await render()

    const nextTarget = document.createElement('button')
    nextTarget.getBoundingClientRect = () => new DOMRect(400, 300, 40, 30)
    spotlight.reveal(nextTarget, { mask: true, duration: 0 })
    await render()
    expect(cutoutPath()).toBe(
      'M0 0H1280V800H0Z M402 294H438 A8 8 0 0 1 446 302V328 A8 8 0 0 1 438 336H402 A8 8 0 0 1 394 328V302 A8 8 0 0 1 402 294Z'
    )

    spotlight.conceal()
    await render()
    expect(wrapper.find('.mask').exists()).toBe(false)
  })

  it.each([
    { x: 500, y: 100, placement: 'bottom-right', anchorX: 566, anchorY: 166 },
    { x: 500, y: 700, placement: 'top-right', anchorX: 566, anchorY: 684 },
    { x: 1200, y: 100, placement: 'bottom-left', anchorX: 1184, anchorY: 166 },
    { x: 1200, y: 700, placement: 'top-left', anchorX: 1184, anchorY: 684 }
  ])('places the arrow 16px outside the target at $placement', async ({ x, y, placement, anchorX, anchorY }) => {
    rect = new DOMRect(x, y, 50, 50)
    spotlight.reveal(target, { tip: 'Ask Copilot', mask: true, duration: 0 })
    await render()

    const item = wrapper.get<HTMLElement>('.spotlight-item')
    expect(item.classes()).toContain(placement)
    expect(item.element.style.transform).toBe(`translate(${anchorX}px, ${anchorY}px)`)
  })

  it.each([
    { rect: new DOMRect(0, 0, 1270, 780), anchorX: 1124, anchorY: 722 },
    { rect: new DOMRect(10, 20, 1270, 780), anchorX: 159, anchorY: 80 }
  ])('keeps the tip inside the viewport when space is limited: $anchorX, $anchorY', async (example) => {
    rect = example.rect
    spotlight.reveal(target, { tip: 'Ask Copilot', mask: true, duration: 0 })
    await render()

    expect(wrapper.get<HTMLElement>('.spotlight-item').element.style.transform).toBe(
      `translate(${example.anchorX}px, ${example.anchorY}px)`
    )
  })

  it('shows a tip without dimming the page when masking is disabled', async () => {
    spotlight.reveal(target, { tip: 'Ask Copilot', mask: false, duration: 0 })
    await render()
    expect(wrapper.get('.content').text()).toBe('Ask Copilot')
    expect(wrapper.find('.mask').exists()).toBe(false)
  })
})
