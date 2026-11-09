import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import {
  UI_LAYER_ROOT_ATTR,
  provideLayerStack,
  provideModalContainer,
  usePopupContainer,
  useProvideLastClickEvent
} from '../utils'
import UIDrawer from './UIDrawer.vue'
import UIModal from './UIModal.vue'
import UIModalClose from './UIModalClose.vue'

async function flushDrawer() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

function getLatestElement(selector: string) {
  const elements = document.body.querySelectorAll(selector)
  return elements.item(elements.length - 1) as HTMLElement | null
}

const mountedWrappers: VueWrapper[] = []

const DrawerTestProvider = defineComponent({
  setup(_, { slots }) {
    const modalContainer = ref<HTMLElement>()
    provideModalContainer(modalContainer)
    provideLayerStack()
    useProvideLastClickEvent()
    return () => h('div', { ref: modalContainer }, slots.default?.())
  }
})

function mountInProvider(render: () => ReturnType<typeof h> | ReturnType<typeof h>[]) {
  const wrapper = mount(
    defineComponent({
      setup() {
        return () => h(DrawerTestProvider, null, { default: render })
      }
    }),
    {
      attachTo: document.body,
      global: {
        stubs: { transition: false },
        directives: { radar: () => undefined }
      }
    }
  )
  mountedWrappers.push(wrapper)
  return wrapper
}

function pressEscapeOn(target: EventTarget) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
}

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) wrapper.unmount()
  document.body.innerHTML = ''
})

describe('UIDrawer', () => {
  it('renders a teleported dialog surface with its title, body and size', async () => {
    let popupContainerRef: Ref<HTMLElement | undefined> | null = null
    const PopupContainerConsumer = defineComponent({
      setup() {
        popupContainerRef = usePopupContainer()
        return () => null
      }
    })

    mountInProvider(() =>
      h(
        UIDrawer,
        { visible: true, title: 'Edit course', size: 'large' },
        { default: () => [h(PopupContainerConsumer), h('p', { 'data-test-id': 'body' }, 'Body')] }
      )
    )
    await flushDrawer()

    const surface = getLatestElement('.ui-drawer-surface') as HTMLElement
    expect(getLatestElement(`[${UI_LAYER_ROOT_ATTR}]`)).toBe(surface)
    expect(surface.getAttribute('role')).toBe('dialog')
    expect(surface.getAttribute('aria-modal')).toBe('true')
    expect(surface.className).toContain('w-[720px]')
    expect(surface.textContent).toContain('Edit course')
    expect(surface.querySelector('[data-test-id="body"]')).not.toBeNull()
    expect((popupContainerRef as Ref<HTMLElement | undefined> | null)?.value).toBe(surface)
  })

  it('renders the footer only when one is given', async () => {
    mountInProvider(() =>
      h(UIDrawer, { visible: true, title: 'Without footer', 'data-test-id': 'plain' }, { default: () => 'Body' })
    )
    mountInProvider(() =>
      h(
        UIDrawer,
        { visible: true, title: 'With footer', 'data-test-id': 'with-footer' },
        { default: () => 'Body', footer: () => h('button', { 'data-test-id': 'save' }, 'Save') }
      )
    )
    await flushDrawer()

    const plain = getLatestElement('[data-test-id="plain"]') as HTMLElement
    const withFooter = getLatestElement('[data-test-id="with-footer"]') as HTMLElement
    // The footer is set off from the body by a divider of its own.
    expect(plain.querySelectorAll('[role="separator"]')).toHaveLength(1)
    expect(withFooter.querySelectorAll('[role="separator"]')).toHaveLength(2)
    expect(withFooter.querySelector('[data-test-id="save"]')).not.toBeNull()
  })

  it('closes from its close button and backdrop, but not from a click inside', async () => {
    const wrapper = mountInProvider(() => h(UIDrawer, { visible: true, title: 'Drawer' }, { default: () => 'Body' }))
    await flushDrawer()
    const drawer = wrapper.findComponent(UIDrawer)

    await new DOMWrapper(getLatestElement('.ui-drawer-surface')!).trigger('click')
    expect(drawer.emitted('update:visible')).toBeUndefined()

    await new DOMWrapper(getLatestElement('.bg-overlay-modal')!).trigger('click')
    await drawer.findComponent(UIModalClose).trigger('click')
    expect(drawer.emitted('update:visible')).toEqual([[false], [false]])
  })

  it('stays open on a backdrop click when the mask is not closable', async () => {
    const wrapper = mountInProvider(() =>
      h(UIDrawer, { visible: true, title: 'Drawer', maskClosable: false }, { default: () => 'Body' })
    )
    await flushDrawer()

    await new DOMWrapper(getLatestElement('.bg-overlay-modal')!).trigger('click')
    expect(wrapper.findComponent(UIDrawer).emitted('update:visible')).toBeUndefined()
  })

  it('focuses the first focusable element inside when opened', async () => {
    mountInProvider(() =>
      h(UIDrawer, { visible: true, title: 'Drawer' }, { default: () => h('input', { 'data-test-id': 'first-input' }) })
    )
    await flushDrawer()

    expect(document.activeElement).toBe(getLatestElement('[data-test-id="first-input"]'))
  })

  it('closes on Escape, leaving it to a dialog opened above it first', async () => {
    // As a confirm dialog does, the modal opens over a drawer that is already open.
    const modalVisible = ref(false)
    const wrapper = mountInProvider(() => [
      h(UIDrawer, { visible: true, title: 'Drawer' }, { default: () => h('button', { 'data-test-id': 'in-drawer' }) }),
      h(
        UIModal,
        { visible: modalVisible.value, 'onUpdate:visible': (v: boolean) => (modalVisible.value = v) },
        { default: () => h('button', { 'data-test-id': 'in-modal' }) }
      )
    ])
    await flushDrawer()
    modalVisible.value = true
    await flushDrawer()
    const drawer = wrapper.findComponent(UIDrawer)

    pressEscapeOn(document.body)
    await flushDrawer()
    expect(modalVisible.value).toBe(false)
    expect(drawer.emitted('update:visible')).toBeUndefined()

    pressEscapeOn(getLatestElement('[data-test-id="in-drawer"]')!)
    await flushDrawer()
    expect(drawer.emitted('update:visible')).toEqual([[false]])
  })
})
