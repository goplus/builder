/**
 * Shared popup/modal layer stack utilities.
 *
 * This file contains the small common model used by popup- and modal-like UI
 * layers: registration order, open-state tracking, topmost detection, and DOM
 * root markers for document-level event scope recovery.
 */
import { computed, inject, onScopeDispose, provide, shallowReactive, type InjectionKey, type Ref } from 'vue'

export const UI_LAYER_ROOT_ATTR = 'data-ui-layer-root'

/**
 * One stack-tracked layer instance. The stack only cares about stable identity
 * and whether that layer is currently open.
 */
export type LayerEntry = {
  id: number
  open: Readonly<Ref<boolean>>
}

/**
 * The registration handle exposed back to popup/modal callers. Besides the base
 * entry state, it includes root DOM attrs, topmost status, and cleanup.
 */
export type LayerRegistration = LayerEntry & {
  readonly rootAttrs: Record<string, string>
  readonly isTopmost: Ref<boolean>
  unregister(): void
}

export type LayerStack = {
  entries: LayerEntry[]
  register(open: Readonly<Ref<boolean>>): LayerRegistration
  getEntry(id: number): LayerEntry | null
  getTopmostOpenEntry(): LayerEntry | null
}

/**
 * Create the shared stack implementation used by popup/modal layers.
 *
 * Registration order, topmost tracking, root markers, and cleanup remain shared.
 */
export function createLayerStack(): LayerStack {
  const entries = shallowReactive<LayerEntry[]>([])
  let nextId = 0

  function getEntry(id: number) {
    return entries.find((entry) => entry.id === id) ?? null
  }

  function getTopmostOpenEntry() {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]
      if (entry != null && entry.open.value) return entry
    }
    return null
  }

  const topmostId = computed(() => getTopmostOpenEntry()?.id)

  function register(open: Readonly<Ref<boolean>>) {
    nextId += 1
    const entry = shallowReactive<LayerEntry>({ id: nextId, open })
    entries.push(entry)

    function unregister() {
      const index = entries.findIndex((current) => current.id === entry.id)
      if (index === -1) return
      entries.splice(index, 1)
    }

    return shallowReactive<LayerRegistration>({
      id: entry.id,
      open: entry.open,
      rootAttrs: { [UI_LAYER_ROOT_ATTR]: '' },
      isTopmost: computed(() => topmostId.value === entry.id),
      unregister
    })
  }

  return {
    entries,
    register,
    getEntry,
    getTopmostOpenEntry
  }
}

/**
 * Walk up from an event target/node until the nearest marked layer root is found.
 */
export function findLayerRoot(target: EventTarget | Node | null) {
  let current: Node | null = target instanceof Node ? target : null
  while (current != null) {
    if (current instanceof HTMLElement && current.hasAttribute(UI_LAYER_ROOT_ATTR)) return current
    current = current.parentNode
  }
  return null
}

const layerStackKey: InjectionKey<LayerStack> = Symbol('layer-stack')

export function provideLayerStack(stack: LayerStack = createLayerStack()) {
  provide(layerStackKey, stack)
  return stack
}

export function useLayerStack() {
  const stack = inject(layerStackKey)
  if (stack == null) throw new Error('Layer stack not provided')
  return stack
}

export function useLayerRegistration(open: Readonly<Ref<boolean>>) {
  const stack = useLayerStack()
  const registration = stack.register(open)
  onScopeDispose(registration.unregister)
  return registration
}
