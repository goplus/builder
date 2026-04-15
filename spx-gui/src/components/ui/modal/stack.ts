import { computed, inject, onScopeDispose, provide, ref, shallowReactive, type InjectionKey, type Ref } from 'vue'

export const UI_MODAL_ROOT_ATTR = 'data-ui-modal-root'
export const UI_MODAL_ID_ATTR = 'data-ui-modal-id'

export type ModalStackEntry = {
  id: number
  open: Readonly<Ref<boolean>>
  contentEl: Ref<HTMLElement | null>
}

export type ModalRegistration = ModalStackEntry & {
  readonly rootAttrs: Record<string, string>
  readonly isTopmost: Ref<boolean>
  unregister(): void
}

export type ModalStack = {
  entries: ModalStackEntry[]
  register(open: Readonly<Ref<boolean>>): ModalRegistration
  getEntry(id: number): ModalStackEntry | null
  getTopmostOpenEntry(): ModalStackEntry | null
}

export function createModalStack(): ModalStack {
  const entries = shallowReactive<ModalStackEntry[]>([])
  let nextModalId = 0

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

  function register(open: Readonly<Ref<boolean>>): ModalRegistration {
    nextModalId += 1
    const id = nextModalId
    const contentEl = ref<HTMLElement | null>(null)
    const entry = shallowReactive<ModalStackEntry>({ id, open, contentEl })
    entries.push(entry)

    function unregister() {
      const index = entries.findIndex((current) => current.id === id)
      if (index === -1) return
      entries.splice(index, 1)
    }

    return {
      ...entry,
      rootAttrs: getModalRootAttrs(id),
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

const modalStackKey: InjectionKey<ModalStack> = Symbol('modal-stack')

export function provideModalStack(stack: ModalStack = createModalStack()) {
  provide(modalStackKey, stack)
  return stack
}

export function useModalStack() {
  const stack = inject(modalStackKey)
  if (stack == null) throw new Error('Modal stack not provided')
  return stack
}

export function useModalRegistration(open: Readonly<Ref<boolean>>) {
  const stack = useModalStack()
  const registration = stack.register(open)
  onScopeDispose(registration.unregister)
  return registration
}

export function getModalRootAttrs(id: number): Record<string, string> {
  return {
    [UI_MODAL_ROOT_ATTR]: '',
    [UI_MODAL_ID_ATTR]: String(id)
  }
}

export function findModalRoot(target: EventTarget | Node | null) {
  let current: Node | null = target instanceof Node ? target : null
  while (current != null) {
    if (current instanceof HTMLElement && current.hasAttribute(UI_MODAL_ROOT_ATTR)) return current
    current = current.parentNode
  }
  return null
}
