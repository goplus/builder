import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Component } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import { provideLayerStack, provideModalContainer, useProvideLastClickEvent } from '../utils'
import UIModal from './UIModal.vue'
import UIDrawer from './UIDrawer.vue'

const mountedWrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

async function mountDialog(component: Component, maskClosable = true) {
  const Provider = defineComponent({
    setup() {
      const container = ref<HTMLElement>()
      provideModalContainer(container)
      provideLayerStack()
      useProvideLastClickEvent()
      return () =>
        h('div', { ref: container }, [
          h(
            component,
            { visible: true, title: 'Dialog', maskClosable },
            { default: () => h('textarea', 'Select text') }
          )
        ])
    }
  })
  const wrapper = mount(Provider, {
    attachTo: document.body,
    global: { stubs: { transition: false }, directives: { radar: () => undefined } }
  })
  mountedWrappers.push(wrapper)
  await nextTick()
  await nextTick()
  const input = new DOMWrapper(document.querySelector('textarea')!)
  const surface = new DOMWrapper(document.querySelector('[role="dialog"]')!)
  // This is the common ancestor of the surface and the outside release target.
  const mask = new DOMWrapper(surface.element.parentElement!)
  return { dialog: wrapper.findComponent(component), input, surface, mask }
}

async function gesture(start: DOMWrapper<Element>, end: DOMWrapper<Element>, click: DOMWrapper<Element>) {
  await start.trigger('pointerdown', { button: 0 })
  await end.trigger('pointerup', { button: 0 })
  await click.trigger('click', { button: 0 })
}

describe.each([
  { name: 'UIModal', component: UIModal },
  { name: 'UIDrawer', component: UIDrawer }
])('$name mask gestures', ({ component }) => {
  it('keeps the dialog open when text selection ends outside, then accepts a fresh backdrop click', async () => {
    const { dialog, input, mask } = await mountDialog(component)
    await gesture(input, mask, mask)
    expect(dialog.emitted('update:visible')).toBeUndefined()

    await gesture(mask, mask, mask)
    expect(dialog.emitted('update:visible')).toEqual([[false]])
  })

  it('keeps the dialog open when a gesture starts outside and ends inside', async () => {
    const { dialog, input, mask } = await mountDialog(component)
    await gesture(mask, input, mask)
    expect(dialog.emitted('update:visible')).toBeUndefined()
  })

  it('keeps the dialog open for selection completed inside', async () => {
    const { dialog, input, surface } = await mountDialog(component)
    await gesture(input, surface, surface)
    expect(dialog.emitted('update:visible')).toBeUndefined()
  })

  it('does not dismiss from a cancelled pointer gesture', async () => {
    const { dialog, mask } = await mountDialog(component)
    await mask.trigger('pointerdown')
    await mask.trigger('pointercancel')
    await mask.trigger('click')
    expect(dialog.emitted('update:visible')).toBeUndefined()
  })

  it('respects maskClosable for a complete backdrop click', async () => {
    const { dialog, mask } = await mountDialog(component, false)
    await gesture(mask, mask, mask)
    expect(dialog.emitted('update:visible')).toBeUndefined()
  })
})
