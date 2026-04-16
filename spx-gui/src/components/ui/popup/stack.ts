import { computed, inject, onScopeDispose, provide, shallowReactive, type InjectionKey, type Ref } from 'vue'

// Internal data attrs used to mark the popup content root element so stack and
// event-scope helpers can find teleported popup DOM reliably.
export const UI_POPUP_ROOT_ATTR = 'data-ui-popup-root'
export const UI_POPUP_ID_ATTR = 'data-ui-popup-id'

// One runtime record for a popup instance tracked by the popup stack.
export type PopupStackEntry = {
  id: number
  open: Readonly<Ref<boolean>>
}

export type PopupRegistration = PopupStackEntry & {
  readonly rootAttrs: Record<string, string>
  readonly isTopmost: Ref<boolean>
  unregister(): void
}

export type PopupStack = {
  entries: PopupStackEntry[]
  register(input: { open: Readonly<Ref<boolean>> }): PopupRegistration
  getEntry(id: number): PopupStackEntry | null
  getTopmostOpenEntry(): PopupStackEntry | null
}

export function createPopupStack(): PopupStack {
  // Keep popup identity local to each provided stack so separate app roots and
  // tests do not leak registration state into one another.
  const entries = shallowReactive<PopupStackEntry[]>([])
  let nextPopupId = 0

  function getEntry(id: number) {
    return entries.find((entry) => entry.id === id) ?? null
  }

  function getTopmostOpenEntry() {
    // Later registrations visually/behaviorally sit above earlier ones, so scan
    // backward to find the current topmost open popup.
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]
      if (entry != null && entry.open.value) return entry
    }
    return null
  }

  function register({ open }: { open: Readonly<Ref<boolean>> }): PopupRegistration {
    nextPopupId += 1
    const id = nextPopupId
    const entry = shallowReactive<PopupStackEntry>({ id, open })
    entries.push(entry)

    function unregister() {
      const index = entries.findIndex((current) => current.id === id)
      if (index === -1) return
      entries.splice(index, 1)
    }

    return {
      ...entry,
      rootAttrs: getPopupRootAttrs(id),
      isTopmost: computed(() => getTopmostOpenEntry()?.id === id),
      unregister
    }
  }

  return {
    entries,
    register,
    getEntry,
    getTopmostOpenEntry
  }
}

const popupStackKey: InjectionKey<PopupStack> = Symbol('popup-stack')

export function providePopupStack(stack: PopupStack = createPopupStack()) {
  provide(popupStackKey, stack)
  return stack
}

export function usePopupStack() {
  const stack = inject(popupStackKey)
  if (stack == null) throw new Error('Popup stack not provided')
  return stack
}

export function usePopupRegistration(open: Readonly<Ref<boolean>>) {
  const stack = usePopupStack()
  // Components register their open state with the shared stack and receive a
  // small registration handle back for root attrs, topmost status, and cleanup.
  const registration = stack.register({ open })
  onScopeDispose(registration.unregister)
  return registration
}

export function getPopupRootAttrs(id: number): Record<string, string> {
  // Mark the popup content root with a stable DOM identity so document-level
  // event handling can recover popup scope from any nested target node.
  return {
    [UI_POPUP_ROOT_ATTR]: '',
    [UI_POPUP_ID_ATTR]: String(id)
  }
}

export function findPopupRoot(target: EventTarget | Node | null) {
  let current: Node | null = target instanceof Node ? target : null
  while (current != null) {
    // Popup content can be teleported, so DOM ancestry is the reliable way to
    // detect whether an event originated from within any registered popup root.
    if (current instanceof HTMLElement && current.hasAttribute(UI_POPUP_ROOT_ATTR)) return current
    current = current.parentNode
  }
  return null
}
