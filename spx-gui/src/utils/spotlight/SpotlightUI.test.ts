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
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  async function render() {
    await nextTick()
    await vi.advanceTimersByTimeAsync(20)
    await nextTick()
  }

  function cutoutStyle() {
    return wrapper.get<HTMLElement>('.mask-cutout').element.style
  }

  it('leaves 6px around the target and follows scrolling and target resizing', async () => {
    spotlight.reveal(target, { tip: 'Ask Copilot', mask: true, duration: 0 })
    await render()
    expect(cutoutStyle()).toMatchObject({ left: '194px', top: '94px', width: '62px', height: '62px' })

    rect = new DOMRect(200, 60, 50, 50)
    target.dispatchEvent(new Event('scroll'))
    await render()
    expect(cutoutStyle()).toMatchObject({ left: '194px', top: '54px' })

    rect = new DOMRect(200, 60, 100, 80)
    refreshSize()
    await render()
    expect(cutoutStyle()).toMatchObject({ left: '194px', top: '54px', width: '112px', height: '92px' })
  })

  it('moves the cutout to the next target and removes it when concealed', async () => {
    spotlight.reveal(target, { mask: true, duration: 0 })
    await render()

    const nextTarget = document.createElement('button')
    nextTarget.getBoundingClientRect = () => new DOMRect(400, 300, 40, 30)
    spotlight.reveal(nextTarget, { mask: true, duration: 0 })
    await render()
    expect(cutoutStyle()).toMatchObject({ left: '394px', top: '294px', width: '52px', height: '42px' })

    spotlight.conceal()
    await render()
    expect(wrapper.find('.mask-cutout').exists()).toBe(false)
  })

  it('shows a tip without dimming the page when masking is disabled', async () => {
    spotlight.reveal(target, { tip: 'Ask Copilot', mask: false, duration: 0 })
    await render()
    expect(wrapper.get('.content').text()).toBe('Ask Copilot')
    expect(wrapper.find('.mask-cutout').exists()).toBe(false)
  })
})
