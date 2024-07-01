import { onMounted, ref } from 'vue'

/** Get root container for UI components (basically the root container for the app) */
export function useRootContainer() {
  const container = ref<HTMLElement>()
  onMounted(() => {
    // TODO:
    // 1. use Provide & inject to pass element
    // 2. use some PopupContainerProvider instead of ConfigProvider to provide element
    container.value = document.getElementsByClassName('ui-config-provider')[0] as HTMLElement
  })
  return container
}

/** Get container for all popup content (Modal, Dropdown, Tooltip, ...) */
export function usePopupContainer() {
  return useRootContainer()
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
