import { inject, onScopeDispose, provide, type InjectionKey, type Ref } from 'vue'
import { createLayerStack, findLayerRoot, type LayerStack } from '../utils/layer-stack'

export const UI_POPUP_ROOT_ATTR = 'data-ui-popup-root'

export function createPopupStack(): LayerStack {
  return createLayerStack(UI_POPUP_ROOT_ATTR)
}

export function findPopupRoot(target: EventTarget | Node | null) {
  return findLayerRoot(target, UI_POPUP_ROOT_ATTR)
}

const popupStackKey: InjectionKey<LayerStack> = Symbol('popup-stack')

export function providePopupStack(stack: LayerStack = createPopupStack()) {
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
  const registration = stack.register(open)
  onScopeDispose(registration.unregister)
  return registration
}
