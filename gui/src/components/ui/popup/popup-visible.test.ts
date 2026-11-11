import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import UITextInput from '../input/UITextInput.vue'
import UINumberInput from '../input/UINumberInput.vue'
import { providePopupVisible, usePopupVisible } from '../utils'
import PopupVisibilityProvider from './PopupVisibilityProvider.vue'

describe('Popup visibility and autofocus', () => {
  it('defaults to visible outside a popup', () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          const visible = usePopupVisible()
          return () => h('span', String(visible.value))
        }
      })
    )
    expect(wrapper.text()).toBe('true')
    wrapper.unmount()
  })

  it('requires both the enclosing popup and nested popup to be visible', async () => {
    const outer = ref(false)
    const inner = ref(true)
    const Probe = defineComponent({
      setup() {
        const visible = usePopupVisible()
        return () => h('span', String(visible.value))
      }
    })
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            PopupVisibilityProvider,
            { visible: outer.value },
            {
              default: () =>
                h(
                  PopupVisibilityProvider,
                  { visible: inner.value },
                  {
                    default: () => h(Probe)
                  }
                )
            }
          )
      })
    )
    expect(wrapper.text()).toBe('false')
    outer.value = true
    await nextTick()
    expect(wrapper.text()).toBe('true')
    inner.value = false
    await nextTick()
    expect(wrapper.text()).toBe('false')
    wrapper.unmount()
  })

  it.each([
    ['text', UITextInput, 'hello'],
    ['number', UINumberInput, 10]
  ] as const)('keeps %s autofocus working outside popups', async (_, component, value) => {
    const wrapper = mount(component as any, { props: { autofocus: true, value }, attachTo: document.body })
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('input').element)
    wrapper.unmount()
  })

  it.each([
    ['text', UITextInput, 'hello'],
    ['number', UINumberInput, 10]
  ] as const)(
    'does not focus %s when autofocus is enabled until the popup is shown again',
    async (_, component, value) => {
      const visible = ref(true)
      const autofocus = ref(false)
      const wrapper = mount(
        defineComponent({
          setup() {
            providePopupVisible(visible)
            return () => h(component as any, { autofocus: autofocus.value, value })
          }
        }),
        { attachTo: document.body }
      )
      const input = wrapper.get('input')
      await nextTick()
      expect(document.activeElement).not.toBe(input.element)
      autofocus.value = true
      await nextTick()
      expect(document.activeElement).not.toBe(input.element)
      visible.value = false
      await nextTick()
      visible.value = true
      await nextTick()
      expect(document.activeElement).toBe(input.element)
      wrapper.unmount()
    }
  )

  it.each([
    ['text', UITextInput, 'hello'],
    ['number', UINumberInput, 10]
  ] as const)('waits for visibility before %s autofocus and refocuses on reopening', async (_, component, value) => {
    const visible = ref(false)
    const autofocus = ref(true)
    const wrapper = mount(
      defineComponent({
        setup() {
          providePopupVisible(visible)
          return () => h(component as any, { autofocus: autofocus.value, value })
        }
      }),
      { attachTo: document.body }
    )
    await nextTick()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    visible.value = true
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('input').element)
    visible.value = false
    ;(document.activeElement as HTMLElement).blur()
    await nextTick()
    visible.value = true
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('input').element)
    autofocus.value = false
    ;(document.activeElement as HTMLElement).blur()
    visible.value = false
    await nextTick()
    visible.value = true
    await nextTick()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    wrapper.unmount()
  })
})
