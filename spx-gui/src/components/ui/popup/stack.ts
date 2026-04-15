import { computed, inject, onScopeDispose, provide, ref, shallowReactive, type InjectionKey, type Ref } from 'vue'

export const UI_POPUP_ROOT_ATTR = 'data-ui-popup-root'
export const UI_POPUP_ID_ATTR = 'data-ui-popup-id'
export const UI_POPUP_KIND_ATTR = 'data-ui-popup-kind'

export type PopupKind = 'dropdown' | 'tooltip' | 'modal' | 'custom'

export type PopupStackEntry = {
  id: number
  parentId: number | null
  kind: PopupKind
  open: Readonly<Ref<boolean>>
  triggerEl: Ref<HTMLElement | null>
  contentEl: Ref<HTMLElement | null>
}

export type PopupRegistration = PopupStackEntry & {
  readonly rootAttrs: Record<string, string>
  readonly isTopmost: Ref<boolean>
  unregister(): void
}

export type PopupStack = {
  entries: PopupStackEntry[]
  register(input: { kind: PopupKind; parentId: number | null; open: Readonly<Ref<boolean>> }): PopupRegistration
  getEntry(id: number): PopupStackEntry | null
  getTopmostOpenEntry(): PopupStackEntry | null
}

export function createPopupStack(): PopupStack {
  const entries = shallowReactive<PopupStackEntry[]>([])
  let nextPopupId = 0

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

  function register({
    kind,
    parentId,
    open
  }: {
    kind: PopupKind
    parentId: number | null
    open: Readonly<Ref<boolean>>
  }): PopupRegistration {
    nextPopupId += 1
    const id = nextPopupId
    const triggerEl = ref<HTMLElement | null>(null)
    const contentEl = ref<HTMLElement | null>(null)
    const entry = shallowReactive<PopupStackEntry>({ id, parentId, kind, open, triggerEl, contentEl })
    entries.push(entry)

    function unregister() {
      const index = entries.findIndex((current) => current.id === id)
      if (index === -1) return
      entries.splice(index, 1)
    }

    return {
      ...entry,
      rootAttrs: getPopupRootAttrs(id, kind),
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
const parentPopupIdKey: InjectionKey<number | null> = Symbol('parent-popup-id')

export function providePopupStack(stack: PopupStack = createPopupStack()) {
  provide(popupStackKey, stack)
  provide(parentPopupIdKey, null)
  return stack
}

export function usePopupStack() {
  const stack = inject(popupStackKey)
  if (stack == null) throw new Error('Popup stack not provided')
  return stack
}

export function usePopupRegistration(kind: PopupKind, open: Readonly<Ref<boolean>>) {
  const stack = usePopupStack()
  const parentId = inject(parentPopupIdKey, null)
  const registration = stack.register({ kind, parentId, open })
  provide(parentPopupIdKey, registration.id)
  onScopeDispose(registration.unregister)
  return registration
}

export function getPopupRootAttrs(id: number, kind: PopupKind): Record<string, string> {
  return {
    [UI_POPUP_ROOT_ATTR]: '',
    [UI_POPUP_ID_ATTR]: String(id),
    [UI_POPUP_KIND_ATTR]: kind
  }
}

export function findPopupRoot(target: EventTarget | Node | null) {
  let current: Node | null = target instanceof Node ? target : null
  while (current != null) {
    if (current instanceof HTMLElement && current.hasAttribute(UI_POPUP_ROOT_ATTR)) return current
    current = current.parentNode
  }
  return null
}
