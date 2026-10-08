import { describe, expect, it, vi } from 'vitest'
import { Cancelled } from './exception'
import { createCSSAnimation } from './css-animation'

describe('CSS animation', () => {
  it('finishes on a bubbling transitionend event', async () => {
    const panel = document.createElement('div')
    const child = panel.appendChild(document.createElement('div'))
    const animation = createCSSAnimation('animated', panel)
    animation.begin()
    const completed = animation.endAndWait()
    child.dispatchEvent(new Event('transitionend', { bubbles: true }))
    await completed
    expect(panel.classList.contains('animated')).toBe(false)
  })

  it('keeps remaining transition events from ending the next stage', async () => {
    vi.useFakeTimers()
    try {
      const element = document.createElement('div')
      const child = element.appendChild(document.createElement('div'))
      const first = createCSSAnimation('animated', element)
      const second = createCSSAnimation('animated', element)
      const finished = vi.fn()
      first.begin()
      const completed = first.endAndWait().then(async () => {
        second.begin()
        await second.endAndWait()
        finished()
      })

      child.dispatchEvent(new Event('transitionend', { bubbles: true }))
      // Browsers run microtasks between separate transitionend events from the same stage.
      for (let i = 0; i < 4; i++) await Promise.resolve()
      child.dispatchEvent(new Event('transitionend', { bubbles: true }))
      await vi.advanceTimersByTimeAsync(0)
      expect(element.classList.contains('animated')).toBe(true)
      expect(finished).not.toHaveBeenCalled()

      element.dispatchEvent(new Event('transitionend'))
      await vi.advanceTimersByTimeAsync(0)
      await completed
      expect(finished).toHaveBeenCalledOnce()
      expect(element.classList.contains('animated')).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels a pending transition before the next animation starts', async () => {
    const panel = document.createElement('div')
    const controller = new AbortController()
    const closing = createCSSAnimation('animated', panel, controller.signal)
    closing.begin()
    const cancelled = new Cancelled()
    const completed = expect(closing.endAndWait()).rejects.toBe(cancelled)
    controller.abort(cancelled)
    expect(panel.classList.contains('animated')).toBe(false)

    const opening = createCSSAnimation('animated', panel)
    opening.begin()
    await completed
    expect(panel.classList.contains('animated')).toBe(true)
    const opened = opening.endAndWait()
    panel.dispatchEvent(new Event('transitionend'))
    await opened
  })

  it('cancels the continuation after transitionend', async () => {
    const panel = document.createElement('div')
    const controller = new AbortController()
    const animation = createCSSAnimation('animated', panel, controller.signal)
    animation.begin()
    const cancelled = new Cancelled()
    const completed = expect(animation.endAndWait()).rejects.toBe(cancelled)
    panel.dispatchEvent(new Event('transitionend'))
    controller.abort(cancelled)
    await completed
  })

  it('finishes immediately when the target position does not change', async () => {
    const panel = document.createElement('div')
    const animation = createCSSAnimation('animated', panel)
    animation.begin(false)
    await animation.endAndWait()
    expect(panel.classList.contains('animated')).toBe(false)
  })
})
