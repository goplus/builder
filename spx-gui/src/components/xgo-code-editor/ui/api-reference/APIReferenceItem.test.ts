import { shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DefinitionKind, type DefinitionDocumentationItem, makeBasicMarkdownString } from '../../common'
import { CopilotExplainKind, builtInCommandCopilotExplain } from '../code-editor-ui'
import APIReferenceItem from './APIReferenceItem.vue'

const mocks = vi.hoisted(() => ({
  insertDefinition: vi.fn(),
  executeCommand: vi.fn(),
  resolveAction: vi.fn((action) => ({ ...action, title: '解释' }))
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

vi.mock('@/utils/i18n', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/i18n')>()),
  useI18n: () => ({ t: (message: { zh: string }) => message.zh })
}))

vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/exception')>()),
  useMessageHandle: (handler: () => unknown) => ({ fn: handler })
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
        UIDropdown: {
          name: 'UIDropdown',
          props: ['disabled'],
          template: '<div><slot name="trigger" /><slot v-if="!disabled" /></div>',
          methods: { setVisible: () => undefined }
        },
        DefinitionOverviewWrapper: { template: '<code><slot /></code>' }
      },
      directives: { radar: () => undefined }
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
    expect(wrapper.get('button').text()).toBe('解释')
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
})
