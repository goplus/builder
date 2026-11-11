import { shallowMount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import GenLoading from './GenLoading.vue'
import GenerationGame from './GenerationGame.vue'
import { createGame, gameGrid, type Game } from './generation-game'

vi.mock('@/utils/dom', () => ({ useContentSize: () => ref({ width: 360, height: 360 }) }))
vi.mock('@/components/ui', () => ({
  useUIVariables: () => ({ color: { grey: { 800: '#76808c' }, primary: { main: '#36c2cf' } } })
}))

async function setup(reduced = false, mountGame = false) {
  vi.useFakeTimers()
  const media = Object.assign(new EventTarget(), { matches: reduced })
  const requestFrame = vi.fn().mockReturnValue(1)
  const cancelFrame = vi.fn()
  vi.stubGlobal('matchMedia', () => media)
  vi.stubGlobal('requestAnimationFrame', requestFrame)
  vi.stubGlobal('cancelAnimationFrame', cancelFrame)
  const context = { scale: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn() }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  const wrapper = shallowMount(GenLoading, {
    attachTo: document.body,
    props: { playable: true },
    slots: { default: 'Generating...' },
    global: {
      stubs: { GenerationGame: !mountGame, GenerationGameResult: true },
      plugins: [createI18n({ lang: 'en' })]
    }
  })
  onTestFinished(() => {
    wrapper.unmount()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  await nextTick()
  return { wrapper, media, requestFrame, cancelFrame, context }
}

describe('GenLoading', () => {
  it('uses the loading grid when screen dimensions differ from layout dimensions', async () => {
    const { wrapper, context, requestFrame } = await setup(false, true)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 540, 540))
    await wrapper.setProps({ playable: true })
    const loadingDots = context.arc.mock.calls.map(([x, y, radius]) => [x, y, radius])
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    context.arc.mockClear()
    requestFrame.mock.lastCall![0](performance.now() + 300)
    expect(context.arc.mock.calls.map(([x, y, radius]) => [x, y, radius])).toEqual(loadingDots)
    expect(wrapper.get('[role="application"]').attributes('viewBox')).toBe('0 0 360 360')
  })

  it('keeps loading dots in place and at the same size when the maze appears', async () => {
    const { wrapper, context, requestFrame } = await setup()
    await wrapper.setProps({ playable: true })
    const loadingDots = context.arc.mock.calls.map(([x, y, radius]) => [x, y, radius])
    const { columns, rows } = gameGrid(360, 360)
    const footerStyle = wrapper.get('.message').attributes('style')
    const game = createGame('ArrowRight', columns, rows, 0)
    wrapper.getComponent(GenerationGame).vm.$emit('change', game)
    await nextTick()
    context.arc.mockClear()
    requestFrame.mock.lastCall![0](500)
    const gameDots = context.arc.mock.calls.map(([x, y, radius]) => [x, y, radius])
    expect(gameDots).toEqual(loadingDots)
    expect(wrapper.get('.message').attributes('style')).toBe(footerStyle)
  })

  it('keeps the same dot field and game through the result transition', async () => {
    const { wrapper, requestFrame } = await setup()
    await wrapper.setProps({ playable: true })
    const canvas = wrapper.get('canvas').element
    wrapper.getComponent(GenerationGame).vm.$emit('change', createGame('ArrowRight', 30, 26, 0))
    await nextTick()
    expect(requestFrame).toHaveBeenCalledTimes(2)
    expect(wrapper.get('canvas').element).toBe(canvas)
    await wrapper.setProps({ playable: false })
    expect(wrapper.getComponent(GenerationGame).props('enabled')).toBe(false)
    expect(wrapper.get('canvas').isVisible()).toBe(true)
    await wrapper.setProps({ visible: false })
    expect(wrapper.findComponent(GenerationGame).exists()).toBe(false)
  })

  it.each([false, true])('keeps victory visible before revealing the result (skip: %s)', async (skip) => {
    const { wrapper } = await setup(false, true)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 360))
    await wrapper.setProps({ playable: true })
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    const [game] = wrapper.getComponent(GenerationGame).emitted('change')![0] as [Game]
    await wrapper.setProps({ completed: true, playable: false, visible: false })
    expect(game.status).toBe('won')
    expect(game.finishedAt).toEqual(expect.any(Number))
    expect(wrapper.find('.gen-loading').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(4999)
    expect(wrapper.find('.gen-loading').exists()).toBe(true)
    if (skip) await wrapper.get('[role="application"]').trigger('keydown', { key: 'Enter' })
    else await vi.advanceTimersByTimeAsync(1)
    await nextTick()
    expect(wrapper.find('.gen-loading').exists()).toBe(false)
  })

  it.each([false, true])(
    'celebrates cleared dots before generation completes (completes during celebration: %s)',
    async (completes) => {
      const { wrapper } = await setup(false, true)
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 360, 360))
      await wrapper.setProps({ playable: true })
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      await nextTick()
      const [game] = wrapper.getComponent(GenerationGame).emitted('change')![0] as [Game]
      // Leave one pellet immediately ahead of the player, without a pursuer on that step.
      game.paths = new Set([game.columns + 1, game.columns + 2])
      game.player = { x: 1, y: 1 }
      game.pellets = new Set([game.columns + 2])
      game.ghosts = []
      await vi.advanceTimersByTimeAsync(100)
      expect(game.status).toBe('won')
      expect(wrapper.get('generation-game-result-stub').attributes('score')).toBe('1')
      expect(wrapper.find('.message').exists()).toBe(false)
      if (completes) await wrapper.setProps({ completed: true, playable: false, visible: false })
      await vi.advanceTimersByTimeAsync(4999)
      expect(wrapper.find('.gen-loading').exists()).toBe(true)
      await vi.advanceTimersByTimeAsync(1)
      if (completes) {
        expect(wrapper.find('.gen-loading').exists()).toBe(false)
      } else {
        expect(wrapper.find('generation-game-result-stub').exists()).toBe(false)
        expect(wrapper.find('.message').text()).toBe('Generating...')
        expect(wrapper.find('[role="application"]').exists()).toBe(false)
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
        await nextTick()
        expect(wrapper.find('[role="application"]').exists()).toBe(false)
        await wrapper.setProps({ completed: true, playable: false, visible: false })
        expect(wrapper.find('.gen-loading').exists()).toBe(false)
      }
    }
  )

  it.each([false, true])('does not award a win without a surviving game (caught: %s)', async (caught) => {
    const { wrapper } = await setup()
    await wrapper.setProps({ playable: true })
    if (caught) {
      const game = createGame('ArrowRight', 30, 26, 0)
      game.status = 'caught'
      wrapper.getComponent(GenerationGame).vm.$emit('change', game)
      await nextTick()
      expect(wrapper.find('.message').text()).toBe('Generating...')
    }
    await wrapper.setProps({ completed: true, playable: false, visible: false })
    expect(wrapper.find('.gen-loading').exists()).toBe(false)
  })

  it('stops drawing when hidden and when unmounted', async () => {
    const { wrapper, requestFrame, cancelFrame } = await setup()
    expect(requestFrame).toHaveBeenCalledOnce()
    await wrapper.setProps({ visible: false })
    expect(cancelFrame).toHaveBeenCalledExactlyOnceWith(1)
    await wrapper.setProps({ visible: true })
    expect(requestFrame).toHaveBeenCalledTimes(2)
    wrapper.unmount()
    expect(cancelFrame).toHaveBeenCalledTimes(2)
  })

  it('draws a static field for reduced motion and responds to preference changes', async () => {
    const { media, requestFrame, cancelFrame, context } = await setup(true)
    expect(context.fill).toHaveBeenCalled()
    expect(requestFrame).not.toHaveBeenCalled()
    media.matches = false
    media.dispatchEvent(new Event('change'))
    await nextTick()
    expect(requestFrame).toHaveBeenCalledOnce()
    media.matches = true
    media.dispatchEvent(new Event('change'))
    await nextTick()
    expect(cancelFrame).toHaveBeenLastCalledWith(1)
    expect(requestFrame).toHaveBeenCalledOnce()
  })
})
