import { type InjectionKey, provide, type Ref, computed, inject, readonly, ref, watchEffect } from 'vue'
import { getCleanupSignal } from '@/utils/disposable'
import { findLayerRoot } from './layer-stack'
export { cn, type ClassDictionary, type ClassValue } from './cn'
export {
  createRecipe,
  type SlotClasses,
  type VariantDefinitions,
  type RecipeSelection,
  type RecipeCondition,
  type RecipeConfig,
  type RecipeResult
} from './create-recipe'
export {
  UI_LAYER_ROOT_ATTR,
  createLayerStack,
  findLayerRoot,
  provideLayerStack,
  useLayerRegistration,
  useLayerStack,
  type LayerEntry,
  type LayerRegistration,
  type LayerStack
} from './layer-stack'

const rootContainerInjectionKey: InjectionKey<Ref<HTMLElement | undefined>> = Symbol('root-container')

/** Provide root container for UI components (basically the root container for the app) */
export function provideRootContainer(containerRef: Ref<HTMLElement | undefined>) {
  provide(rootContainerInjectionKey, containerRef)
}

/** Get root container for UI components (basically the root container for the app) */
export function useRootContainer() {
  const container = inject(rootContainerInjectionKey)
  if (container == null) throw new Error('Root container not provided')
  return container
}

const popupContainerInjectionKey: InjectionKey<Ref<HTMLElement | undefined>> = Symbol('popup-container')

/** Provide container for all popup content (Dropdown, Tooltip, etc.) */
export function providePopupContainer(containerRef: Ref<HTMLElement | undefined>) {
  provide(popupContainerInjectionKey, containerRef)
}

/** Get container for all popup content (Dropdown, Tooltip, etc.) */
export function usePopupContainer() {
  const popupContainer = inject(popupContainerInjectionKey)
  if (popupContainer == null) throw new Error('Popup container not provided')
  return popupContainer
}

const popupReadyInjectionKey: InjectionKey<Readonly<Ref<boolean>>> = Symbol('popup-ready')
const defaultPopupReady = readonly(ref(true))

/**
 * Provide readiness for automatic focus to popup content only, excluding its trigger.
 * A popup is ready once positioning and its enter animation have completed.
 * Ancestor popups must also be ready. Reset this when closing or starting another enter.
 * Returns readiness including ancestor constraints.
 */
export function providePopupReady(ready: Readonly<Ref<boolean>>) {
  const parentReady = usePopupReady()
  const popupReady = computed(() => parentReady.value && ready.value)
  provide(popupReadyInjectionKey, popupReady)
  return popupReady
}

/** Readiness of the enclosing popup content; true outside a popup readiness provider. */
export function usePopupReady(): Readonly<Ref<boolean>> {
  return inject(popupReadyInjectionKey, defaultPopupReady)
}

const modalContainerInjectionKey: InjectionKey<Ref<HTMLElement | undefined>> = Symbol('modal-container')

/** Provide container for all modal content (Modal, Drawer, etc.) */
export function provideModalContainer(containerRef: Ref<HTMLElement | undefined>) {
  provide(modalContainerInjectionKey, containerRef)
}

/** Get container for all modal content (Modal, Drawer, etc.) */
export function useModalContainer() {
  const modalContainer = inject(modalContainerInjectionKey)
  if (modalContainer == null) throw new Error('Modal container not provided')
  return modalContainer
}

/** If given target in any popup/modal content */
export function isInPopupOrModal(target: HTMLElement | null) {
  return findLayerRoot(target) != null
}

const lastClickEventKey: InjectionKey<Ref<MouseEvent | null>> = Symbol('last-click-event')

export function useProvideLastClickEvent() {
  const lastClickEvent = ref<MouseEvent | null>(null)
  provide(lastClickEventKey, lastClickEvent)

  watchEffect((onCleanup) => {
    const signal = getCleanupSignal(onCleanup)
    document.body.addEventListener('click', (e) => (lastClickEvent.value = e), { capture: true, passive: true, signal })
  })
}

/** Returns the last click event in the page. */
export function useLastClickEvent() {
  const lastClickEvent = inject(lastClickEventKey)
  if (lastClickEvent == null)
    throw new Error('useLastClickEvent() is called without corresponding useProvideLastClickEvent()')
  return lastClickEvent
}
