<script lang="ts">
import type { PopupPlacement } from './popup'

export type Placement = Extract<
  PopupPlacement,
  'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'right' | 'left'
>
</script>

<script setup lang="ts">
import {
  computed,
  defineComponent,
  mergeProps,
  onScopeDispose,
  ref,
  watch,
  useAttrs,
  useSlots,
  type CSSProperties,
  type PropType,
  type VNode
} from 'vue'
import { cn, type ClassValue } from './utils'
import {
  renderPopupTrigger,
  resolvePopupTransformOrigin,
  resolvePopupTriggerElement,
  useFloatingPopup,
  usePopupRegistration
} from './popup'
import { usePopupContainer } from './utils'

defineOptions({
  name: 'UITooltip',
  inheritAttrs: false
})

const RenderTrigger = defineComponent({
  name: 'UITooltipRenderTrigger',
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

const attrs = useAttrs()
const slots = useSlots()
const attachTo = usePopupContainer()
const internalVisibleRef = ref(false)
const visibleComputed = computed(() => props.visible ?? internalVisibleRef.value)
const popup = usePopupRegistration('tooltip', visibleComputed)
const { referenceRef, floatingRef, arrowRef, floatingStyle, arrowStyle } = useFloatingPopup({
  visible: visibleComputed,
  placement: computed(() => props.placement),
  offset: computed(() => ({ x: 0, y: 8 })),
  showArrow: true
})
const transformOrigin = computed(() =>
  resolvePopupTransformOrigin(props.placement, arrowStyle.value, { showArrow: true, arrowSize: 8 })
)
const rootClass = computed(() =>
  cn('fixed z-1000 rounded-sm bg-grey-1000 px-2 py-[7px] text-12/[1.5] text-grey-100 shadow-small', props.class)
)
const arrowClass = 'absolute size-2 rotate-45 pointer-events-none bg-grey-1000'
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

function updateVisible(visible: boolean) {
  if (props.disabled && visible) return
  if (visible === visibleComputed.value) return
  emit('update:visible', visible)
  internalVisibleRef.value = visible
}

function setTriggerRef(target: Element | { $el?: Element } | null) {
  const el = resolvePopupTriggerElement(target)
  referenceRef.value = el
  popup.triggerEl.value = el
}

function setContentRef(target: Element | { $el?: Element } | null) {
  const el = resolvePopupTriggerElement(target)
  floatingRef.value = el
  popup.contentEl.value = el
}

const openTimerRef = ref<number | null>(null)
const closeTimerRef = ref<number | null>(null)

function clearTimer(timerRef: typeof openTimerRef) {
  if (timerRef.value == null) return
  window.clearTimeout(timerRef.value)
  timerRef.value = null
}

function scheduleOpen() {
  if (props.disabled) {
    clearTimer(openTimerRef)
    clearTimer(closeTimerRef)
    updateVisible(false)
    return
  }
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

defineExpose({ triggerEl: referenceRef })

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
        <div ref="arrowRef" :class="arrowClass" :style="arrowInlineStyle"></div>
        <slot></slot>
      </div>
    </Transition>
  </Teleport>
</template>
