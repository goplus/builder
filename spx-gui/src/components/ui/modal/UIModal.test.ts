import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { provideModalContainer, useProvideLastClickEvent } from '../utils'
import UIModal from './UIModal.vue'
import { provideModalStack } from './stack'

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
    provideModalStack()
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
                    { default: () => h('button', { 'data-test-id': 'inside' }, 'Inside') }
                  )
              })
          }
        })
      )

      await flushModal()

      const modalRoot = getLatestElement('[data-ui-modal-root]') as HTMLElement
      const surface = getLatestElement('.ui-modal-surface') as HTMLElement
      expect(modalRoot).toBeTruthy()
      expect(surface).toBeTruthy()
      expect(modalRoot).toBe(surface)
      expect(surface.getAttribute('role')).toBe('dialog')
      expect(surface.getAttribute('aria-modal')).toBe('true')
      expect(surface.className).toContain('w-[960px]')
      expect(wrapper.find('[data-test-id="inside"]').exists()).toBe(true)
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
      const modalRoot = getLatestElement('[data-ui-modal-root]') as HTMLElement

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
      const backdrop = getLatestElement('.ui-modal') as HTMLElement
      const rootVNode = findVNodeByAttr((modal.vm as { $?: { subTree?: unknown } }).$?.subTree, 'data-ui-modal-root')

      await new DOMWrapper(surface).trigger('click')
      await flushModal()
      expect(modal.emitted('update:visible')).toBeUndefined()
      expect(getLatestElement('[data-ui-modal-root]')).toBe(surface)

      expect(rootVNode?.props).toMatchObject({
        'data-ui-modal-root': '',
        class: expect.stringContaining('ui-modal-surface')
      })
      await new DOMWrapper(backdrop).trigger('click')
      await flushModal()
      expect(modal.emitted('update:visible')).toEqual([[false]])
    })
  })

  describe('animation', () => {
    it('applies click-based transform origin and supports imperative overrides', async () => {
      const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains('ui-modal-surface')) {
          return {
            x: 10,
            y: 20,
            left: 10,
            top: 20,
            right: 110,
            bottom: 120,
            width: 100,
            height: 100,
            toJSON: () => ({})
          } as DOMRect
        }
        return originalGetBoundingClientRect.call(this)
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

      expect(surface.style.transformOrigin).toBe('40px 70px')
      ;(wrapper.vm as unknown as { modalRef: InstanceType<typeof UIModal> | null }).modalRef?.setTransformOrigin({
        x: 80,
        y: 120
      })
      await flushModal()
      expect(surface.style.transformOrigin).toBe('70px 100px')
    })
  })

  describe('focus management', () => {
    it('renders the modal surface as focusable when autoFocus is enabled', async () => {
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
                  { default: () => h('div', 'Content') }
                )
            })
          }
        })
      )

      ;(wrapper.vm as unknown as { visible: boolean }).visible = true
      await flushModal()

      const surface = getLatestElement('.ui-modal-surface') as HTMLElement

      expect(surface.getAttribute('tabindex')).toBe('-1')
      expect(surface.tabIndex).toBe(-1)
      expect(typeof surface.focus).toBe('function')
    })
  })
})
