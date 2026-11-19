import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowReactive } from 'vue'
import { createI18n } from '@/utils/i18n'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceUI from './APIReferenceUI.vue'

function setup() {
  const items = [
    { definition: { name: 'animate' }, overview: 'animate name', categories: [['looks', 'animation']] }
  ] as APIReferenceItem[]
  const state = shallowReactive({
    items: items as APIReferenceItem[] | null,
    error: null,
    categoryViewInfos: null,
    search: vi.fn(async (_items: APIReferenceItem[], _query: string, _signal: AbortSignal) => items),
    canAskCopilot: true,
    askCopilot: vi.fn()
  })
  const wrapper = mount(APIReferenceUI, {
    attachTo: document.body,
    props: { controller: state as unknown as APIReferenceController },
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: {} },
      stubs: {
        APIReferenceItemComp: { props: ['item'], template: '<li>{{ item.overview }}</li>' },
        UITooltip: { template: '<div><slot name="trigger" /></div>' },
        UIDropdown: { template: '<div><slot name="trigger" /></div>' },
        UIIcon: true
      }
    }
  })
  return { state, wrapper, items }
}

afterEach(() => vi.useRealTimers())

describe('API Reference search lifecycle', () => {
  it('debounces input, searches on Enter and clears back to browsing', async () => {
    vi.useFakeTimers()
    const { state, wrapper, items } = setup()
    await wrapper.get('button').trigger('click')
    await wrapper.get('input').setValue('播放动画')
    await vi.advanceTimersByTimeAsync(299)
    expect(state.search).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(state.search).toHaveBeenCalledWith(items, '播放动画', expect.any(AbortSignal))
    expect(wrapper.get('[role="status"]').text()).toBe('Matched 1 snippet')
    await wrapper.get('input').setValue('')
    expect(wrapper.get('[role="status"]').isVisible()).toBe(false)
    wrapper.unmount()
  })

  it('ignores a late response after the context changes and distinguishes failure from no results', async () => {
    vi.useFakeTimers()
    const { state, wrapper, items } = setup()
    let finish!: (items: APIReferenceItem[]) => void
    state.search.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    await wrapper.get('button').trigger('click')
    await wrapper.get('input').setValue('动画')
    await wrapper.get('form').trigger('submit')
    state.items = null
    await flushPromises()
    finish(items)
    await flushPromises()
    expect(wrapper.get('[role="status"]').isVisible()).toBe(false)
    state.search.mockRejectedValueOnce(new Error('offline'))
    state.items = items
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('Search failed. Try again.')
    state.search.mockResolvedValueOnce([])
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('No matching snippets')
    const ask = wrapper.findAll('button').find((button) => button.text() === 'Ask Copilot')!
    await ask.trigger('click')
    expect(state.askCopilot).toHaveBeenCalledWith('动画')
    wrapper.unmount()
  })

  it('shows no matches when the provider finishes loading an empty list', async () => {
    const { state, wrapper } = setup()
    state.items = null
    await wrapper.get('button').trigger('click')
    await wrapper.get('input').setValue('按键')
    expect(wrapper.get('[role="status"]').isVisible()).toBe(false)
    state.items = []
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('No matching snippets')
    expect(state.search).not.toHaveBeenCalled()
    const ask = wrapper.findAll('button').find((button) => button.text() === 'Ask Copilot')!
    await ask.trigger('click')
    expect(state.askCopilot).toHaveBeenCalledWith('按键')
    wrapper.unmount()
  })

  it('keeps the loading deadline across input changes and ignores a superseded request failure', async () => {
    vi.useFakeTimers()
    const { state, wrapper, items } = setup()
    let rejectPrevious!: (reason: Error) => void
    state.search.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectPrevious = reject
        })
    )
    await wrapper.get('button').trigger('click')
    await wrapper.get('input').setValue('first')
    await vi.advanceTimersByTimeAsync(200)
    expect(wrapper.get('[role="status"]').text()).toBe('Searching…')
    expect(state.search).not.toHaveBeenCalled()
    await wrapper.get('input').setValue('second')
    expect(wrapper.get('[role="status"]').text()).toBe('Searching…')
    await wrapper.get('form').trigger('submit')
    const previousSignal = state.search.mock.calls[0][2] as AbortSignal
    await wrapper.get('form').trigger('submit')
    expect(state.search).toHaveBeenCalledTimes(1)
    await wrapper.get('input').setValue('third')
    expect(previousSignal.aborted).toBe(true)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(state.search).toHaveBeenLastCalledWith(items, 'third', expect.any(AbortSignal))
    expect(wrapper.get('[role="status"]').text()).toBe('Matched 1 snippet')
    rejectPrevious(new Error('previous request failed late'))
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('Matched 1 snippet')
    wrapper.unmount()
  })

  it('keeps direct name matches available when the semantic service fails', async () => {
    const { state, wrapper } = setup()
    state.search.mockRejectedValueOnce(new Error('offline'))
    await wrapper.get('button').trigger('click')
    await wrapper.get('input').setValue('animate')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('Search failed. Try again.')
    expect(
      wrapper
        .findAll('li')
        .filter((item) => item.isVisible())
        .map((item) => item.text())
    ).toContain('animate name')
    wrapper.unmount()
  })
})
