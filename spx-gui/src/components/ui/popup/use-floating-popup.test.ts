import { nextTick, ref } from 'vue'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { withSetup } from '@/utils/test'

const floatingMocks = vi.hoisted(() => {
  return {
    computePosition: vi.fn(),
    autoUpdate: vi.fn()
  }
})

vi.mock('@floating-ui/dom', () => ({
  computePosition: floatingMocks.computePosition,
  autoUpdate: floatingMocks.autoUpdate,
  offset: (value: unknown) => ({ name: 'offset', value }),
  flip: () => ({ name: 'flip' }),
  shift: (value: unknown) => ({ name: 'shift', value }),
  arrow: (value: unknown) => ({ name: 'arrow', value })
}))

import {
  POPUP_ARROW_SIZE,
  resolveDefaultPopupOffset,
  resolveFloatingOffset,
  resolvePopupTransformOrigin,
  useFloatingPopup
} from './use-floating-popup'

type MockPositionResult = {
  x: number
  y: number
  strategy: 'fixed'
  placement: 'bottom'
  middlewareData: {
    arrow: {
      x: number
      y: number
    }
  }
}

async function flushFloatingEffects() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('resolveFloatingOffset', () => {
  it('maps offsets for top/bottom placements to main-axis y and cross-axis x', () => {
    expect(resolveFloatingOffset('bottom-end', { x: 6, y: 10 })).toEqual({
      mainAxis: 10,
      crossAxis: 6
    })
  })

  it('maps offsets for left/right placements to main-axis x and cross-axis y', () => {
    expect(resolveFloatingOffset('left', { x: 6, y: 10 })).toEqual({
      mainAxis: 6,
      crossAxis: 10
    })
  })
})

describe('resolveDefaultPopupOffset', () => {
  it('uses one arrow-size gap along the main axis when arrows are enabled', () => {
    expect(resolveDefaultPopupOffset('top-end', true)).toEqual({ x: 0, y: POPUP_ARROW_SIZE })
    expect(resolveDefaultPopupOffset('right', true)).toEqual({ x: POPUP_ARROW_SIZE, y: 0 })
  })

  it('keeps the default gap at zero when arrows are disabled', () => {
    expect(resolveDefaultPopupOffset('bottom', false)).toEqual({ x: 0, y: 0 })
  })
})

describe('resolvePopupTransformOrigin', () => {
  it('falls back to Naive UI-like placement origins when there is no arrow data', () => {
    expect(resolvePopupTransformOrigin('bottom-start', null)).toBe('top left')
    expect(resolvePopupTransformOrigin('left', null)).toBe('center right')
  })

  it('uses arrow position to align the expansion origin more closely to the trigger point', () => {
    expect(resolvePopupTransformOrigin('bottom', { x: 12 })).toBe(`${12 + POPUP_ARROW_SIZE / 2}px top`)
    expect(resolvePopupTransformOrigin('right-start', { y: 6 })).toBe(`left ${6 + POPUP_ARROW_SIZE / 2}px`)
  })
})

describe('useFloatingPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    floatingMocks.computePosition.mockResolvedValue({
      x: 12,
      y: 34,
      strategy: 'fixed',
      placement: 'bottom',
      middlewareData: {
        arrow: {
          x: 5,
          y: 7
        }
      }
    })
  })

  it('starts auto-updating when visible and element refs are ready', async () => {
    const visible = ref(false)
    const cleanup = vi.fn()
    floatingMocks.autoUpdate.mockImplementation((_reference, _floating, update) => {
      void update()
      return cleanup
    })

    const popup = withSetup(() =>
      useFloatingPopup({
        visible,
        placement: ref<'bottom'>('bottom'),
        offset: ref({ x: 4, y: 8 }),
        showArrow: true
      })
    )

    popup.referenceRef.value = document.createElement('button')
    popup.floatingRef.value = document.createElement('div')
    popup.arrowRef.value = document.createElement('div')
    visible.value = true
    await flushFloatingEffects()

    expect(floatingMocks.autoUpdate).toHaveBeenCalledTimes(1)
    expect(floatingMocks.computePosition).toHaveBeenCalledTimes(1)
    expect(popup.floatingStyle.value).toEqual({
      position: 'fixed',
      left: '12px',
      top: '34px',
      '--ui-popup-transform-origin': `${5 + POPUP_ARROW_SIZE / 2}px top`
    })
    expect(popup.arrowStyle.value).toMatchObject({
      width: `${POPUP_ARROW_SIZE}px`,
      height: `${POPUP_ARROW_SIZE}px`,
      left: '5px',
      top: `-${POPUP_ARROW_SIZE / 2}px`
    })
    expect(popup.floatingStyle.value).toMatchObject({
      '--ui-popup-transform-origin': `${5 + POPUP_ARROW_SIZE / 2}px top`
    })

    visible.value = false
    await flushFloatingEffects()

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('uses the shared popup arrow size when positioning the arrow and computing transform origin', async () => {
    floatingMocks.autoUpdate.mockImplementation((_reference, _floating, update) => {
      void update()
      return vi.fn()
    })

    const popup = withSetup(() =>
      useFloatingPopup({
        visible: ref(true),
        placement: ref<'bottom'>('bottom'),
        showArrow: true
      })
    )

    popup.referenceRef.value = document.createElement('button')
    popup.floatingRef.value = document.createElement('div')
    popup.arrowRef.value = document.createElement('div')
    await flushFloatingEffects()

    const options = floatingMocks.computePosition.mock.calls[0]?.[2]
    const offsetMiddleware = options?.middleware.find((middleware: { name?: string }) => middleware.name === 'offset')
    expect(offsetMiddleware).toMatchObject({
      name: 'offset',
      value: {
        mainAxis: POPUP_ARROW_SIZE,
        crossAxis: 0
      }
    })
    expect(popup.arrowStyle.value).toMatchObject({
      width: `${POPUP_ARROW_SIZE}px`,
      height: `${POPUP_ARROW_SIZE}px`,
      left: '5px',
      top: `-${POPUP_ARROW_SIZE / 2}px`
    })
    expect(popup.floatingStyle.value).toMatchObject({
      '--ui-popup-transform-origin': `${5 + POPUP_ARROW_SIZE / 2}px top`
    })
  })

  it('uses a virtual anchor when manual popup coordinates are provided', async () => {
    floatingMocks.autoUpdate.mockImplementation((_reference, _floating, update) => {
      void update()
      return vi.fn()
    })

    const popup = withSetup(() =>
      useFloatingPopup({
        visible: ref(true),
        virtualAnchor: ref({ x: 20, y: 40, width: 80, height: 16 })
      })
    )

    popup.floatingRef.value = document.createElement('div')
    await flushFloatingEffects()

    const virtualReference = floatingMocks.autoUpdate.mock.calls[0]?.[0]
    expect(virtualReference).toBeTruthy()
    expect(typeof virtualReference.getBoundingClientRect).toBe('function')
    expect(floatingMocks.computePosition).toHaveBeenCalled()
  })

  it('re-subscribes and repositions when reactive placement changes', async () => {
    const cleanup = vi.fn()
    const placement = ref<'bottom' | 'top'>('bottom')
    floatingMocks.computePosition
      .mockResolvedValueOnce({
        x: 12,
        y: 34,
        strategy: 'fixed',
        placement: 'bottom',
        middlewareData: {
          arrow: {
            x: 5,
            y: 7
          }
        }
      })
      .mockResolvedValueOnce({
        x: 12,
        y: 34,
        strategy: 'fixed',
        placement: 'top',
        middlewareData: {
          arrow: {
            x: 5,
            y: 7
          }
        }
      })
    floatingMocks.autoUpdate.mockImplementation((_reference, _floating, update) => {
      void update()
      return cleanup
    })

    const popup = withSetup(() =>
      useFloatingPopup({
        visible: ref(true),
        placement
      })
    )

    popup.referenceRef.value = document.createElement('button')
    popup.floatingRef.value = document.createElement('div')
    await flushFloatingEffects()

    expect(popup.floatingStyle.value).toMatchObject({ '--ui-popup-transform-origin': 'top center' })
    expect(floatingMocks.computePosition.mock.calls[0]?.[2]).toMatchObject({ placement: 'bottom' })

    placement.value = 'top'
    await flushFloatingEffects()

    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(popup.floatingStyle.value).toMatchObject({ '--ui-popup-transform-origin': 'bottom center' })
    expect(floatingMocks.computePosition.mock.calls.at(-1)?.[2]).toMatchObject({ placement: 'top' })
  })

  it('ignores stale async positioning results after the popup is hidden', async () => {
    const cleanup = vi.fn()
    let resolvePosition: ((value: MockPositionResult) => void) | null = null

    floatingMocks.autoUpdate.mockImplementation((_reference, _floating, update) => {
      void update()
      return cleanup
    })
    floatingMocks.computePosition.mockImplementation(
      () =>
        new Promise<MockPositionResult>((resolve) => {
          resolvePosition = resolve
        })
    )

    const visible = ref(true)
    const popup = withSetup(() =>
      useFloatingPopup({
        visible,
        showArrow: true
      })
    )

    popup.referenceRef.value = document.createElement('button')
    popup.floatingRef.value = document.createElement('div')
    popup.arrowRef.value = document.createElement('div')
    await flushFloatingEffects()

    visible.value = false
    await flushFloatingEffects()

    if (resolvePosition == null) throw new Error('Expected pending computePosition promise')
    const resolvePendingPosition: (value: MockPositionResult) => void = resolvePosition

    resolvePendingPosition({
      x: 48,
      y: 96,
      strategy: 'fixed',
      placement: 'bottom',
      middlewareData: {
        arrow: {
          x: 9,
          y: 11
        }
      }
    })
    await flushFloatingEffects()

    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(popup.floatingStyle.value).toBeNull()
    expect(popup.arrowStyle.value).toBeNull()
  })
})
