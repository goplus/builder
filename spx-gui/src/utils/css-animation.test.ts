import { describe, expect, it, vi } from 'vitest'
import { Cancelled } from './exception'
import { animateCSS } from './css-animation'

describe('CSS animation', () => {
  it('updates the target and finishes on a bubbling transitionend event', async () => {
    const element = document.createElement('div')
    const child = element.appendChild(document.createElement('div'))
    const update = vi.fn(() => {
      expect(element.classList.contains('animated')).toBe(true)
    })
    const completed = animateCSS('animated', element, update, true)
    expect(update).toHaveBeenCalledOnce()
    child.dispatchEvent(new Event('transitionend', { bubbles: true }))
    await completed
    expect(element.classList.contains('animated')).toBe(false)
  })

  it('cancels a pending transition before the next animation starts', async () => {
    const element = document.createElement('div')
    const controller = new AbortController()
    const cancelled = new Cancelled()
    const completed = expect(animateCSS('animated', element, () => {}, true, controller.signal)).rejects.toBe(cancelled)
    controller.abort(cancelled)
    expect(element.classList.contains('animated')).toBe(false)

    const next = animateCSS('animated', element, () => {}, true)
    await completed
    expect(element.classList.contains('animated')).toBe(true)
    element.dispatchEvent(new Event('transitionend'))
    await next
  })

  it('cancels the continuation after transitionend', async () => {
    const element = document.createElement('div')
    const controller = new AbortController()
    const cancelled = new Cancelled()
    const completed = expect(animateCSS('animated', element, () => {}, true, controller.signal)).rejects.toBe(cancelled)
    element.dispatchEvent(new Event('transitionend'))
    controller.abort(cancelled)
    await completed
  })

  it('updates the target without waiting when no transition is expected', async () => {
    const element = document.createElement('div')
    const update = vi.fn()
    await animateCSS('animated', element, update, false)
    expect(update).toHaveBeenCalledOnce()
    expect(element.classList.contains('animated')).toBe(false)
  })

  it('updates the target without waiting when the element is unavailable', async () => {
    const update = vi.fn()
    await animateCSS('animated', null, update, true)
    expect(update).toHaveBeenCalledOnce()
  })

  it('cleans up when updating the target throws', async () => {
    const element = document.createElement('div')
    const error = new Error('update failed')
    await expect(
      animateCSS(
        'animated',
        element,
        () => {
          throw error
        },
        true
      )
    ).rejects.toBe(error)
    expect(element.classList.contains('animated')).toBe(false)
  })
})
