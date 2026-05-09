import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  UI_LAYER_ROOT_ATTR,
  provideLayerStack,
  provideModalContainer,
  usePopupContainer,
  useProvideLastClickEvent
} from '../utils'
import UIModal from './UIModal.vue'

async function flushModal() {
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

function findVNodeByAttr(node: unknown, attr: string): { props?: Record<string, unknown> } | null {
  if (node == null) return null
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findVNodeByAttr(child, attr)
      if (match != null) return match
    }
    return null
  }

  if (typeof node !== 'object') return null

  const vnode = node as {
    props?: Record<string, unknown>
    children?: unknown
    component?: { subTree?: unknown }
  }
  if (vnode.props != null && attr in vnode.props) return vnode

  return findVNodeByAttr(vnode.children, attr) ?? findVNodeByAttr(vnode.component?.subTree, attr)
}

const mountedWrappers: VueWrapper[] = []

const ModalTestProvider = defineComponent({
  setup(_, { slots }) {
    const modalContainer = ref<HTMLElement>()
    provideModalContainer(modalContainer)
    provideLayerStack()
    useProvideLastClickEvent()
    return () => h('div', { ref: modalContainer, 'data-test-id': 'modal-container' }, slots.default?.())
  }
})

function mountWithModalProvider(component: ReturnType<typeof defineComponent>) {
  const wrapper = mount(component, {
    attachTo: document.body,
    global: {
      stubs: {
        transition: false
      },
      directives: {
        radar: () => undefined
      }
    }
  })
  mountedWrappers.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of mountedWrappers.splice(0)) {
    wrapper.unmount()
  }
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('UIModal', () => {
  describe('rendering', () => {
    it('renders a teleported modal surface with the expected accessibility and size attributes', async () => {
      let popupContainerRef: Ref<HTMLElement | undefined> | null = null
      const PopupContainerConsumer = defineComponent({
        setup() {
          popupContainerRef = usePopupContainer()
          return () => null
        }
      })

      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            return () =>
              h(ModalTestProvider, null, {
                default: () =>
                  h(
                    UIModal,
                    {
                      visible: true,
                      size: 'large'
                    },
                    { default: () => [h(PopupContainerConsumer), h('button', { 'data-test-id': 'inside' }, 'Inside')] }
                  )
              })
          }
        })
      )

      await flushModal()

      const modalRoot = getLatestElement(`[${UI_LAYER_ROOT_ATTR}]`) as HTMLElement
      const surface = getLatestElement('.ui-modal-surface') as HTMLElement
      expect(modalRoot).toBeTruthy()
      expect(surface).toBeTruthy()
      expect(modalRoot).toBe(surface)
      expect(surface.getAttribute('role')).toBe('dialog')
      expect(surface.getAttribute('aria-modal')).toBe('true')
      expect(surface.className).toContain('w-[960px]')
      expect(wrapper.find('[data-test-id="inside"]').exists()).toBe(true)
      if (popupContainerRef == null) throw new Error('Expected popup container ref')
      expect((popupContainerRef as Ref<HTMLElement | undefined>).value).toBe(surface)
    })
  })

  describe('attrs and interaction', () => {
    it('applies explicit class prop with tailwind merging and forwards other attrs to the modal surface', async () => {
      mountWithModalProvider(
        defineComponent({
          setup() {
            return () =>
              h(ModalTestProvider, null, {
                default: () =>
                  h(
                    UIModal,
                    {
                      visible: true,
                      class: 'external-modal-class w-[720px]',
                      style: { pointerEvents: 'auto' },
                      'data-test-id': 'external-modal-root'
                    },
                    { default: () => h('div', 'Content') }
                  )
              })
          }
        })
      )

      await flushModal()

      const modalSurface = getLatestElement('.ui-modal-surface') as HTMLElement
      const modalRoot = getLatestElement(`[${UI_LAYER_ROOT_ATTR}]`) as HTMLElement

      expect(modalSurface.dataset.testId).toBe('external-modal-root')
      expect(modalSurface.className).toContain('external-modal-class')
      expect(modalSurface.className).toContain('w-[720px]')
      expect(modalSurface.className).not.toContain('w-[640px]')
      expect(modalSurface.style.pointerEvents).toBe('auto')
      expect(modalRoot).toBe(modalSurface)
    })

    it('keeps modal root attrs on the surface while closing from the backdrop', async () => {
      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            return () =>
              h(ModalTestProvider, null, {
                default: () =>
                  h(
                    UIModal,
                    {
                      visible: true
                    },
                    { default: () => h('button', { 'data-test-id': 'inside' }, 'Inside') }
                  )
              })
          }
        })
      )

      await flushModal()

      const modal = wrapper.findComponent(UIModal)
      const surface = getLatestElement('.ui-modal-surface') as HTMLElement
      const backdrop = getLatestElement('.bg-overlay-modal') as HTMLElement | null
      const rootVNode = findVNodeByAttr((modal.vm as { $?: { subTree?: unknown } }).$?.subTree, UI_LAYER_ROOT_ATTR)

      expect(backdrop).toBeTruthy()

      await new DOMWrapper(surface).trigger('click')
      await flushModal()
      expect(modal.emitted('update:visible')).toBeUndefined()
      expect(getLatestElement(`[${UI_LAYER_ROOT_ATTR}]`)).toBe(surface)

      expect(rootVNode?.props).toMatchObject({
        [UI_LAYER_ROOT_ATTR]: '',
        class: expect.stringContaining('ui-modal-surface')
      })
      await new DOMWrapper(backdrop!).trigger('click')
      await flushModal()
      expect(modal.emitted('update:visible')).toEqual([[false]])
    })

    it('closes on Escape when the key event originates from inside the modal', async () => {
      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            return () =>
              h(ModalTestProvider, null, {
                default: () =>
                  h(
                    UIModal,
                    {
                      visible: true
                    },
                    { default: () => h('button', { 'data-test-id': 'inside' }, 'Inside') }
                  )
              })
          }
        })
      )

      await flushModal()

      const modal = wrapper.findComponent(UIModal)
      ;(getLatestElement('[data-test-id="inside"]') as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
      await flushModal()

      expect(modal.emitted('update:visible')).toEqual([[false]])
    })

    it('ignores Escape when the key event originates outside the modal subtree', async () => {
      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            return () =>
              h(ModalTestProvider, null, {
                default: () => [
                  h(
                    UIModal,
                    {
                      visible: true
                    },
                    { default: () => h('button', { 'data-test-id': 'inside' }, 'Inside') }
                  ),
                  h('button', { 'data-test-id': 'outside' }, 'Outside')
                ]
              })
          }
        })
      )

      await flushModal()

      const modal = wrapper.findComponent(UIModal)
      ;(wrapper.get('[data-test-id="outside"]').element as HTMLElement).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
      await flushModal()

      expect(modal.emitted('update:visible')).toBeUndefined()
    })

    it('only closes the topmost modal on Escape from document.body', async () => {
      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            const firstVisible = ref(true)
            const secondVisible = ref(false)
            return { firstVisible, secondVisible }
          },
          render() {
            return h(ModalTestProvider, null, {
              default: () => [
                h(UIModal, { visible: this.firstVisible }, { default: () => h('div', 'First') }),
                h(UIModal, { visible: this.secondVisible }, { default: () => h('div', 'Second') })
              ]
            })
          }
        })
      )

      await flushModal()
      ;(wrapper.vm as unknown as { secondVisible: boolean }).secondVisible = true
      await flushModal()

      const [firstModal, secondModal] = wrapper.findAllComponents(UIModal)
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await flushModal()

      expect(firstModal?.emitted('update:visible')).toBeUndefined()
      expect(secondModal?.emitted('update:visible')).toEqual([[false]])
    })
  })

  describe('animation', () => {
    it('applies click-based transform origin and supports imperative overrides', async () => {
      vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('ui-modal-surface') ? 10 : 0
      })
      vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('ui-modal-surface') ? 20 : 0
      })

      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            const visible = ref(false)
            const modalRef = ref<InstanceType<typeof UIModal> | null>(null)
            return { visible, modalRef }
          },
          render() {
            return h(ModalTestProvider, null, {
              default: () =>
                h(
                  UIModal,
                  {
                    ref: 'modalRef',
                    visible: this.visible,
                    autoFocus: false,
                    'onUpdate:visible': (nextVisible: boolean) => (this.visible = nextVisible)
                  },
                  { default: () => h('div', 'Content') }
                )
            })
          }
        })
      )

      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 90 }))
      ;(wrapper.vm as unknown as { visible: boolean }).visible = true
      await flushModal()

      const surface = getLatestElement('.ui-modal-surface') as HTMLElement

      expect(surface.style.transformOrigin).toBe('var(--ui-modal-transform-origin, center)')
      expect(surface.style.getPropertyValue('--ui-modal-transform-origin')).toBe('40px 70px')
      ;(wrapper.vm as unknown as { modalRef: InstanceType<typeof UIModal> | null }).modalRef?.setTransformOrigin({
        x: 80,
        y: 120
      })
      await flushModal()
      expect(surface.style.getPropertyValue('--ui-modal-transform-origin')).toBe('70px 100px')
    })
  })

  describe('focus management', () => {
    it('focuses the first focusable element when autoFocus is enabled', async () => {
      const wrapper = mountWithModalProvider(
        defineComponent({
          setup() {
            const visible = ref(false)
            return { visible }
          },
          render() {
            return h(ModalTestProvider, null, {
              default: () =>
                h(
                  UIModal,
                  {
                    visible: this.visible,
                    'onUpdate:visible': (nextVisible: boolean) => (this.visible = nextVisible)
                  },
                  {
                    default: () => [
                      h('button', { disabled: true, 'data-test-id': 'disabled' }, 'Disabled'),
                      h('div', { tabindex: -1, 'data-test-id': 'ignored' }, 'Ignored'),
                      h('button', { 'data-test-id': 'first-focusable' }, 'First focusable')
                    ]
                  }
                )
            })
          }
        })
      )

      ;(wrapper.vm as unknown as { visible: boolean }).visible = true
      await flushModal()

      const surface = getLatestElement('.ui-modal-surface') as HTMLElement
      const firstFocusable = getLatestElement('[data-test-id="first-focusable"]') as HTMLElement

      expect(surface.getAttribute('tabindex')).toBe('-1')
      expect(surface.tabIndex).toBe(-1)
      expect(document.activeElement).toBe(firstFocusable)
    })
  })
})
