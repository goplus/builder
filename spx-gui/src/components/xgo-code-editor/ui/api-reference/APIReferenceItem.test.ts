import { shallowMount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { APIReferenceItem } from '.'
import APIReferenceItemComp from './APIReferenceItem.vue'

const { insertDefinition, doAction } = vi.hoisted(() => ({
  insertDefinition: vi.fn(),
  doAction: vi.fn((_action: unknown, fn: () => void) => fn())
}))
vi.mock('../../context', () => ({ useCodeEditor: () => ({ history: { doAction } }) }))
vi.mock('../CodeEditorUI.vue', () => ({
  useCodeEditorUICtx: () => ({
    ui: {
      insertDefinition,
      parseSnippet: () => ({ toString: () => 'say "Hi"', placeholders: [] })
    }
  })
}))
vi.mock('@/utils/exception', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useMessageHandle: (fn: () => void) => ({ fn })
}))

describe('API Reference insertion', () => {
  it('disables insertion and dragging while read-only, then restores insertion', async () => {
    const item = {
      definition: { package: 'spx', name: 'say', overloadId: '0' },
      insertSnippetParameterHints: []
    } as unknown as APIReferenceItem
    const wrapper = shallowMount(APIReferenceItemComp, {
      props: { item, interactionDisabled: false, disabled: true },
      global: {
        directives: { radar: {} },
        stubs: {
          UIDropdown: { name: 'UIDropdown', props: ['disabled'], template: '<div><slot name="trigger" /></div>' }
        }
      }
    })
    const trigger = wrapper.get('li')
    expect(trigger.attributes('draggable')).toBe('false')
    expect(trigger.attributes('aria-disabled')).toBe('true')
    await trigger.trigger('click')
    expect(doAction).not.toHaveBeenCalled()
    expect(insertDefinition).not.toHaveBeenCalled()
    await wrapper.setProps({ disabled: false })
    expect(trigger.attributes('draggable')).toBe('true')
    await trigger.trigger('click')
    expect(doAction).toHaveBeenCalledTimes(1)
    expect(insertDefinition).toHaveBeenCalledWith(item)
    await wrapper.setProps({ interactionDisabled: true })
    expect(wrapper.getComponent({ name: 'UIDropdown' }).props('disabled')).toBe(true)
    expect(trigger.attributes('draggable')).toBe('true')
    await trigger.trigger('click')
    expect(doAction).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
