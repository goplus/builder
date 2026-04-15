import { createApp, defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  createModalStack,
  findModalRoot,
  getModalRootAttrs,
  provideModalStack,
  useModalRegistration,
  type ModalRegistration
} from './stack'

describe('modal stack', () => {
  it('tracks the topmost open modal by registration order', () => {
    const stack = createModalStack()
    const firstOpen = ref(true)
    const secondOpen = ref(false)
    const firstModal = stack.register(firstOpen)
    const secondModal = stack.register(secondOpen)

    expect(stack.getTopmostOpenEntry()?.id).toBe(firstModal.id)
    expect(firstModal.isTopmost.value).toBe(true)
    expect(secondModal.isTopmost.value).toBe(false)

    secondOpen.value = true

    expect(stack.getTopmostOpenEntry()?.id).toBe(secondModal.id)
    expect(firstModal.isTopmost.value).toBe(false)
    expect(secondModal.isTopmost.value).toBe(true)
  })

  it('registers modal entries through context and unregisters on scope dispose', () => {
    const host = document.createElement('div')
    let registration: ModalRegistration | null = null

    const Provider = defineComponent({
      setup(_, { slots }) {
        provideModalStack()
        return () => slots.default?.()
      }
    })

    const Root = defineComponent({
      setup() {
        registration = useModalRegistration(ref(true))
        return () => null
      }
    })

    const app = createApp({
      render() {
        return h(Provider, null, { default: () => h(Root) })
      }
    })
    app.mount(host)

    expect(registration).not.toBe(null)
    const modalRegistration = registration!
    expect(modalRegistration.isTopmost.value).toBe(true)

    app.unmount()
    expect(modalRegistration.unregister).toBeTypeOf('function')
  })

  it('finds modal roots using internal modal data attributes', () => {
    const modalRoot = document.createElement('div')
    const attrs = getModalRootAttrs(7)
    for (const [name, value] of Object.entries(attrs)) {
      modalRoot.setAttribute(name, value)
    }
    const child = document.createElement('span')
    const text = document.createTextNode('nested')
    modalRoot.appendChild(child)
    child.appendChild(text)

    expect(findModalRoot(child)).toBe(modalRoot)
    expect(findModalRoot(text)).toBe(modalRoot)
  })
})
