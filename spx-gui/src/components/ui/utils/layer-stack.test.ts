import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { UI_LAYER_ROOT_ATTR, createLayerStack, findLayerRoot } from './layer-stack'

function createTestLayerStack() {
  return createLayerStack()
}

describe('layer stack', () => {
  it('tracks the topmost open layer by registration order', () => {
    const stack = createTestLayerStack()
    const firstLayer = stack.register(ref(true))
    const secondOpen = ref(false)
    const secondLayer = stack.register(secondOpen)

    expect(stack.getTopmostOpenEntry()?.id).toBe(firstLayer.id)
    expect(firstLayer.isTopmost.value).toBe(true)
    expect(secondLayer.isTopmost.value).toBe(false)
    expect(firstLayer.rootAttrs).toEqual({ [UI_LAYER_ROOT_ATTR]: '' })

    secondOpen.value = true

    expect(stack.getTopmostOpenEntry()?.id).toBe(secondLayer.id)
    expect(firstLayer.isTopmost.value).toBe(false)
    expect(secondLayer.isTopmost.value).toBe(true)

    secondLayer.unregister()

    expect(stack.getTopmostOpenEntry()?.id).toBe(firstLayer.id)
    expect(firstLayer.isTopmost.value).toBe(true)
  })

  it('starts ids from 1 for each new stack instance', () => {
    const firstStack = createTestLayerStack()
    const secondStack = createTestLayerStack()

    expect(firstStack.register(ref(true)).id).toBe(1)
    expect(secondStack.register(ref(true)).id).toBe(1)
  })

  it('uses one shared root attr for all layers in a stack', () => {
    const stack = createLayerStack()
    const modalLayer = stack.register(ref(true))
    const popupLayer = stack.register(ref(true))

    expect(modalLayer.rootAttrs).toEqual({ [UI_LAYER_ROOT_ATTR]: '' })
    expect(popupLayer.rootAttrs).toEqual({ [UI_LAYER_ROOT_ATTR]: '' })
    expect(stack.getTopmostOpenEntry()?.id).toBe(popupLayer.id)
    expect(modalLayer.isTopmost.value).toBe(false)
    expect(popupLayer.isTopmost.value).toBe(true)
  })

  it('finds layer roots using internal layer data attributes', () => {
    const layerRoot = document.createElement('div')
    layerRoot.setAttribute(UI_LAYER_ROOT_ATTR, '')
    const child = document.createElement('span')
    const text = document.createTextNode('nested')
    layerRoot.appendChild(child)
    child.appendChild(text)

    expect(findLayerRoot(child)).toBe(layerRoot)
    expect(findLayerRoot(text)).toBe(layerRoot)
  })
})
