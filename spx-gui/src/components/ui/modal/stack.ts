import { inject, onScopeDispose, provide, type InjectionKey, type Ref } from 'vue'
import { createLayerStack, findLayerRoot, makeLayerRootAttrs, type LayerStack } from '../utils'

export const UI_MODAL_ROOT_ATTR = 'data-ui-modal-root'
export const UI_MODAL_ID_ATTR = 'data-ui-modal-id'

export function createModalStack(): LayerStack {
  return createLayerStack(makeModalRootAttrs)
}

export function makeModalRootAttrs(id: number): Record<string, string> {
  return makeLayerRootAttrs(UI_MODAL_ROOT_ATTR, UI_MODAL_ID_ATTR, id)
}

export function findModalRoot(target: EventTarget | Node | null) {
  return findLayerRoot(target, UI_MODAL_ROOT_ATTR)
}

const modalStackKey: InjectionKey<LayerStack> = Symbol('modal-stack')

export function provideModalStack(stack: LayerStack = createModalStack()) {
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
