import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, shallowReactive } from 'vue'
import { createI18n } from '@/utils/i18n'
import { createReadinessScope, ReadinessProvider } from '@/utils/readiness'
import * as utils from '@/utils/utils'
import type { APIReferenceController, APIReferenceItem } from '.'
import APIReferenceUI from './APIReferenceUI.vue'

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
      stubs: { APIReferenceItemComp: true, UIError: { template: '<div><slot /></div>' } }
    }
  })
  return { state, scope, wrapper }
}

afterEach(() => vi.restoreAllMocks())

describe('API Reference readiness', () => {
  it.each([0, 1])('finishes loading with %s items and no category metadata', async (count) => {
    const { wrapper, scope } = createHarness(createItems(count), false)
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(count)
    wrapper.unmount()
  })

  it('waits for the initial request, then finishes for an empty result', async () => {
    const { wrapper, state, scope } = createHarness(null)
    await nextTick()
    expect(scope.ready.value).toBe(false)
    state.items = []
    await nextTick()
    expect(scope.ready.value).toBe(true)
    wrapper.unmount()
  })

  it('shows loading errors without leaving readiness pending, and recovers', async () => {
    const { wrapper, state, scope } = createHarness(null)
    state.error = new Error('API loading failed')
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.text()).toContain('Failed to load data')
    state.error = null
    await nextTick()
    expect(scope.ready.value).toBe(false)
    state.items = createItems(1)
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(1)
    wrapper.unmount()
  })

  it('waits for deferred categories when remounted with an already loaded list', async () => {
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
    state.items = []
    await nextTick()
    expect(scope.ready.value).toBe(true)
    state.items = createItems(1)
    await nextTick()
    expect(scope.ready.value).toBe(true)
    expect(wrapper.findAllComponents({ name: 'APIReferenceItemComp' })).toHaveLength(1)
    wrapper.unmount()
  })
})
