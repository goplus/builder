import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type VNode } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import UIConfigProvider from '../UIConfigProvider.vue'
import UITextInput from '../input/UITextInput.vue'
import { providePopupReady } from '../utils'
import UIModal from './UIModal.vue'
import UIDrawer from './UIDrawer.vue'
import { useDialogAutoFocus } from './dialog'

const ControlledTransition = defineComponent({
  name: 'ControlledTransition',
  inheritAttrs: false,
  emits: ['before-enter', 'after-enter'],
  setup:
    (_, { slots }) =>
    () =>
      slots.default?.()
})

const wrappers: VueWrapper[] = []
afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

async function flushDialog() {
  await nextTick()
  await nextTick()
}

async function mountDialog(
  component: typeof UIModal | typeof UIDrawer,
  content: () => VNode[],
  initiallyAutoFocus = true
) {
  const autoFocus = ref(initiallyAutoFocus)
  const visible = ref(false)
  const parentReady = ref(true)
  const wrapper = mount(
    defineComponent({
      setup() {
        providePopupReady(parentReady)
        return () =>
          h(UIConfigProvider, null, {
            default: () =>
              h(
                component as any,
                { visible: visible.value, autoFocus: autoFocus.value, title: 'Test drawer' },
                {
                  default: content
                }
              )
          })
      }
    }),
    {
      attachTo: document.body,
      global: { stubs: { transition: ControlledTransition }, directives: { radar: () => {} } }
    }
  )
  wrappers.push(wrapper)
  await flushDialog()
  const transition = wrapper.getComponent(ControlledTransition)
  const startEnter = async () => {
    transition.vm.$emit('before-enter')
    visible.value = true
    await flushDialog()
  }
  const finishEnter = async () => {
    transition.vm.$emit('after-enter')
    await flushDialog()
  }
  return { wrapper, visible, autoFocus, parentReady, startEnter, finishEnter }
}

describe.each([
  ['Modal', UIModal],
  ['Drawer', UIDrawer]
] as const)('%s readiness', (_, component) => {
  it('waits for enter completion and gives explicit input autofocus priority over the first button', async () => {
    const { wrapper, visible, startEnter, finishEnter } = await mountDialog(component, () => [
      h('button', { 'data-test': 'first' }, 'First'),
      h(UITextInput, { value: '', autofocus: true })
    ])
    for (let opening = 0; opening < 2; opening++) {
      await startEnter()
      const input = wrapper.get('input')
      const first = wrapper.get<HTMLButtonElement>('button[data-test="first"]')
      const focusFirst = vi.spyOn(first.element, 'focus')
      expect(document.activeElement).not.toBe(input.element)
      expect(focusFirst).not.toHaveBeenCalled()
      await finishEnter()
      expect(document.activeElement).toBe(input.element)
      expect(focusFirst).not.toHaveBeenCalled()
      visible.value = false
      await flushDialog()
    }
  })

  it('runs the default focus fallback only after entering', async () => {
    const { wrapper, startEnter, finishEnter } = await mountDialog(component, () => [h('input')])
    await startEnter()
    const input = wrapper.get('input')
    expect(document.activeElement).not.toBe(input.element)
    await finishEnter()
    expect(document.activeElement).toBe(input.element)
  })

  it('checks dynamic autoFocus only on the next opening', async () => {
    const { wrapper, visible, autoFocus, startEnter, finishEnter } = await mountDialog(
      component,
      () => [h('input')],
      false
    )
    await startEnter()
    await finishEnter()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    autoFocus.value = true
    await flushDialog()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    visible.value = false
    await flushDialog()
    await startEnter()
    await finishEnter()
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })

  it('uses the latest autoFocus setting when entering finishes', async () => {
    const { wrapper, autoFocus, startEnter, finishEnter } = await mountDialog(component, () => [h('input')])
    await startEnter()
    autoFocus.value = false
    await finishEnter()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
  })

  it('allows explicit input autofocus when the dialog fallback is disabled', async () => {
    const { wrapper, startEnter, finishEnter } = await mountDialog(
      component,
      () => [h(UITextInput, { value: '', autofocus: true })],
      false
    )
    await startEnter()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    await finishEnter()
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })

  it('does not focus a dialog closed before its enter completes', async () => {
    const { wrapper, visible, startEnter, finishEnter } = await mountDialog(component, () => [
      h(UITextInput, { value: '', autofocus: true })
    ])
    await startEnter()
    const input = wrapper.get('input')
    const focus = vi.spyOn(input.element, 'focus')
    visible.value = false
    await flushDialog()
    await finishEnter()
    expect(focus).not.toHaveBeenCalled()
  })

  it('waits for its ancestor to be ready before either autofocus path runs', async () => {
    const { wrapper, parentReady, startEnter, finishEnter } = await mountDialog(component, () => [
      h('button', 'First'),
      h(UITextInput, { value: '', autofocus: true })
    ])
    parentReady.value = false
    await startEnter()
    const input = wrapper.get('input')
    await finishEnter()
    expect(document.activeElement).not.toBe(input.element)
    parentReady.value = true
    await flushDialog()
    expect(document.activeElement).toBe(input.element)
  })

  it('preserves user focus established while the dialog was entering', async () => {
    const { wrapper, startEnter, finishEnter } = await mountDialog(component, () => [h('button', 'First'), h('input')])
    await startEnter()
    const input = wrapper.get('input')
    input.element.focus()
    await finishEnter()
    expect(document.activeElement).toBe(input.element)
  })
})

describe('Dialog autofocus sources', () => {
  it('accepts a readiness getter and an autofocus ref without watching the autofocus ref', async () => {
    const ready = ref(true)
    const autoFocus = ref(false)
    const wrapper = mount(
      defineComponent({
        setup() {
          const surface = ref<HTMLElement>()
          useDialogAutoFocus(surface, () => ready.value, autoFocus)
          return () => h('div', { ref: surface }, [h('input')])
        }
      }),
      { attachTo: document.body }
    )
    wrappers.push(wrapper)
    await flushDialog()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    autoFocus.value = true
    await flushDialog()
    expect(document.activeElement).not.toBe(wrapper.get('input').element)
    ready.value = false
    await flushDialog()
    ready.value = true
    await flushDialog()
    expect(document.activeElement).toBe(wrapper.get('input').element)
  })
})
