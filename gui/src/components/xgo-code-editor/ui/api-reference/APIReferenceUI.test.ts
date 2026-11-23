import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, shallowReactive } from 'vue'
import { createI18n } from '@/utils/i18n'
import { createReadinessScope, ReadinessProvider } from '@/utils/readiness'
import * as utils from '@/utils/utils'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceUI from './APIReferenceUI.vue'

vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: () => ({ ui: {} }) }))

function createItems(count: number): APIReferenceItem[] {
  return Array.from(
    { length: count },
    (_, i) =>
      ({
        definition: { package: 'spx', name: `say${i}` },
        categories: [[i % 2 === 0 ? 'motion' : 'looks', 'default']]
      }) as APIReferenceItem
  )
}

function createHarness(items: APIReferenceItem[] | null, categorized = true) {
  const state = shallowReactive({
    items,
    error: null as unknown,
    categoryViewInfos: categorized
      ? ['motion', 'looks'].map((id) => ({ id, label: id, icon: '', subCategories: [{ id: 'default', label: id }] }))
      : null
  })
  const scope = createReadinessScope()
  const wrapper = mount(ReadinessProvider, {
    props: { scope },
    slots: { default: () => h(APIReferenceUI, { controller: state as unknown as APIReferenceController }) },
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: {} },
      stubs: {
        UITooltip: { template: '<div><slot name="trigger" /></div>' },
        UIDropdown: { template: '<div><slot name="trigger" /></div>' },
        APIReferenceItemComp: true,
        APIReferenceSearchResults: true,
        UIError: { template: '<div><slot /></div>' }
      }
    }
  })
  return { state, scope, wrapper }
}

enableAutoUnmount(afterEach)
afterEach(() => vi.restoreAllMocks())

describe('API Reference readiness', () => {
  it('shows a flat list without category metadata even at the categorization threshold', async () => {
    const { wrapper, scope } = createHarness(createItems(20), false)
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(20)
    expect(wrapper.find('button[aria-expanded]').exists()).toBe(false)
  })

  it('waits for the initial request, then finishes for an empty result', async () => {
    const { state, scope } = createHarness(null)
    await nextTick()
    expect(scope.ready.value).toBe(false)
    state.items = []
    await nextTick()
    expect(scope.ready.value).toBe(true)
  })

  it('keeps the header visible during loading errors and recovers without leaving readiness pending', async () => {
    const { wrapper, state, scope } = createHarness(null)
    state.error = new Error('API loading failed')
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.get('h4').text()).toBe('Code snippets')
    expect(wrapper.text()).toContain('Failed to load data')
    state.error = null
    await nextTick()
    expect(scope.ready.value).toBe(false)
    state.items = createItems(1)
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(1)
  })

  it('shows a load error below the categorized header and restores the list after recovery', async () => {
    vi.spyOn(utils, 'untilTaskScheduled').mockResolvedValue()
    const { wrapper, state } = createHarness(createItems(20))
    await flushPromises()

    state.items = null
    state.error = new Error('API loading failed')
    await nextTick()
    expect(wrapper.get('h4').text()).toBe('Code snippets')
    expect(wrapper.findAll('button[aria-expanded]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Failed to load data')
    expect(wrapper.findAll('h5')).toHaveLength(0)

    state.error = null
    state.items = createItems(20)
    await nextTick()
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(20)
  })

  it('renders a single category without deferring readiness', async () => {
    const schedule = vi.spyOn(utils, 'untilTaskScheduled').mockResolvedValue()
    const items = createItems(20).map(
      (item) => ({ ...item, categories: [['motion', 'default']] }) satisfies APIReferenceItem
    )
    const { wrapper, scope } = createHarness(items)
    await nextTick()

    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(20)
    expect(scope.ready.value).toBe(true)
    expect(schedule).not.toHaveBeenCalled()
  })

  it('waits for deferred categories when mounted with an already loaded list', async () => {
    let finishRendering!: () => void
    vi.spyOn(utils, 'untilTaskScheduled').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishRendering = resolve
        })
    )
    const { wrapper, scope, state } = createHarness(createItems(20))
    await nextTick()
    expect(scope.ready.value).toBe(false)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(10)
    finishRendering()
    await flushPromises()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(20)
    state.items = null
    await nextTick()
    expect(scope.ready.value).toBe(false)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(20)
    state.items = []
    await nextTick()
    expect(scope.ready.value).toBe(true)
    state.items = createItems(1)
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(1)
  })

  it('switches to flat browsing when a provider no longer supplies categories', async () => {
    vi.spyOn(utils, 'untilTaskScheduled').mockResolvedValue()
    const { wrapper, state, scope } = createHarness(createItems(20))
    await flushPromises()
    expect(wrapper.findAll('h5')).toHaveLength(2)
    state.categoryViewInfos = null
    await nextTick()
    expect(wrapper.findAll('h5')).toHaveLength(0)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(20)
    expect(scope.ready.value).toBe(true)
  })
})
