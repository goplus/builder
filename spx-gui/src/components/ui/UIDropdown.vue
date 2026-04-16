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
  showArrow?: boolean
  disabled?: boolean
  class?: ClassValue
}
</script>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  onScopeDispose,
  provide,
  ref,
  useSlots,
  watch,
  watchEffect,
  type CSSProperties,
  type PropType,
  type VNode
} from 'vue'
import { cn } from './utils'
import {
  renderPopupTrigger,
  resolvePopupElement,
  resolvePopupTransformOrigin,
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

const RenderTrigger = defineComponent({
  name: 'UIDropdownRenderTrigger',
  props: {
    renderNode: {
      type: Function as PropType<() => VNode | null>,
      required: true
    }
  },
  setup(props) {
    return () => props.renderNode()
  }
})

const props = withDefaults(defineProps<Props>(), {
  placement: 'bottom',
  trigger: 'hover',
  visible: undefined,
  pos: undefined,
  offset: () => ({ x: 0, y: 8 }),
  showArrow: false,
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
const popup = usePopupRegistration('dropdown', visibleComputed)
const { referenceRef, floatingRef, arrowRef, floatingStyle, arrowStyle } = useFloatingPopup({
  visible: visibleComputed,
  placement: computed(() => props.placement),
  offset: computed(() => props.offset),
  virtualAnchor: computed(() => props.pos ?? null),
  showArrow: computed(() => props.showArrow)
})
// Keep the scale animation origin aligned with the resolved placement/arrow so
// the popup expands from the visual attachment point instead of the center.
const transformOrigin = computed(() =>
  resolvePopupTransformOrigin(props.placement, arrowStyle.value, { showArrow: props.showArrow, arrowSize: 8 })
)
const rootClass = computed(() =>
  cn(
    'fixed z-1000 rounded-sm bg-grey-100 shadow-big',
    props.showArrow ? 'overflow-visible' : 'overflow-hidden',
    props.class
  )
)
const arrowClass = 'absolute size-2 rotate-45 pointer-events-none bg-grey-100 shadow-big'
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
const arrowInlineStyle = computed(() => ({ ...arrowStyle.value }) satisfies CSSProperties)

function handleUpdateVisible(show: boolean) {
  if (show === visibleComputed.value) return
  emit('update:visible', show)
  internalVisibleRef.value = show
}

function setVisible(visible: boolean) {
  // Disabled dropdowns should not re-open themselves, but we still allow forced
  // closing so callers and internal handlers can collapse an already-open popup.
  if (visible && props.disabled) return
  handleUpdateVisible(visible)
}

provide(dropdownCtrlKey, { setVisible })

/*
 * These ref callbacks complete the DOM wiring after popup stack registration.
 * - `setTriggerRef` runs when the trigger slot/root ref resolves.
 * - `setContentRef` runs when the teleported popup root mounts or updates.
 * Together they keep Floating UI state and the popup stack aligned with the
 * live trigger/content DOM elements.
 */
function setTriggerRef(target: Element | { $el?: Element } | null) {
  const el = resolvePopupElement(target)
  referenceRef.value = el
  popup.triggerEl.value = el
}
function setContentRef(target: Element | { $el?: Element } | null) {
  const el = resolvePopupElement(target)
  floatingRef.value = el
  popup.contentEl.value = el
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
  if (props.trigger !== 'click') return
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
    // In uncontrolled mode, disabling the dropdown should collapse it right away.
    // Controlled mode stays source-of-truth driven by the parent component.
    if (disabled && props.visible == null) internalVisibleRef.value = false
  },
  { immediate: true }
)

watchEffect((onCleanup) => {
  if (!visibleComputed.value || !popup.isTopmost.value) return

  function handleDocumentClick(e: MouseEvent) {
    // Ignore clicks that belong to the current trigger/content pair. Nested
    // dropdowns register separately, so their own stack entry handles itself.
    if (isEventInsideCurrentDropdown(e, popup.triggerEl.value, popup.contentEl.value)) return
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

defineExpose({ setVisible, triggerEl: referenceRef })

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
  <RenderTrigger :render-node="renderTriggerNode" />

  <Teleport v-if="attachTo != null" :to="attachTo">
    <Transition name="ui-popup-scale-fade">
      <div
        v-if="visibleComputed"
        v-bind="popup.rootAttrs"
        :ref="setContentRef"
        :class="rootClass"
        :style="popupStyle"
        @mouseenter="handleContentMouseenter"
        @mouseleave="handleContentMouseleave"
      >
        <div v-if="props.showArrow" ref="arrowRef" :class="arrowClass" :style="arrowInlineStyle"></div>
        <slot></slot>
      </div>
    </Transition>
  </Teleport>
</template>
