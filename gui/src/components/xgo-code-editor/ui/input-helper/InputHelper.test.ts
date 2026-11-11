import { mount } from '@vue/test-utils'
import { defineComponent, h, markRaw, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import SpxKeyInput from '@/components/editor/spx-code-editor/ui/input-helper/SpxKeyInput.vue'
import SpxDirectionInput from '@/components/editor/spx-code-editor/ui/input-helper/SpxDirectionInput.vue'
import SpxColorInput, {
  getDefaultValue as getColor
} from '@/components/editor/spx-code-editor/ui/input-helper/spx-color-input/SpxColorInput.vue'
import { BuiltInInputType, InputKind, InputSlotKind } from '../../common'
import type { IInputHelperProvider, InputTypeHandler } from '.'
import InputHelper from './InputHelper.vue'
import StringInput from './StringInput.vue'
import IntegerInput from './IntegerInput.vue'
import DecimalInput from './DecimalInput.vue'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

function mountHelper(component: InputTypeHandler['component'], value: unknown, autofocus = false) {
  const wrapper = mount(InputHelper, {
    attachTo: document.body,
    props: {
      autofocus,
      slotKind: InputSlotKind.Value,
      accept: { type: BuiltInInputType.String },
      input: { kind: InputKind.InPlace, type: BuiltInInputType.String, value },
      predefinedNames: ['score'],
      provider: {
        provideInputTypeHandler: () => ({
          component: markRaw(component),
          getTitle: () => ({ en: 'Value', zh: '值' }),
          getDefaultValue: () => value
        })
      } as unknown as IInputHelperProvider
    },
    global: { plugins: [createI18n({ lang: 'en' })] }
  })
  wrappers.push(wrapper)
  return wrapper
}

describe('Input helper focus', () => {
  it.each([
    ['string', StringInput, 'hello'],
    ['integer', IntegerInput, 10],
    ['decimal', DecimalInput, 1.5],
    ['direction', SpxDirectionInput, 90],
    ['key capture', SpxKeyInput, 'KeySpace'],
    ['color hue', SpxColorInput, getColor()]
  ])('focuses %s only after the popup is positioned', async (_, component, value) => {
    const wrapper = mountHelper(component, value)
    const input = wrapper.get('input')
    const focus = vi.spyOn(input.element, 'focus')
    await nextTick()
    expect(focus).not.toHaveBeenCalled()
    await wrapper.setProps({ autofocus: true })
    expect(document.activeElement).toBe(input.element)
    expect(focus).toHaveBeenCalledOnce()
    // Value updates must not pull focus away from another field in the helper.
    const otherInput = wrapper.findAll('input')[1]
    otherInput?.element.focus()
    await wrapper.setProps({ input: { kind: InputKind.InPlace, type: BuiltInInputType.String, value } })
    expect(focus).toHaveBeenCalledOnce()
  })

  it('focuses on a fresh mount and on returning from the variable tab', async () => {
    const wrapper = mountHelper(StringInput, 'hello', true)
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('input').element)
    await wrapper.getComponent({ name: 'UITabRadioGroup' }).vm.$emit('update:value', InputKind.Predefined)
    await nextTick()
    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.getComponent({ name: 'UITabRadioGroup' }).vm.$emit('update:value', InputKind.InPlace)
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })

  it('leaves focus alone when the helper has no editable field', async () => {
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()
    const wrapper = mountHelper(defineComponent({ render: () => h('button', 'Choose') }), null)
    await wrapper.setProps({ autofocus: true })
    expect(document.activeElement).toBe(button)
    button.remove()
  })
})
