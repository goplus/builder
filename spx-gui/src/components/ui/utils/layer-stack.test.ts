import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { createLayerStack, findLayerRoot, makeLayerRootAttrs } from './layer-stack'

function createTestLayerStack() {
  return createLayerStack((id) => makeLayerRootAttrs('data-test-layer-root', 'data-test-layer-id', id))
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
    expect(firstLayer.rootAttrs).toEqual(
      makeLayerRootAttrs('data-test-layer-root', 'data-test-layer-id', firstLayer.id)
    )

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

  it('finds layer roots using internal layer data attributes', () => {
    const layerRoot = document.createElement('div')
    const attrs = makeLayerRootAttrs('data-test-layer-root', 'data-test-layer-id', 7)
    for (const [name, value] of Object.entries(attrs)) {
      layerRoot.setAttribute(name, value)
    }
    const child = document.createElement('span')
    const text = document.createTextNode('nested')
    layerRoot.appendChild(child)
    child.appendChild(text)

    expect(findLayerRoot(child, 'data-test-layer-root')).toBe(layerRoot)
    expect(findLayerRoot(text, 'data-test-layer-root')).toBe(layerRoot)
  })
})
