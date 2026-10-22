import { flushPromises, shallowMount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DefinitionKind, type DefinitionDocumentationItem, makeBasicMarkdownString } from '../../common'
import { CopilotExplainKind, builtInCommandCopilotExplain } from '../code-editor-ui'
import APIReferenceActions from './APIReferenceActions.vue'
import APIReferenceItem from './APIReferenceItem.vue'

const mocks = vi.hoisted(() => ({
  insertDefinition: vi.fn(),
  executeCommand: vi.fn(),
  resolveAction: vi.fn((action) => ({ ...action, title: '解释', commandInfo: { icon: 'explain' } }))
}))

vi.mock('../../context', () => ({
  useCodeEditor: () => ({ history: { doAction: (_action: unknown, handler: () => unknown) => handler() } })
}))

vi.mock('../CodeEditorUI.vue', () => ({
  useCodeEditorUICtx: () => ({
    ui: {
      ...mocks,
      parseSnippet: (snippet: string) => ({ toString: () => snippet, placeholders: [] })
    }
  })
}))

vi.mock('@/utils/dom', () => ({ useContentSize: () => ref(null) }))

vi.mock('@/utils/i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/i18n')>()),
  useI18n: () => ({ t: (message: { zh: string }) => message.zh })
}))

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (handler: () => unknown) => ({ fn: handler })
}))

vi.mock('@/utils/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/utils')>()),
  untilTaskScheduled: () => Promise.resolve()
}))

function mountItem(showDescription: boolean) {
  const item: DefinitionDocumentationItem = {
    categories: [['look', 'animation']],
    definition: { name: 'Sprite.animate', overloadId: '0' },
    kind: DefinitionKind.Command,
    insertSnippet: 'animate "idle"',
    overview: 'animate name',
    detail: makeBasicMarkdownString({ en: 'Play animation with given name', zh: '播放动画（指定名字）' })
  }
  const wrapper = shallowMount(APIReferenceItem, {
    props: { item, showDescription, interactionDisabled: false },
    global: {
      stubs: {
        APIReferenceActions: false,
        UITooltip: { props: ['disabled'], template: '<span><slot name="trigger" /></span>' },
        UIDropdown: {
          name: 'UIDropdown',
          props: ['disabled', 'visible'],
          template: '<div><slot name="trigger" /><slot v-if="!disabled" /></div>',
          methods: { setVisible: () => undefined }
        },
        HoverCard: { name: 'HoverCard', props: ['actions'], template: '<div><slot /><slot name="actions" /></div>' },
        DefinitionOverviewWrapper: { template: '<code><slot /></code>' }
      },
      directives: { radar: (el, { value }) => el.setAttribute('aria-label', value.name) }
    }
  })
  return { wrapper, item }
}

describe('APIReferenceItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the hover card in category browsing', () => {
    const { wrapper } = mountItem(false)
    expect(wrapper.findComponent({ name: 'UIDropdown' }).props('disabled')).toBe(false)
    expect(wrapper.findComponent({ name: 'HoverCard' }).exists()).toBe(true)
    expect(wrapper.find('p').exists()).toBe(false)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('shows one inline description and an explain action without a hover card in search results', () => {
    const { wrapper } = mountItem(true)
    expect(wrapper.findComponent({ name: 'UIDropdown' }).props('disabled')).toBe(true)
    expect(wrapper.findComponent({ name: 'HoverCard' }).exists()).toBe(false)
    expect(wrapper.get('p').text()).toBe('播放动画（指定名字）')
    expect(wrapper.get('button').attributes('aria-label')).toBe('解释')
  })

  it('explains the selected API without inserting code or starting row dragging', async () => {
    const { wrapper, item } = mountItem(true)
    const button = wrapper.get('button')
    await button.trigger('mousedown')
    expect(wrapper.get('li').classes()).not.toContain('before-dragging')
    await button.trigger('mouseup')
    await button.trigger('click')
    expect(mocks.executeCommand).toHaveBeenCalledExactlyOnceWith(builtInCommandCopilotExplain, {
      kind: CopilotExplainKind.Definition,
      overview: item.overview,
      definition: item.definition
    })
    expect(mocks.insertDefinition).not.toHaveBeenCalled()
  })

  it('prevents the explain button from starting native dragging of the result row', () => {
    const { wrapper } = mountItem(true)
    const dataTransfer = { setData: vi.fn() }
    const dragStart = Object.assign(new Event('dragstart', { bubbles: true, cancelable: true }), { dataTransfer })
    const dragSource = wrapper.get('button').element.closest('[draggable="true"]')!
    dragSource.dispatchEvent(dragStart)
    expect(dragStart.defaultPrevented).toBe(true)
    expect(dataTransfer.setData).not.toHaveBeenCalled()
  })

  it('still inserts search results when clicking the code', async () => {
    const { wrapper, item } = mountItem(true)
    await wrapper.get('code').trigger('click')
    expect(mocks.insertDefinition).toHaveBeenCalledExactlyOnceWith(item)
    expect(mocks.executeCommand).not.toHaveBeenCalled()
  })

  it('shares the available actions between category details and search results', () => {
    const category = mountItem(false).wrapper
    const search = mountItem(true).wrapper
    expect(category.getComponent(APIReferenceActions).props('actions')).toEqual(
      search.getComponent(APIReferenceActions).props('actions')
    )
    expect(category.getComponent({ name: 'HoverCard' }).props('actions')).toEqual(
      category.getComponent(APIReferenceActions).props('actions')
    )
  })

  it('keeps category details open while the action menu is used, and closes on outside dismissal', async () => {
    const { wrapper } = mountItem(false)
    const dropdown = wrapper.getComponent({ name: 'UIDropdown' })
    dropdown.vm.$emit('update:visible', true)
    const actions = wrapper.getComponent(APIReferenceActions)
    actions.vm.$emit('menuVisibleChange', true)
    dropdown.vm.$emit('update:visible', false)
    await wrapper.vm.$nextTick()
    expect(dropdown.props('visible')).toBe(true)
    actions.vm.$emit('menuVisibleChange', false)
    actions.vm.$emit('dismiss')
    await wrapper.vm.$nextTick()
    expect(dropdown.props('visible')).toBe(false)
  })

  it('closes controlled category details when scrolling disables interaction', async () => {
    const { wrapper } = mountItem(false)
    const dropdown = wrapper.getComponent({ name: 'UIDropdown' })
    dropdown.vm.$emit('update:visible', true)
    await wrapper.setProps({ interactionDisabled: true })
    expect(dropdown.props('visible')).toBe(false)
  })

  it.each([true, false])(
    'releases category details after the menu closes unless pointer or focus remains inside: %s',
    async (remainsInside) => {
      const { wrapper } = mountItem(false)
      const dropdown = wrapper.getComponent({ name: 'UIDropdown' })
      const card = wrapper.getComponent({ name: 'HoverCard' })
      vi.spyOn(card.element, 'matches').mockReturnValue(remainsInside)
      const actions = wrapper.getComponent(APIReferenceActions)
      dropdown.vm.$emit('update:visible', true)
      actions.vm.$emit('menuVisibleChange', true)
      dropdown.vm.$emit('update:visible', false)
      await wrapper.vm.$nextTick()
      expect(dropdown.props('visible')).toBe(true)
      actions.vm.$emit('menuVisibleChange', false)
      await flushPromises()
      expect(dropdown.props('visible')).toBe(remainsInside)
    }
  )

  it('closes category details when focus leaves after returning from the menu', async () => {
    const { wrapper } = mountItem(false)
    const dropdown = wrapper.getComponent({ name: 'UIDropdown' })
    const card = wrapper.getComponent({ name: 'HoverCard' })
    const matches = vi.spyOn(card.element, 'matches').mockReturnValue(true)
    const actions = wrapper.getComponent(APIReferenceActions)
    dropdown.vm.$emit('update:visible', true)
    actions.vm.$emit('menuVisibleChange', true)
    actions.vm.$emit('menuVisibleChange', false)
    await flushPromises()
    expect(dropdown.props('visible')).toBe(true)
    matches.mockReturnValue(false)
    await card.trigger('focusout')
    await flushPromises()
    expect(dropdown.props('visible')).toBe(false)
  })

  it('keeps category details open if the menu reopens before the delayed close check', async () => {
    const { wrapper } = mountItem(false)
    const dropdown = wrapper.getComponent({ name: 'UIDropdown' })
    const actions = wrapper.getComponent(APIReferenceActions)
    dropdown.vm.$emit('update:visible', true)
    actions.vm.$emit('menuVisibleChange', true)
    actions.vm.$emit('menuVisibleChange', false)
    actions.vm.$emit('menuVisibleChange', true)
    await flushPromises()
    expect(dropdown.props('visible')).toBe(true)
  })
})
