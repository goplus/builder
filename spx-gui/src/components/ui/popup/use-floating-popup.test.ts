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

import { resolveFloatingOffset, resolvePopupTransformOrigin, useFloatingPopup } from './use-floating-popup'

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

describe('resolvePopupTransformOrigin', () => {
  it('falls back to Naive UI-like placement origins when there is no arrow data', () => {
    expect(resolvePopupTransformOrigin('bottom-start', null, { showArrow: true })).toBe('top left')
    expect(resolvePopupTransformOrigin('left', null, { showArrow: false })).toBe('center right')
  })

  it('uses arrow position to align the expansion origin more closely to the trigger point', () => {
    expect(resolvePopupTransformOrigin('bottom', { left: '12px' }, { showArrow: true, arrowSize: 8 })).toBe(
      'calc(12px + 4px) top'
    )
    expect(resolvePopupTransformOrigin('right-start', { top: '6px' }, { showArrow: true, arrowSize: 8 })).toBe(
      'left calc(6px + 4px)'
    )
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
        placement: ref('bottom'),
        offset: ref({ x: 4, y: 8 }),
        showArrow: ref(true)
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
      top: '34px'
    })
    expect(popup.arrowStyle.value).toMatchObject({
      left: '5px',
      top: '-4px'
    })

    visible.value = false
    await flushFloatingEffects()

    expect(cleanup).toHaveBeenCalledTimes(1)
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
        showArrow: ref(true)
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
