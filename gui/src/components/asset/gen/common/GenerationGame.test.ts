import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import GenerationGame from './GenerationGame.vue'
import type { Game } from './generation-game'

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useUIVariables: () => ({})
}))

function setup() {
  vi.useFakeTimers()
  const clearInterval = vi.spyOn(globalThis, 'clearInterval')
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 320, 320))
  const wrapper = mount(GenerationGame, {
    attachTo: document.body,
    props: { enabled: true, viewport: { width: 320, height: 320 } },
    global: { plugins: [createI18n({ lang: 'en' })] }
  })
  onTestFinished(() => {
    wrapper.unmount()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })
  async function press(key: string, target: EventTarget = document.body) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
    target.dispatchEvent(event)
    await nextTick()
    return event
  }
  return { wrapper, press, clearInterval }
}

describe('GenerationGame', () => {
  it('stays hidden until an arrow key and leaves editable fields alone', async () => {
    const { wrapper, press, clearInterval } = setup()
    expect(wrapper.find('svg').exists()).toBe(false)
    const input = document.createElement('textarea')
    document.body.append(input)
    onTestFinished(() => input.remove())
    expect((await press('ArrowLeft', input)).defaultPrevented).toBe(false)
    expect((await press('w', input)).defaultPrevented).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect((await press('ArrowRight')).defaultPrevented).toBe(true)
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.emitted('change')).toEqual([[expect.objectContaining({ status: 'playing' })]])
    await press('Escape', wrapper.get('svg').element)
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.emitted('change')).toEqual([[expect.objectContaining({ status: 'playing' })], [null]])
    expect(clearInterval).toHaveBeenCalledOnce()
  })

  it('starts with WASD and uses the same directions while playing', async () => {
    const { wrapper, press } = setup()
    expect((await press('w')).defaultPrevented).toBe(true)
    const [game] = wrapper.emitted('change')![0] as [Game]
    expect(game.direction).toBe('ArrowUp')
    for (const [key, direction] of [
      ['a', 'ArrowLeft'],
      ['s', 'ArrowDown'],
      ['d', 'ArrowRight'],
      ['W', 'ArrowUp']
    ]) {
      expect((await press(key, wrapper.get('svg').element)).defaultPrevented).toBe(true)
      expect(game.turn).toBe(direction)
    }
    expect(wrapper.emitted('change')).toHaveLength(1)
  })

  it('freezes for the result transition and releases keyboard listeners on unmount', async () => {
    const { wrapper, press } = setup()
    await press('ArrowRight')
    await wrapper.setProps({ enabled: false })
    const position = wrapper.get('.player').attributes('style')
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.get('.player').attributes('style')).toBe(position)
    expect((await press('ArrowDown')).defaultPrevented).toBe(false)
    expect(wrapper.find('svg').exists()).toBe(true)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect((await press('ArrowDown')).defaultPrevented).toBe(false)
  })

  it('pauses while unfocused and resumes on the next arrow key', async () => {
    const { wrapper, press } = setup()
    await press('ArrowRight')
    const [game] = wrapper.emitted('change')![0] as [Game]
    game.ghosts = []
    await vi.advanceTimersByTimeAsync(6000)
    expect(game.ticks).toBe(60)
    const button = document.createElement('button')
    document.body.append(button)
    onTestFinished(() => button.remove())
    button.focus()
    await vi.advanceTimersByTimeAsync(6000)
    expect(game.ticks).toBe(60)
    await press('ArrowDown')
    await vi.advanceTimersByTimeAsync(2100)
    expect(game.ticks).toBe(81)
  })

  it.each([false, true])('returns to loading after a loss and prevents retrying (escape: %s)', async (escape) => {
    const { wrapper, press } = setup()
    await press('ArrowRight')
    expect(wrapper.findAll('.ghost')).toHaveLength(1)
    const [game] = wrapper.emitted('change')![0] as [Game]
    game.status = 'caught'
    await nextTick()
    expect(wrapper.find('.collision').exists()).toBe(true)
    expect(wrapper.find('.game-result').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
    expect((await press('ArrowLeft', wrapper.get('svg').element)).defaultPrevented).toBe(false)
    expect(wrapper.emitted('change')).toHaveLength(1)
    if (escape) await press('Escape', wrapper.get('svg').element)
    else await vi.advanceTimersByTimeAsync(600)
    expect(wrapper.find('.collision').exists()).toBe(false)
    expect(wrapper.find('[role="application"]').exists()).toBe(false)
    expect(wrapper.emitted('change')?.at(-1)).toEqual([null])
    expect((await press('ArrowRight')).defaultPrevented).toBe(false)
    expect((await press('w')).defaultPrevented).toBe(false)
    expect(wrapper.emitted('change')).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0)

    await wrapper.setProps({ enabled: false })
    await wrapper.setProps({ enabled: true })
    await press('ArrowRight')
    expect(wrapper.emitted('change')?.at(-1)).toEqual([
      expect.objectContaining({ status: 'playing', eaten: expect.any(Map) })
    ])
    const [restarted] = wrapper.emitted('change')!.at(-1) as [Game]
    expect(restarted.eaten.size).toBe(0)
    expect(restarted.ticks).toBe(0)
  })

  it('shows the final pellet score and clears it when another generation starts', async () => {
    const { wrapper, press } = setup()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await press('ArrowRight')
    await wrapper.setProps({ enabled: false })
    const [game] = wrapper.emitted('change')![0] as [Game]
    game.eaten.set(1, 100)
    game.eaten.set(2, 200)
    game.status = 'won'
    await nextTick()
    expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('You made it! Score: 2')
    expect(wrapper.get('.game-result strong').text()).toBe('Complete')
    expect(wrapper.get('.score-value').text()).toBe('2')
    expect(wrapper.get('.result-score').text()).toContain('Score')
    expect(wrapper.find('.result-dot').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
    await wrapper.setProps({ enabled: true })
    expect(wrapper.find('[role="application"]').exists()).toBe(false)
    expect(wrapper.find('.game-result').exists()).toBe(false)
    expect(wrapper.emitted('change')?.at(-1)).toEqual([null])
  })

  it('keeps the maze and score when the viewport changes', async () => {
    const { wrapper, press } = setup()
    await press('ArrowRight')
    const [game] = wrapper.emitted('change')![0] as [Game]
    game.eaten.set(1, 100)
    await wrapper.setProps({ viewport: { width: 360, height: 360 } })
    await press('ArrowDown', wrapper.get('svg').element)
    expect(wrapper.emitted('change')).toHaveLength(1)
    expect(game.eaten.size).toBe(1)
    expect(wrapper.get('svg').attributes('viewBox')).toBe('0 0 360 360')
  })
})
