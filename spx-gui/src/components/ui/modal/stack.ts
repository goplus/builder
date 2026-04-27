/**
 * Modal stack tracks rendered modal surfaces at the DOM layer: root markers,
 * layer ordering, and lookup from event targets. It does not create modal instances.
 */
import { inject, onScopeDispose, provide, type InjectionKey, type Ref } from 'vue'
import { createLayerStack, findLayerRoot, type LayerStack } from '../utils/layer-stack'

export const UI_MODAL_ROOT_ATTR = 'data-ui-modal-root'

export function createModalStack(): LayerStack {
  return createLayerStack(UI_MODAL_ROOT_ATTR)
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
