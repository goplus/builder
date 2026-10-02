import { describe, expect, it } from 'vitest'
import { Cancelled } from './exception'
import { createCSSAnimation } from './css-animation'

describe('CSS animation', () => {
  it('finishes when the panel or its trigger completes a transition', async () => {
    const panel = document.createElement('div')
    const child = panel.appendChild(document.createElement('div'))
    const animation = createCSSAnimation('animated', panel)
    animation.begin()
    const completed = animation.endAndWait()
    child.dispatchEvent(new Event('transitionend', { bubbles: true }))
    await completed
    expect(panel.classList.contains('animated')).toBe(false)
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
