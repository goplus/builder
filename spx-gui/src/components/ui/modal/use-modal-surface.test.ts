import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref, type Ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useProvideLastClickEvent, provideModalContainer, usePopupContainer } from '../utils'
import { findModalRoot, provideModalStack } from './stack'
import { useModalSurface } from './use-modal-surface'

async function flushModalEffects() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

describe('useModalSurface', () => {
  it('provides modal root attrs, transform origin, and a modal-local popup container', async () => {
    let visible!: Ref<boolean>
    let popupContainerRef: Ref<HTMLElement | undefined> | null = null
    let transformStyleRef: Ref<Record<string, unknown> | null> | null = null

    const PopupContainerConsumer = defineComponent({
      setup() {
        popupContainerRef = usePopupContainer()
        return () => null
      }
    })

    const Surface = defineComponent({
      setup() {
        visible = ref(false)
        const modalSurface = useModalSurface({ visible })
        transformStyleRef = modalSurface.transformStyle as Ref<Record<string, unknown> | null>
        return () =>
          h('div', [
            h(PopupContainerConsumer),
            h('div', {
              ...modalSurface.surfaceRootAttrs,
              ref: modalSurface.setContentRef,
              'data-test-id': 'surface'
            })
          ])
      }
    })

    const Provider = defineComponent({
      setup(_, { slots }) {
        const modalContainer = ref<HTMLElement>()
        provideModalContainer(modalContainer)
        provideModalStack()
        useProvideLastClickEvent()
        return () => h('div', { ref: modalContainer, 'data-test-id': 'modal-container' }, slots.default?.())
      }
    })

    const wrapper = mount(
      defineComponent({
        setup() {
          return () => h(Provider, null, { default: () => h(Surface) })
        }
      }),
      { attachTo: document.body }
    )

    const surface = wrapper.get('[data-test-id="surface"]').element as HTMLElement
    const modalContainer = wrapper.get('[data-test-id="modal-container"]').element as HTMLElement
    Object.defineProperties(surface, {
      offsetParent: {
        configurable: true,
        get: () => modalContainer
      },
      offsetLeft: {
        configurable: true,
        get: () => 10
      },
      offsetTop: {
        configurable: true,
        get: () => 20
      }
    })
    surface.getBoundingClientRect = () =>
      ({ x: 10, y: 20, left: 10, top: 20, right: 110, bottom: 120, width: 100, height: 100 }) as DOMRect

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 50, clientY: 90 }))
    await flushModalEffects()

    visible.value = true
    await flushModalEffects()

    if (popupContainerRef == null || transformStyleRef == null) throw new Error('Expected modal surface refs')
    const popupContainer = popupContainerRef as Ref<HTMLElement | undefined>
    const transformStyle = transformStyleRef as Ref<Record<string, unknown> | null>

    expect(findModalRoot(surface)).toBe(surface)
    expect(popupContainer.value).toBe(surface)
    expect(transformStyle.value).toEqual({ transformOrigin: '40px 70px' })

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 80, clientY: 120 }))
    await flushModalEffects()
    expect(transformStyle.value).toEqual({ transformOrigin: '40px 70px' })

    visible.value = false
    await flushModalEffects()
    expect(transformStyle.value).toEqual({ transformOrigin: '40px 70px' })
  })
})
