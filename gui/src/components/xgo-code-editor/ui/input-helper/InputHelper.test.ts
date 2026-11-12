import { mount } from '@vue/test-utils'
import { defineComponent, h, markRaw, nextTick, ref, type PropType } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createI18n } from '@/utils/i18n'
import { providePopupReady } from '@/components/ui/utils'
import SpxKeyInput from '@/components/editor/spx-code-editor/ui/input-helper/SpxKeyInput.vue'
import SpxDirectionInput from '@/components/editor/spx-code-editor/ui/input-helper/SpxDirectionInput.vue'
import SpxColorInput, {
  getDefaultValue as getColor
} from '@/components/editor/spx-code-editor/ui/input-helper/spx-color-input/SpxColorInput.vue'
import { BuiltInInputType, InputKind, InputSlotKind, type Input } from '../../common'
import type { IInputHelperProvider, InputTypeHandler } from '.'
import InputHelper from './InputHelper.vue'
import StringInput from './StringInput.vue'
import IntegerInput from './IntegerInput.vue'
import DecimalInput from './DecimalInput.vue'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

function mountHelper(component: InputTypeHandler['component'], value: unknown, initiallyReady = false) {
  const ready = ref(initiallyReady)
  const helperProps = {
    slotKind: InputSlotKind.Value,
    accept: { type: BuiltInInputType.String },
    predefinedNames: ['score'],
    provider: {
      provideInputTypeHandler: () => ({
        component: markRaw(component),
        getTitle: () => ({ en: 'Value', zh: '值' }),
        getDefaultValue: () => value
      })
    } as unknown as IInputHelperProvider
  }
  const wrapper = mount(
    defineComponent({
      props: { input: { type: Object as PropType<Input>, required: true } },
      setup(props) {
        providePopupReady(ready)
        return () =>
          h('div', [
            h(InputHelper, { ...helperProps, input: props.input }),
            h('button', { 'data-test': 'focus-target' }, 'Other control')
          ])
      }
    }),
    {
      attachTo: document.body,
      props: { input: { kind: InputKind.InPlace, type: BuiltInInputType.String, value } },
      global: { plugins: [createI18n({ lang: 'en' })] }
    }
  )
  wrappers.push(wrapper)
  return { wrapper, ready }
}

describe('Input helper focus', () => {
  it.each([
    ['string', StringInput, 'hello'],
    ['integer', IntegerInput, 10],
    ['decimal', DecimalInput, 1.5],
    ['direction', SpxDirectionInput, 90],
    ['key capture', SpxKeyInput, 'KeySpace'],
    ['color hue', SpxColorInput, getColor()]
  ])('focuses %s only after the popup is ready', async (_, component, value) => {
    const { wrapper, ready } = mountHelper(component, value)
    const input = wrapper.get('input')
    const focus = vi.spyOn(input.element, 'focus')
    await nextTick()
    expect(focus).not.toHaveBeenCalled()
    ready.value = true
    await nextTick()
    expect(document.activeElement).toBe(input.element)
    expect(focus).toHaveBeenCalledOnce()
    const otherControl = wrapper.get<HTMLButtonElement>('[data-test="focus-target"]')
    otherControl.element.focus()
    expect(document.activeElement).toBe(otherControl.element)
    await wrapper.setProps({ input: { kind: InputKind.InPlace, type: BuiltInInputType.String, value } })
    expect(document.activeElement).toBe(otherControl.element)
    expect(focus).toHaveBeenCalledOnce()
  })

  it('focuses on a fresh mount and on returning from the variable tab', async () => {
    const { wrapper } = mountHelper(StringInput, 'hello', true)
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('input').element)
    await wrapper.getComponent({ name: 'UITabRadioGroup' }).vm.$emit('update:value', InputKind.Predefined)
    await nextTick()
    expect(wrapper.find('input').exists()).toBe(false)
    wrapper.getComponent({ name: 'UITabRadioGroup' }).vm.$emit('update:value', InputKind.InPlace)
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })
})
