<script lang="ts">
import { inject, type InjectionKey } from 'vue'
import type { PopupPlacement } from './popup'
import type { ClassValue } from './utils'

export type DropdownCtrl = {
  setVisible(visible: boolean): void
}

export const dropdownCtrlKey: InjectionKey<DropdownCtrl> = Symbol('dropdown-ctrl')

export function useDropdown() {
  return inject(dropdownCtrlKey)
}

export type Placement = Extract<
  PopupPlacement,
  'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'
>
export type TriggerType = 'click' | 'hover' | 'manual'
export type Pos = {
  x: number
  y: number
  // Optional size (width & height) is supported when positioned manually.
  // When provided, it behaves like positioning with a sized trigger element.
  width?: number
  height?: number
}
export type Offset = {
  x: number
  y: number
}

export type Props = {
  placement?: Placement
  trigger?: TriggerType
  visible?: boolean
  pos?: Pos
  offset?: Offset
  disabled?: boolean
  class?: ClassValue
}
</script>

<script setup lang="ts">
import { computed, onScopeDispose, provide, ref, useSlots, watch, watchEffect, type CSSProperties } from 'vue'
import { cn } from './utils'
import {
  PopupRenderTrigger,
  type PopupTriggerHandle,
  renderPopupTrigger,
  resolveTriggerElement,
  useFloatingPopup,
  usePopupRegistration
} from './popup'
import { usePopupContainer } from './utils'

const HOVER_OPEN_DELAY = 100
const HOVER_CLOSE_DELAY = 100

defineOptions({
  name: 'UIDropdown',
  inheritAttrs: false
})

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom',
  trigger: 'hover',
  visible: undefined,
  pos: undefined,
  offset: () => ({ x: 0, y: 8 }),
  disabled: false,
  class: undefined
})

const emit = defineEmits<{
  'update:visible': [boolean]
  clickOutside: [MouseEvent]
}>()
const slots = useSlots()
const attachTo = usePopupContainer()

// Uncontrolled dropdowns keep their own visible state, while controlled callers
// can still drive visibility through `v-model:visible`.
const internalVisibleRef = ref(false)
const visibleComputed = computed(() => props.visible ?? internalVisibleRef.value)
// Register the dropdown in the shared popup stack so ESC/outside-click logic can
// reason about the current topmost popup and its live DOM anchors.
const popup = usePopupRegistration(visibleComputed)
const {
  referenceRef: triggerRef,
  floatingRef: contentRef,
  floatingStyle,
  transformOrigin
} = useFloatingPopup({
  visible: visibleComputed,
  placement: computed(() => props.placement),
  offset: computed(() => props.offset),
  virtualAnchor: computed(() => props.pos ?? null)
})
const rootClass = computed(() => cn('fixed z-1000 overflow-hidden rounded-md bg-grey-100 shadow-sm', props.class))
const popupStyle = computed(
  () =>
    ({
      left: '0px',
      top: '0px',
      visibility: floatingStyle.value == null ? 'hidden' : 'visible',
      '--ui-popup-transform-origin': transformOrigin.value,
      ...floatingStyle.value
    }) satisfies CSSProperties
)

function handleUpdateVisible(show: boolean) {
  if (show === visibleComputed.value) return
  emit('update:visible', show)
  internalVisibleRef.value = show
}

function setVisible(visible: boolean) {
  // Keep this as the last safety net for delayed/programmatic openings (for
  // example a queued hover-open timer or an injected dropdown controller call).
  // Disabled dropdowns should not re-open themselves, but we still allow forced
  // closing so callers and internal handlers can collapse an already-open popup.
  if (visible && props.disabled) return
  handleUpdateVisible(visible)
}

provide(dropdownCtrlKey, { setVisible })

function setTriggerRef(target: Element | { $el?: Element } | null) {
  triggerRef.value = resolveTriggerElement(target)
}

const hoverOpenTimerRef = ref<number | null>(null)
const hoverCloseTimerRef = ref<number | null>(null)

function clearTimer(timerRef: typeof hoverOpenTimerRef) {
  if (timerRef.value == null) return
  window.clearTimeout(timerRef.value)
  timerRef.value = null
}

function scheduleOpen() {
  clearTimer(hoverCloseTimerRef)
  clearTimer(hoverOpenTimerRef)
  // Hover-triggered dropdowns intentionally open a little later to avoid flicker
  // while the pointer is just passing across the trigger.
  hoverOpenTimerRef.value = window.setTimeout(() => {
    setVisible(true)
  }, HOVER_OPEN_DELAY)
}

function scheduleClose() {
  clearTimer(hoverOpenTimerRef)
  clearTimer(hoverCloseTimerRef)
  // Mirror the delayed close so the user can move from trigger into content
  // without the dropdown collapsing in between.
  hoverCloseTimerRef.value = window.setTimeout(() => {
    setVisible(false)
  }, HOVER_CLOSE_DELAY)
}

function handleTriggerClick() {
  if (props.trigger !== 'click' || props.disabled) return
  setVisible(true)
}

function handleTriggerMouseenter() {
  if (props.trigger !== 'hover' || props.disabled) return
  scheduleOpen()
}

function handleTriggerMouseleave() {
  if (props.trigger !== 'hover') return
  scheduleClose()
}

function handleContentMouseenter() {
  if (props.trigger !== 'hover' || props.disabled) return
  clearTimer(hoverCloseTimerRef)
  setVisible(true)
}

function handleContentMouseleave() {
  if (props.trigger !== 'hover') return
  scheduleClose()
}

onScopeDispose(() => {
  clearTimer(hoverOpenTimerRef)
  clearTimer(hoverCloseTimerRef)
})

watch(
  () => props.disabled,
  (disabled) => {
    if (!disabled) return
    clearTimer(hoverOpenTimerRef)
    clearTimer(hoverCloseTimerRef)
    // In uncontrolled mode, disabling the dropdown should collapse it right away.
    // Controlled mode stays source-of-truth driven by the parent component.
    if (props.visible == null) internalVisibleRef.value = false
  },
  { immediate: true }
)

watchEffect((onCleanup) => {
  if (!visibleComputed.value || !popup.isTopmost.value) return

  function handleDocumentClick(e: MouseEvent) {
    // Ignore clicks that belong to the current trigger/content pair. Nested
    // dropdowns register separately, so their own stack entry handles itself.
    if (isEventInsideCurrentDropdown(e, triggerRef.value, contentRef.value)) return
    setVisible(false)
    emit('clickOutside', e)
  }

  function handleDocumentKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    // Only the topmost open dropdown installs this listener, so ESC peels off
    // the current popup layer instead of closing every dropdown at once.
    setVisible(false)
  }

  document.addEventListener('click', handleDocumentClick, true)
  window.addEventListener('keydown', handleDocumentKeydown)
  onCleanup(() => {
    document.removeEventListener('click', handleDocumentClick, true)
    window.removeEventListener('keydown', handleDocumentKeydown)
  })
})

const exposed: PopupTriggerHandle & { setVisible(visible: boolean): void } = {
  setVisible,
  triggerEl: triggerRef
}

defineExpose(exposed)

// Unlike UITooltip, dropdown is not meant to be a transparent trigger
// decorator. It owns explicit trigger modes (click / hover / manual), so we
// only attach the internal trigger handlers/ref here instead of forwarding all
// arbitrary attrs/listeners from <UIDropdown> onto the trigger slot node.
const triggerProps = computed(() => {
  const common = {
    ref: setTriggerRef
  }
  if (props.trigger === 'click') {
    return {
      ...common,
      onClick: handleTriggerClick
    }
  }
  if (props.trigger === 'hover') {
    return {
      ...common,
      onMouseenter: handleTriggerMouseenter,
      onMouseleave: handleTriggerMouseleave
    }
  }
  return common
})

// Normalize the trigger slot into a single renderable node so internal trigger
// listeners/ref wiring can be attached consistently across native and component triggers.
function renderTriggerNode() {
  return renderPopupTrigger(slots.trigger?.(), triggerProps.value)
}

function isEventInsideCurrentDropdown(event: MouseEvent, triggerEl: HTMLElement | null, contentEl: HTMLElement | null) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  if (triggerEl != null && path.includes(triggerEl)) return true
  if (contentEl != null && path.includes(contentEl)) return true
  const target = event.target
  if (!(target instanceof Node)) return false
  return (triggerEl != null && triggerEl.contains(target)) || (contentEl != null && contentEl.contains(target))
}
</script>

<template>
  <PopupRenderTrigger :render-node="renderTriggerNode" />

  <Teleport v-if="attachTo != null" :to="attachTo">
    <Transition name="ui-popup-scale-fade">
      <div
        v-if="visibleComputed"
        v-bind="popup.rootAttrs"
        ref="contentRef"
        :class="rootClass"
        :style="popupStyle"
        @mouseenter="handleContentMouseenter"
        @mouseleave="handleContentMouseleave"
      >
        <slot></slot>
      </div>
    </Transition>
  </Teleport>
</template>
