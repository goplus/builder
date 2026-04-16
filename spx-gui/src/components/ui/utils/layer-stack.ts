/**
 * Shared popup/modal layer stack utilities.
 *
 * This file contains the small common model used by popup- and modal-like UI
 * layers: registration order, open-state tracking, topmost detection, and DOM
 * root markers for document-level event scope recovery.
 */
import { computed, shallowReactive, type Ref } from 'vue'

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
 * Each consumer passes its own root-attr factory, while registration order,
 * topmost tracking, and cleanup remain shared.
 */
export function createLayerStack(makeRootAttrs: (id: number) => Record<string, string>): LayerStack {
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
      ...entry,
      rootAttrs: makeRootAttrs(entry.id),
      isTopmost: computed(() => getTopmostOpenEntry()?.id === entry.id),
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
 * Mark a layer content root with stable DOM identity attrs so document-level
 * event handling can recover that layer scope from any nested target node.
 */
export function makeLayerRootAttrs(rootAttr: string, idAttr: string, id: number): Record<string, string> {
  return {
    [rootAttr]: '',
    [idAttr]: String(id)
  }
}

/**
 * Walk up from an event target/node until the nearest marked layer root is found.
 */
export function findLayerRoot(target: EventTarget | Node | null, rootAttr: string) {
  let current: Node | null = target instanceof Node ? target : null
  while (current != null) {
    if (current instanceof HTMLElement && current.hasAttribute(rootAttr)) return current
    current = current.parentNode
  }
  return null
}
