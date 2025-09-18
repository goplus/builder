import { type InjectionKey, provide, type Ref, inject, ref, watchEffect } from 'vue'
import { getCleanupSignal } from '@/utils/disposable'

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

/** If given target in any popup content */
export function isInPopup(target: HTMLElement | null) {
  let el = target
  while (el != null) {
    if (el.classList.contains('n-popover') || el.classList.contains('n-modal')) return true
    el = el.parentElement
  }
  return false
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
