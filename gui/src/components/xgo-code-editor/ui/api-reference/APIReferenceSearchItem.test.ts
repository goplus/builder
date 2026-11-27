import { shallowMount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import { computed, defineComponent, provide } from 'vue'
import { createI18n } from '@/utils/i18n'
import { dropdownCtrlKey } from '@/components/ui/UIDropdown.vue'
import { getDdiDragData, type Action } from '../../common'
import { builtInCommandCopilotExplain, CopilotExplainKind } from '../code-editor-ui'
import type { APIReferenceItem } from '.'
import APIReferenceSearchItem from './APIReferenceSearchItem.vue'
import * as itemComposable from './use-api-reference-item'

const { executeCommand, insertDefinition, doAction, resolveAction } = vi.hoisted(() => ({
  executeCommand: vi.fn(),
  insertDefinition: vi.fn(),
  doAction: vi.fn((_action: unknown, fn: () => void) => fn()),
  resolveAction: vi.fn<(action: Action) => object | null>((action) => ({
    ...action,
    title: action.title ?? { en: 'Explain', zh: '解释' },
    commandInfo: { icon: 'explain' }
  }))
}))
vi.mock('../../context', () => ({ useCodeEditor: () => ({ history: { doAction } }) }))
vi.mock('../CodeEditorUI.vue', () => ({
  useCodeEditorUICtx: () => ({
    ui: {
      executeCommand,
      resolveAction,
      insertDefinition,
      parseSnippet: () => ({ toString: () => 'say "Hi"', placeholders: [] })
    }
  })
}))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessageHandle: (fn: () => void) => ({ fn })
}))

function mountSearchItem(item: APIReferenceItem) {
  return shallowMount(APIReferenceSearchItem, {
    props: { item },
    global: {
      plugins: [createI18n({ lang: 'en' })],
      directives: { radar: (el, { value }) => el.setAttribute('aria-label', value.label ?? value.name) },
      stubs: {
        MoreActions: false,
        UIDropdownWithTooltip: false,
        APIReferenceItemRow: false,
        UIMenu: false,
        UIMenuGroup: false,
        UIMenuItem: false,
        UIDropdown: defineComponent({
          props: { visible: Boolean },
          emits: ['update:visible'],
          setup(_, { emit }) {
            provide(dropdownCtrlKey, { setVisible: (visible) => emit('update:visible', visible) })
          },
          template:
            '<div><div @click="$emit(\'update:visible\', !visible)"><slot name="trigger" /></div><slot v-if="visible" /></div>'
        }),
        UITooltip: { template: '<div><slot name="trigger" /></div>' }
      }
    }
  })
}

it('runs the search row action without inserting the snippet', async () => {
  doAction.mockClear()
  const item = {
    definition: { package: 'spx', name: 'say' },
    overview: 'say message',
    detail: { value: 'Display a message using `say`.' }
  } as unknown as APIReferenceItem
  const wrapper = mountSearchItem(item)
  expect(wrapper.find('[aria-label="More actions"]').exists()).toBe(false)
  expect(wrapper.get('li p').text()).toBe('Display a message using say.')
  await wrapper.get('li button').trigger('click')
  expect(executeCommand).toHaveBeenCalledExactlyOnceWith(builtInCommandCopilotExplain, {
    kind: CopilotExplainKind.Definition,
    overview: 'say message',
    definition: item.definition
  })
  expect(doAction).not.toHaveBeenCalled()
  await wrapper.get('li').trigger('click')
  expect(doAction).toHaveBeenCalledTimes(1)
  expect(insertDefinition).toHaveBeenLastCalledWith(item)
  const dragData = new Map<string, string>()
  const dataTransfer = {
    setData: (format: string, value: string) => {
      dragData.set(format, value)
    },
    getData: (format: string) => dragData.get(format) ?? ''
  } as DataTransfer
  await wrapper.get('li').trigger('dragstart', { dataTransfer })
  expect(getDdiDragData(dataTransfer)).toEqual(item)
  wrapper.unmount()
})

it('shows the first available action inline and runs the remaining actions from the menu', async () => {
  executeCommand.mockClear()
  doAction.mockClear()
  const actions: Action[] = [
    { command: 'test.unavailable', arguments: [] },
    { command: 'test.explain', title: { en: 'Explain', zh: '解释' }, arguments: [] },
    { command: 'test.example', title: { en: 'Show example', zh: '查看示例' }, arguments: ['say'] },
    { command: 'test.copy', title: { en: 'Copy', zh: '复制' }, arguments: ['say'] }
  ]
  resolveAction.mockReturnValueOnce(null)
  const useAPIReferenceItem = vi.spyOn(itemComposable, 'useAPIReferenceItem').mockReturnValueOnce({
    actions: computed(() => actions),
    snippetPreview: computed(() => ({ overview: 'say message', inlayHints: '[]' }))
  })
  const item = {
    definition: { package: 'spx', name: 'say' },
    detail: { value: 'Display a message.' }
  } as APIReferenceItem
  const wrapper = mountSearchItem(item)
  try {
    const inlineAction = wrapper.get('[aria-label="Explain"]')
    expect(wrapper.findAll('li button:not([aria-expanded])')).toHaveLength(1)
    await inlineAction.trigger('click')
    expect(executeCommand).toHaveBeenCalledExactlyOnceWith('test.explain')

    const more = wrapper.get('[aria-label="More actions"]')
    expect(more.attributes('aria-expanded')).toBe('false')
    await more.trigger('click')
    expect(more.attributes('aria-expanded')).toBe('true')
    const menu = wrapper.get('[aria-label="Actions"]')
    expect(menu.findAll('.ui-menu-item').map((item) => item.text())).toEqual(['Show example', 'Copy'])
    await menu.get('[aria-label="Copy"]').trigger('click')
    expect(executeCommand).toHaveBeenLastCalledWith('test.copy', 'say')
    expect(doAction).not.toHaveBeenCalled()
    expect(wrapper.find('[aria-label="Actions"]').exists()).toBe(false)
    expect(more.attributes('aria-expanded')).toBe('false')
  } finally {
    wrapper.unmount()
    useAPIReferenceItem.mockRestore()
  }
})
