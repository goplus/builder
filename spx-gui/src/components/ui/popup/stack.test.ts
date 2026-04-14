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
    const dropdown = stack.register({ kind: 'dropdown', parentId: null, open: ref(true) })
    const tooltipOpen = ref(false)
    const tooltip = stack.register({ kind: 'tooltip', parentId: dropdown.id, open: tooltipOpen })

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

  it('propagates parent popup id through context registration', () => {
    const host = document.createElement('div')
    let dropdownRegistration: PopupRegistration | null = null
    let tooltipRegistration: PopupRegistration | null = null

    const PopupProvider = defineComponent({
      setup(_, { slots }) {
        providePopupStack()
        return () => slots.default?.()
      }
    })

    const NestedPopup = defineComponent({
      setup() {
        tooltipRegistration = usePopupRegistration('tooltip', ref(true))
        return () => null
      }
    })

    const Root = defineComponent({
      setup() {
        dropdownRegistration = usePopupRegistration('dropdown', ref(true))
        return () => h(NestedPopup)
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

    expect(dropdownRegistration).not.toBe(null)
    expect(tooltipRegistration).not.toBe(null)

    const dropdown = dropdownRegistration!
    const tooltip = tooltipRegistration!

    expect(dropdown.parentId).toBe(null)
    expect(tooltip.parentId).toBe(dropdown.id)

    app.unmount()
  })

  it('finds popup roots using internal popup data attributes', () => {
    const popupRoot = document.createElement('div')
    const attrs = getPopupRootAttrs(7, 'dropdown')
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
