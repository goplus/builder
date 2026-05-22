<script lang="ts">
import type { PopupPlacement } from './popup'

export type Placement = Extract<
  PopupPlacement,
  'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'right' | 'left'
>
</script>

<script setup lang="ts">
import { computed, mergeProps, onScopeDispose, ref, useAttrs, useSlots, watch, type CSSProperties } from 'vue'
import {
  PopupRenderTrigger,
  type PopupTriggerHandle,
  renderPopupTrigger,
  resolveTriggerElement,
  useFloatingPopup
} from './popup'
import { cn, useLayerRegistration, type ClassValue } from './utils'
import { usePopupContainer } from './utils'

defineOptions({
  name: 'UITooltip',
  inheritAttrs: false
})

const props = withDefaults(
  defineProps<{
    placement?: Placement
    visible?: boolean
    delay?: number
    disabled?: boolean
    class?: ClassValue
  }>(),
  {
    placement: 'top',
    visible: undefined,
    delay: 600,
    disabled: false,
    class: undefined
  }
)

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const slots = useSlots()
const attachTo = usePopupContainer()
const internalVisibleRef = ref(false)
const visibleComputed = computed(() => props.visible ?? internalVisibleRef.value)
const popup = useLayerRegistration(visibleComputed)
const {
  referenceRef: triggerRef,
  floatingRef: contentRef,
  arrowRef,
  floatingStyle,
  arrowStyle
} = useFloatingPopup({
  visible: visibleComputed,
  placement: computed(() => props.placement),
  showArrow: true
})
const popupStyle = computed(
  () =>
    ({
      left: '0px',
      top: '0px',
      visibility: floatingStyle.value == null ? 'hidden' : 'visible',
      ...floatingStyle.value
    }) satisfies CSSProperties
)

function updateVisible(visible: boolean) {
  if (props.disabled && visible) return
  if (visible === visibleComputed.value) return
  emit('update:visible', visible)
  internalVisibleRef.value = visible
}

function setTriggerRef(target: Element | { $el?: Node } | null) {
  triggerRef.value = resolveTriggerElement(target)
}

const openTimerRef = ref<number | null>(null)
const closeTimerRef = ref<number | null>(null)

function clearTimer(timerRef: typeof openTimerRef) {
  if (timerRef.value == null) return
  window.clearTimeout(timerRef.value)
  timerRef.value = null
}

function scheduleOpen() {
  clearTimer(closeTimerRef)
  clearTimer(openTimerRef)
  openTimerRef.value = window.setTimeout(() => {
    updateVisible(true)
  }, props.delay)
}

function scheduleClose() {
  clearTimer(openTimerRef)
  clearTimer(closeTimerRef)
  closeTimerRef.value = window.setTimeout(() => {
    updateVisible(false)
  }, 100)
}

function handleTriggerMouseenter() {
  if (props.disabled) return
  scheduleOpen()
}

function handleTriggerMouseleave() {
  scheduleClose()
}

function handleContentMouseenter() {
  if (props.disabled) return
  clearTimer(closeTimerRef)
  updateVisible(true)
}

function handleContentMouseleave() {
  scheduleClose()
}

const exposed: PopupTriggerHandle = {
  triggerEl: triggerRef
}

defineExpose(exposed)

onScopeDispose(() => {
  clearTimer(openTimerRef)
  clearTimer(closeTimerRef)
})

watch(
  () => props.disabled,
  (disabled) => {
    if (!disabled) return
    clearTimer(openTimerRef)
    clearTimer(closeTimerRef)
    updateVisible(false)
  },
  { immediate: true }
)

// Tooltips behave like a transparent trigger decorator, so arbitrary attrs and
// listeners applied on <UITooltip> should still land on the caller's actual
// trigger node. This is useful for generic trigger wrappers, including nested
// compositions such as UIDropdownWithTooltip.
const attrs = useAttrs()

const triggerProps = computed(() =>
  mergeProps(attrs, {
    ref: setTriggerRef,
    onMouseenter: handleTriggerMouseenter,
    onMouseleave: handleTriggerMouseleave
  })
)

function renderTriggerNode() {
  return renderPopupTrigger(slots.trigger?.(), triggerProps.value)
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
        :class="cn('fixed z-1000 rounded-md bg-grey-1000 px-2 py-1.75 text-xs text-grey-100 shadow-sm', props.class)"
        :style="popupStyle"
        @mouseenter="handleContentMouseenter"
        @mouseleave="handleContentMouseleave"
      >
        <div ref="arrowRef" class="absolute rotate-45 pointer-events-none bg-grey-1000" :style="arrowStyle"></div>
        <slot></slot>
      </div>
    </Transition>
  </Teleport>
</template>
