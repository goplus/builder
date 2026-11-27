import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, shallowReactive } from 'vue'
import { createI18n } from '@/utils/i18n'
import { Radar } from '@/utils/radar'
import * as utils from '@/utils/utils'
import { createAPIReferenceSearch } from '@/apis/api-reference'
import { UIMessageProvider } from '@/components/ui/message'
import { providePopupReady, provideRootContainer } from '@/components/ui/utils'
import { SpxAPIReferenceProvider } from '@/components/editor/spx-code-editor/api-reference'
import * as spxDefinitions from '@/components/editor/spx-code-editor/document-base'
import { APIWhitelist } from '@/components/tutorials/playground/api-whitelist'
import { getTextDocumentId, type Action } from '../../common'
import { parseDefinitionId, stringifyDefinitionId } from '../../definition-id'
import { DocumentBase } from '../../document-base'
import { builtInCommandCopilotAsk } from '../code-editor-ui'
import type { APICategoryViewInfo, APIReferenceContext, APIReferenceController, APIReferenceItem } from '.'
import APIReferenceUI from './APIReferenceUI.vue'

vi.mock('@/apis/api-reference', () => ({ createAPIReferenceSearch: vi.fn() }))
const { ui } = vi.hoisted(() => ({ ui: { resolveAction: vi.fn(), executeCommand: vi.fn() } }))
vi.mock('../CodeEditorUI.vue', () => ({ useCodeEditorUICtx: () => ({ ui }) }))

const { monitor } = spxDefinitions
const categoryViewInfos: APICategoryViewInfo[] = [
  {
    id: 'looks',
    label: { en: 'Looks', zh: '外观' },
    icon: '',
    subCategories: [{ id: 'animation', label: { en: 'Animation', zh: '动画' } }]
  }
]
const motionCategory: APICategoryViewInfo = {
  id: 'motion',
  label: { en: 'Motion', zh: '运动' },
  icon: '',
  subCategories: [{ id: 'default', label: { en: 'Movement', zh: '移动' } }]
}

const searchToggle = '[aria-label="Toggle api search"]'
const categoryToggle = '[aria-label="Api categories"]'

function setup(lang: 'en' | 'zh' = 'en', hasCopilotCommand = true) {
  ui.resolveAction
    .mockReset()
    .mockImplementation((action: Action) =>
      hasCopilotCommand ? { ...action, title: { en: 'Ask Copilot', zh: '问问 Copilot' } } : null
    )
  ui.executeCommand.mockReset()
  const items = Array.from({ length: 20 }, (_, i) => ({
    definition: { name: i === 0 ? 'animate' : `snippet${i}` },
    overview: i === 0 ? 'animate name' : `snippet ${i}`,
    categories: [['looks', 'animation']]
  })) as APIReferenceItem[]
  const state = shallowReactive({
    items: items as APIReferenceItem[] | null,
    error: null,
    categoryViewInfos: categoryViewInfos as APICategoryViewInfo[] | null,
    search: vi.fn(async (_items: APIReferenceItem[], _query: string, _signal: AbortSignal) => [items[0]])
  })
  const radar = new Radar()
  const popupReady = ref(true)
  const PopupContent = defineComponent({
    setup(_, { slots }) {
      providePopupReady(popupReady)
      return () => slots.default?.()
    }
  })
  const Harness = defineComponent({
    setup() {
      provideRootContainer(ref(document.body))
      return () =>
        h(UIMessageProvider, null, {
          default: () => h(APIReferenceUI, { controller: state as unknown as APIReferenceController })
        })
    }
  })
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: {
      plugins: [createI18n({ lang }), radar],
      stubs: {
        APIReferenceItemComp: {
          props: ['item'],
          template: `<li v-radar="{ name: 'api-reference', desc: '' }">{{ item.overview }}</li>`
        },
        APIReferenceSearchItem: {
          props: ['item'],
          template: `<li data-search-result="true" v-radar="{ name: 'api-reference', desc: '' }">{{ item.overview }}</li>`
        },
        UITooltip: { template: '<div><slot name="trigger" /></div>' },
        UIDropdown: {
          props: ['visible'],
          components: { PopupContent },
          template: '<div><slot name="trigger" /><PopupContent v-if="visible"><slot /></PopupContent></div>'
        },
        UIIcon: true
      }
    }
  })
  async function submitSearch(term: string) {
    await wrapper.get(searchToggle).trigger('click')
    await wrapper.get('input').setValue(term)
    await wrapper.get('form').trigger('submit')
  }

  return { state, wrapper, items, popupReady, radar, submitSearch }
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  vi.spyOn(utils, 'untilTaskScheduled').mockResolvedValue()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('API Reference search lifecycle', () => {
  it('debounces input, searches on Enter and clears back to browsing', async () => {
    vi.useFakeTimers()
    const { state, wrapper, items, radar } = setup()
    await wrapper.get(searchToggle).trigger('click')
    await wrapper.get('input').setValue('播放动画')
    await vi.advanceTimersByTimeAsync(299)
    expect(state.search).not.toHaveBeenCalled()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(state.search).toHaveBeenCalledWith(items, '播放动画', expect.any(AbortSignal))
    expect(radar.select('api-reference-search-status')?.getElement().textContent).toBe('Matched 1 snippet')
    expect(radar.selectAll('api-reference').map((node) => node.getElement().textContent)).toEqual(['animate name'])
    await wrapper.get('input').setValue('')
    expect(wrapper.get('[role="status"]').isVisible()).toBe(true)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(wrapper.get('[role="status"]').isVisible()).toBe(false)
    expect(radar.select('api-reference-search-status')).toBeNull()
    expect(radar.selectAll('api-reference')).toHaveLength(items.length)
    expect(state.search).toHaveBeenCalledTimes(1)
  })

  it('closes the search form on Escape from its input while the category menu is open', async () => {
    vi.useFakeTimers()
    const { wrapper, popupReady, state } = setup()
    state.search.mockImplementationOnce(() => new Promise(() => {}))
    popupReady.value = false
    const searchButton = wrapper.get(searchToggle)
    const categoryButton = wrapper.get(categoryToggle)
    await searchButton.trigger('click')
    const input = wrapper.get('input')
    await input.setValue('animate')
    await wrapper.get('form').trigger('submit')
    const signal = state.search.mock.calls[0][2]
    input.element.focus()
    await categoryButton.trigger('click')
    expect(categoryButton.attributes('aria-expanded')).toBe('true')

    await input.trigger('keydown', { key: 'Escape' })

    expect(signal.aborted).toBe(true)
    expect(wrapper.get('[role="status"]').isVisible()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
    expect(document.activeElement).toBe(searchButton.element)
  })

  it('refreshes the submitted search when candidates change and distinguishes errors from empty results', async () => {
    const { state, wrapper, items, submitSearch } = setup()
    let finish!: (items: APIReferenceItem[]) => void
    state.search.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    await submitSearch('动画')
    const signal = state.search.mock.calls[0][2]
    state.items = null
    await flushPromises()
    expect(signal.aborted).toBe(true)
    finish([items[0]])
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('Searching…')
    expect(state.search).toHaveBeenCalledTimes(1)

    const newItems = [monitor, ...items.slice(1)]
    state.search.mockRejectedValueOnce(new Error('offline'))
    state.items = newItems
    await flushPromises()
    expect(state.search).toHaveBeenLastCalledWith(newItems, '动画', expect.any(AbortSignal))
    expect(wrapper.get('[role="status"]').text()).toBe('Search failed. Try again.')

    await wrapper.get(categoryToggle).trigger('click')
    const category = wrapper.get('button[aria-pressed]')
    expect(category.text()).toBe('Looks')
    expect(category.attributes('disabled')).toBeDefined()
    expect(category.attributes('aria-description')).toBe('')

    state.search.mockResolvedValueOnce([])
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('No matching snippets')
    expect(category.text()).toMatch(/^Looks\s*0$/)
    expect(category.attributes('aria-description')).toBe('0 matching snippets')
    const ask = wrapper.findAll('button').find((button) => button.text() === 'Ask Copilot')!
    await ask.trigger('click')
    expect(ui.executeCommand).toHaveBeenCalledExactlyOnceWith(
      builtInCommandCopilotAsk,
      'I searched for “动画” in the API References panel but found no matches. Can you help me find the right API?'
    )
  })

  it('shows an error when the Ask Copilot command fails', async () => {
    const { state, wrapper, submitSearch } = setup()
    state.search.mockResolvedValueOnce([])
    ui.executeCommand.mockRejectedValueOnce(new Error('Copilot unavailable'))
    const report = vi.spyOn(console, 'error').mockImplementation(() => {})

    await submitSearch('animate')
    await flushPromises()
    await wrapper.get('[aria-label="Ask copilot about snippet search"]').trigger('click')
    await flushPromises()

    expect(document.body.textContent).toContain('Failed to ask Copilot')
    report.mockRestore()
  })

  it('cancels the wait for candidates when the search is cleared', async () => {
    vi.useFakeTimers()
    const { state, wrapper, items } = setup()
    await wrapper.get(searchToggle).trigger('click')
    state.items = null
    await wrapper.get('input').setValue('animate')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="status"]').text()).toBe('Searching…')
    expect(state.search).not.toHaveBeenCalled()

    await wrapper.get('input').setValue('')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(wrapper.get('[role="status"]').isVisible()).toBe(false)

    state.items = items
    await flushPromises()
    expect(state.search).not.toHaveBeenCalled()
  })

  it('returns to flat browsing and cancels search when the candidate count falls below 20', async () => {
    vi.useFakeTimers()
    const { state, wrapper, items, submitSearch } = setup()
    let finish!: (results: APIReferenceItem[]) => void
    state.search.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    await submitSearch('animate')
    const signal = state.search.mock.calls[0][2]

    state.items = items.slice(0, 19)
    await flushPromises()
    expect(signal.aborted).toBe(true)
    finish([items[0]])
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(state.search).toHaveBeenCalledTimes(1)
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('button[aria-expanded]').exists()).toBe(false)
    expect(wrapper.find('h5').exists()).toBe(false)
    expect(wrapper.findAll('li')).toHaveLength(19)

    state.items = items
    await flushPromises()
    expect(wrapper.findAll('button[aria-expanded]')).toHaveLength(2)
    expect(wrapper.find('h5').exists()).toBe(true)
    await wrapper.get(searchToggle).trigger('click')
    expect(wrapper.get('input').element.value).toBe('')
  })

  it('shows no matches with no action when the command is unavailable', async () => {
    const { state, wrapper, submitSearch } = setup('en', false)
    state.search.mockResolvedValueOnce([])
    await submitSearch('按键')
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('No matching snippets')
    expect(wrapper.findAll('button').some((button) => button.text() === 'Ask Copilot')).toBe(false)
  })

  it('starts loading when the debounced term is submitted and ignores a superseded failure', async () => {
    vi.useFakeTimers()
    const { state, wrapper, items, submitSearch } = setup()
    let rejectPrevious!: (reason: Error) => void
    state.search.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          rejectPrevious = reject
        })
    )
    await submitSearch('first')
    expect(wrapper.get('[role="status"]').text()).toBe('Searching…')
    const previousSignal = state.search.mock.calls[0][2] as AbortSignal
    await wrapper.get('form').trigger('submit')
    expect(state.search).toHaveBeenCalledTimes(1)
    let finishCurrent!: (results: APIReferenceItem[]) => void
    state.search.mockImplementationOnce(() => new Promise((resolve) => (finishCurrent = resolve)))
    await wrapper.get('input').setValue('second')
    expect(previousSignal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(300)
    expect(previousSignal.aborted).toBe(true)
    expect(wrapper.get('[role="status"]').text()).toBe('Searching…')
    finishCurrent([items[0]])
    await flushPromises()
    expect(state.search).toHaveBeenLastCalledWith(items, 'second', expect.any(AbortSignal))
    expect(wrapper.get('[role="status"]').text()).toBe('Matched 1 snippet')
    rejectPrevious(new Error('previous request failed late'))
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toBe('Matched 1 snippet')
  })

  it('lists uncategorized matches under a heading after grouped matches', async () => {
    const { state, wrapper, items, submitSearch } = setup()
    state.items = [monitor, ...items]
    state.search.mockResolvedValueOnce([monitor, items[0]])

    await submitSearch('animation and monitor')
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe('Matched 2 snippets')
    const results = wrapper.findAll('[data-search-result="true"]')
    expect(results.map((item) => item.text())).toEqual(['animate name', 'Monitor'])
    expect(results[1].element.closest('section')?.querySelector('h5')?.textContent).toBe('Uncategorized')
  })

  it('supports search when metadata is available but no snippets fall under its categories', async () => {
    const { state, wrapper, items, submitSearch } = setup()
    state.items = items.map((item) => ({ ...item, categories: [] }))
    state.search.mockResolvedValueOnce([state.items[0]])
    await flushPromises()

    expect(wrapper.get('h5').text()).toBe('Uncategorized')
    const controls = wrapper.findAll('button[aria-expanded]')
    expect(controls).toHaveLength(1)
    await submitSearch('animate')
    await flushPromises()

    const result = wrapper.get('[data-search-result="true"]')
    expect(result.text()).toBe('animate name')
    expect(result.element.closest('section')?.querySelector('h5')?.textContent).toBe('Uncategorized')
  })

  it('focuses the current category when the popup is ready and returns focus to the toggle after navigating', async () => {
    const { wrapper, popupReady } = setup()
    await flushPromises()
    const group = wrapper.get('[data-category-id="looks"]').element
    const scrollTo = vi.fn()
    Object.defineProperty(group.parentElement, 'scrollTo', { value: scrollTo })

    const toggle = wrapper.get<HTMLButtonElement>(categoryToggle)
    popupReady.value = false
    toggle.element.focus()
    await toggle.trigger('click')
    await flushPromises()
    const category = wrapper.get('button[aria-pressed="true"]')
    expect(document.activeElement).toBe(toggle.element)
    popupReady.value = true
    await flushPromises()
    expect(document.activeElement).toBe(category.element)
    await category.trigger('click')
    await flushPromises()

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle.element)
  })

  it('enables category navigation with result counts when the search completes', async () => {
    const { state, wrapper, items, submitSearch } = setup()
    let finish!: (results: APIReferenceItem[]) => void
    state.search.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    await flushPromises()

    await submitSearch('animate')
    await wrapper.get(categoryToggle).trigger('click')
    await flushPromises()

    const category = wrapper.get('button[aria-pressed]')
    expect(category.text()).toBe('Looks')
    expect(category.attributes('disabled')).toBeDefined()
    finish([items[0]])
    await flushPromises()
    expect(category.text()).toMatch(/^Looks\s*1$/)
    expect(category.attributes('disabled')).toBeUndefined()
    const scrollTo = vi.fn()
    const resultsGroup = wrapper.get('[aria-busy="false"] [data-category-id="looks"]')
    const resultsList = resultsGroup.element.parentElement
    Object.defineProperty(resultsList, 'scrollTo', { value: scrollTo })
    await category.trigger('click')
    await flushPromises()
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('highlights the last category at the bottom even if it cannot reach the top of the list', async () => {
    const { state, wrapper, items } = setup()
    state.items = [...items.slice(0, -1), { ...items[items.length - 1], categories: [['motion', 'default']] }]
    state.categoryViewInfos = [...categoryViewInfos, motionCategory]
    await flushPromises()
    await wrapper.get(categoryToggle).trigger('click')
    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe('Looks')

    const lastCategory = wrapper.get('[data-category-id="motion"]').element
    const list = lastCategory.parentElement!
    Object.defineProperty(lastCategory, 'offsetTop', { value: 180 })
    Object.defineProperties(list, {
      clientHeight: { value: 100 },
      scrollHeight: { value: 200 },
      scrollTop: { value: 100 }
    })
    list.dispatchEvent(new Event('scroll'))
    await flushPromises()

    expect(wrapper.get('button[aria-pressed="true"]').text()).toBe('Motion')
  })

  it('shows shared snippets in all browsing categories but only their first matching search category', async () => {
    const { state, wrapper, items, submitSearch } = setup()
    const shared = {
      ...items[0],
      categories: [
        ['missing', 'default'],
        ['motion', 'default'],
        ['looks', 'animation'],
        ['looks', 'animation']
      ]
    } satisfies APIReferenceItem
    state.items = [shared, ...items.slice(1)]
    state.categoryViewInfos = [...categoryViewInfos, motionCategory]
    state.search.mockResolvedValueOnce([shared])
    await flushPromises()

    for (const id of ['looks', 'motion']) {
      const entries = wrapper.get(`[data-category-id="${id}"]`).findAll('ul > li')
      expect(entries.filter((entry) => entry.text() === 'animate name')).toHaveLength(1)
    }

    await submitSearch('animate')
    await flushPromises()

    const results = wrapper.findAll('[data-search-result="true"]')
    expect(results).toHaveLength(1)
    expect(results[0].element.closest('[data-category-id]')?.getAttribute('data-category-id')).toBe('motion')
  })

  it('keeps completed results when only the browsing categories change', async () => {
    const { state, wrapper, submitSearch } = setup()
    await submitSearch('animate')
    await flushPromises()

    const getResult = () => wrapper.get('[data-search-result="true"]').element
    expect(getResult().closest('[data-category-id]')?.getAttribute('data-category-id')).toBe('looks')

    state.categoryViewInfos = []
    await flushPromises()

    expect(getResult().closest('[data-category-id]')?.getAttribute('data-category-id')).toBe('looks')
    expect(state.search).toHaveBeenCalledTimes(1)
  })

  it('uses the latest categories when an in-flight search completes', async () => {
    const { state, wrapper, items, submitSearch } = setup()
    let finish!: (results: APIReferenceItem[]) => void
    state.search.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
    await submitSearch('animate')
    const signal = state.search.mock.calls[0][2]

    state.categoryViewInfos = []
    await flushPromises()
    expect(signal.aborted).toBe(false)
    finish([items[0]])
    await flushPromises()

    const result = wrapper.get('[data-search-result="true"]').element
    expect(result.closest('section')?.querySelector('h5')?.textContent).toBe('Uncategorized')
    expect(state.search).toHaveBeenCalledTimes(1)
  })

  it('shows Monitor in the last browsing section and in search for a real SPX course whitelist', async () => {
    const documentBase = new DocumentBase(Object.values(spxDefinitions))
    const ctx = {
      textDocument: { id: getTextDocumentId('Sprite.spx') },
      signal: new AbortController().signal
    } as APIReferenceContext
    const defaultItems = await new SpxAPIReferenceProvider(documentBase).provideAPIReference(ctx)
    const monitorId = stringifyDefinitionId(monitor.definition)
    expect(defaultItems.some((item) => stringifyDefinitionId(item.definition) === monitorId)).toBe(false)
    const whitelist = new APIWhitelist()
    whitelist.set([monitorId, ...defaultItems.slice(0, 19).map((item) => stringifyDefinitionId(item.definition))])
    const provider = new SpxAPIReferenceProvider(documentBase, whitelist.apis!.map(parseDefinitionId))
    const courseItems = await provider.provideAPIReference(ctx)
    expect(courseItems).toHaveLength(20)

    const { state, wrapper, submitSearch } = setup('zh')
    state.items = courseItems
    state.categoryViewInfos = provider.provideCategoryViewInfos()
    state.search.mockImplementation(provider.searchAPIReference.bind(provider))
    vi.mocked(createAPIReferenceSearch).mockImplementationOnce(async ({ candidates }) => ({
      scores: candidates.map((text) => (text.startsWith('API: Monitor\n') ? 0.95 : 0))
    }))
    await flushPromises()

    const headings = wrapper.findAll('h5')
    expect(headings.length).toBeGreaterThan(1)
    const lastHeading = headings.at(-1)!
    expect(lastHeading.text()).toBe('未分类')
    expect(lastHeading.element.parentElement?.querySelector('li')?.textContent).toBe('Monitor')

    await submitSearch('Monitor')
    await flushPromises()

    expect(createAPIReferenceSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Monitor',
        candidates: expect.arrayContaining([expect.stringContaining('API: Monitor\n')])
      }),
      expect.any(AbortSignal)
    )
    expect(wrapper.get('[role="status"]').text()).toBe('匹配到 1 个代码片段')
    expect(wrapper.findAll('[data-search-result="true"]').map((item) => item.text())).toEqual(['Monitor'])
  })
})
