import { describe, expect, it } from 'vitest'
import { resolveHoverLayout, resolveHoverMaxHeight } from './layout'

describe('editor hover layout', () => {
  it('opens below an anchor near the top of the viewport', () => {
    expect(resolveHoverLayout({ top: 80, bottom: 100 }, 800)).toEqual({
      placement: 'bottom-start',
      maxHeight: 376
    })
  })

  it('opens above an anchor near the bottom of the viewport', () => {
    expect(resolveHoverLayout({ top: 700, bottom: 720 }, 800)).toEqual({
      placement: 'top-start',
      maxHeight: 376
    })
  })

  it('uses the larger side and constrains the card when neither side fits', () => {
    expect(resolveHoverLayout({ top: 260, bottom: 280 }, 500)).toEqual({
      placement: 'top-start',
      maxHeight: 248
    })
  })

  it('keeps the chosen side while updating its available height', () => {
    expect(resolveHoverMaxHeight('bottom-start', { top: 80, bottom: 100 }, 420)).toBe(308)
  })
})
