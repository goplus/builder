import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import GenerationGameResult from './GenerationGameResult.vue'

vi.mock('@/components/ui', () => ({
  useUIVariables: () => ({ color: { primary: { main: '#36c2cf', 300: '#8fe3ea' }, yellow: { main: '#f2c94c' } } })
}))

async function setup({ reduced = false, context: ctx = true } = {}) {
  vi.useFakeTimers()
  const requestFrame = vi.fn().mockReturnValue(7)
  const cancelFrame = vi.fn()
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }))
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelFrame)
  vi.stubGlobal('devicePixelRatio', 2)
  const context = {
    globalAlpha: 1,
    scale: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    restore: vi.fn()
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx ? (context as unknown as CanvasRenderingContext2D) : null
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 200, 100))
  const wrapper = shallowMount(GenerationGameResult, {
    attachTo: document.body,
    props: { score: 3 },
    global: { plugins: [createI18n({ lang: 'en' })] }
  })
  onTestFinished(() => {
    wrapper.unmount()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  return { wrapper, requestFrame, cancelFrame, context }
}

describe('GenerationGameResult', () => {
  it('paints 64 particles per frame, fades out and stops after 1.6 s', async () => {
    const { requestFrame, context } = await setup()
    expect(requestFrame).toHaveBeenCalledOnce()
    requestFrame.mock.lastCall![0](0)
    expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 200, 100)
    expect(context.fillRect).toHaveBeenCalledTimes(64)
    expect(context.globalAlpha).toBe(1)
    requestFrame.mock.lastCall![0](1400)
    expect(context.globalAlpha).toBeCloseTo(0.4, 12)
    expect(context.fillRect).toHaveBeenCalledTimes(128)
    expect(requestFrame).toHaveBeenCalledTimes(3)
    requestFrame.mock.lastCall![0](1500)
    expect(requestFrame).toHaveBeenCalledTimes(4)
    requestFrame.mock.lastCall![0](1600)
    expect(context.globalAlpha).toBe(0)
    expect(requestFrame).toHaveBeenCalledTimes(4)
  })

  it('skips confetti for reduced motion', async () => {
    const { requestFrame } = await setup({ reduced: true })
    expect(HTMLCanvasElement.prototype.getContext).not.toHaveBeenCalled()
    expect(requestFrame).not.toHaveBeenCalled()
  })

  it('skips confetti without a 2d context', async () => {
    const { requestFrame } = await setup({ context: false })
    expect(requestFrame).not.toHaveBeenCalled()
  })

  it('cancels the scheduled frame on unmount', async () => {
    const { wrapper, requestFrame, cancelFrame } = await setup()
    requestFrame.mock.lastCall![0](0)
    wrapper.unmount()
    expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(7)
  })

  it('scales the canvas backing store by the device pixel ratio', async () => {
    const { wrapper, context } = await setup()
    const canvas = wrapper.get('canvas').element as HTMLCanvasElement
    expect(canvas.width).toBe(400)
    expect(canvas.height).toBe(200)
    expect(context.scale).toHaveBeenCalledExactlyOnceWith(2, 2)
  })
})
