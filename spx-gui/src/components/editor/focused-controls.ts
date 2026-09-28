/**
 * @desc The control row at the code column's bottom-right corner in the focused (tutorial)
 * layout. The editor owns the row (see `ProjectEditor`); descendants teleport their controls
 * into it — e.g. the preview's Run/Stop button — so the row lays them out as plain flex items.
 */

import { inject, provide, type InjectionKey, type Ref } from 'vue'

const anchorInjectionKey: InjectionKey<Ref<HTMLElement | null>> = Symbol('focused-controls-anchor')

export function provideFocusedControlsAnchor(anchorRef: Ref<HTMLElement | null>) {
  provide(anchorInjectionKey, anchorRef)
}

export function useFocusedControlsAnchor(): Ref<HTMLElement | null> | null {
  return inject(anchorInjectionKey, null)
}
