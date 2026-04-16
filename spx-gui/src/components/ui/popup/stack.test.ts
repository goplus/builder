import { createApp, defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  createPopupStack,
  findPopupRoot,
  getPopupRootAttrs,
  providePopupStack,
  usePopupRegistration,
  type PopupRegistration
} from './stack'

describe('popup stack', () => {
  it('tracks the topmost open popup by registration order', () => {
    const stack = createPopupStack()
    const dropdown = stack.register({ open: ref(true) })
    const tooltipOpen = ref(false)
    const tooltip = stack.register({ open: tooltipOpen })

    expect(stack.getTopmostOpenEntry()?.id).toBe(dropdown.id)
    expect(dropdown.isTopmost.value).toBe(true)
    expect(tooltip.isTopmost.value).toBe(false)

    tooltipOpen.value = true

    expect(stack.getTopmostOpenEntry()?.id).toBe(tooltip.id)
    expect(dropdown.isTopmost.value).toBe(false)
    expect(tooltip.isTopmost.value).toBe(true)

    tooltip.unregister()

    expect(stack.getTopmostOpenEntry()?.id).toBe(dropdown.id)
    expect(dropdown.isTopmost.value).toBe(true)
  })

  it('registers popup entries through context and unregisters on scope dispose', () => {
    const host = document.createElement('div')
    let registration: PopupRegistration | null = null

    const PopupProvider = defineComponent({
      setup(_, { slots }) {
        providePopupStack()
        return () => slots.default?.()
      }
    })

    const Root = defineComponent({
      setup() {
        registration = usePopupRegistration(ref(true))
        return () => null
      }
    })

    const app = createApp({
      render() {
        return h(PopupProvider, null, {
          default: () => h(Root)
        })
      }
    })
    app.mount(host)

    expect(registration).not.toBe(null)
    const popupRegistration = registration!
    expect(popupRegistration.isTopmost.value).toBe(true)

    app.unmount()
    expect(popupRegistration.unregister).toBeTypeOf('function')
  })

  it('finds popup roots using internal popup data attributes', () => {
    const popupRoot = document.createElement('div')
    const attrs = getPopupRootAttrs(7)
    for (const [name, value] of Object.entries(attrs)) {
      popupRoot.setAttribute(name, value)
    }
    const child = document.createElement('span')
    const text = document.createTextNode('nested')
    popupRoot.appendChild(child)
    child.appendChild(text)

    expect(findPopupRoot(child)).toBe(popupRoot)
    expect(findPopupRoot(text)).toBe(popupRoot)
  })
})
