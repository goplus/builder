let activeDropdownClose: (() => void) | null = null

export function activateDropdown(close: () => void) {
  activeDropdownClose?.()
  activeDropdownClose = close
}

export function deactivateDropdown(close: () => void) {
  if (activeDropdownClose === close) activeDropdownClose = null
}

export function closeActiveDropdown() {
  activeDropdownClose?.()
  activeDropdownClose = null
}
