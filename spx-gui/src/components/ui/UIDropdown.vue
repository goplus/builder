<template>
  <NPopover
    ref="nPopoverRef"
    class="ui-dropdown-content"
    :placement="placement"
    :trigger="trigger"
    :show="visible"
    :x="pos?.x"
    :y="pos?.y"
    :to="attachTo"
    :show-arrow="false"
    :style="extraStyle"
    raw
    @update:show="handleUpdateShow"
    @clickoutside="handleClickOutside"
  >
    <template #trigger>
      <slot name="trigger"></slot>
    </template>
    <slot></slot>
  </NPopover>
</template>

<script lang="ts">
export type DropdownCtrl = {
  setVisible(visible: boolean): void
}
const dropdownCtrlKey: InjectionKey<DropdownCtrl> = Symbol('dropdown-ctrl')
export function useDropdown() {
  return inject(dropdownCtrlKey)
}
</script>

<script setup lang="ts">
import { inject, provide, ref, type InjectionKey, computed, type CSSProperties, watchEffect } from 'vue'
import { NPopover } from 'naive-ui'
import { usePopupContainer } from './utils'

export type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'
export type Trigger = 'click' | 'hover' | 'manual'
export type Pos = {
  x: number
  y: number
}

const props = withDefaults(
  defineProps<{
    placement?: Placement
    trigger?: Trigger
    visible?: boolean
    pos?: Pos
    offset?: Pos
  }>(),
  {
    placement: 'bottom',
    trigger: 'hover',
    visible: undefined,
    pos: undefined,
    offset: () => ({ x: 0, y: 8 })
  }
)

const emit = defineEmits<{
  'update:visible': [boolean]
  clickOutside: [MouseEvent]
}>()

const attachTo = usePopupContainer()

const nPopoverRef = ref<InstanceType<typeof NPopover>>()

const extraStyle = computed(() => {
  const { placement, offset } = props
  const style: CSSProperties = {}
  if (['top', 'top-start', 'top-end'].includes(placement)) {
    style.marginBottom = offset.y + 'px'
  } else {
    style.marginTop = offset.y + 'px'
  }
  if (['top-end', 'bottom-end'].includes(placement)) {
    style.marginRight = -offset.x + 'px'
  } else {
    style.marginLeft = offset.x + 'px'
  }
  return style
})

function handleUpdateShow(show: boolean) {
  emit('update:visible', show)
}

function setVisible(visible: boolean) {
  // `NPopover.setShow` sets show status in uncontrolled mode without triggering the `on-update:show` callback.
  // So we need to manually trigger the `on-update:show` callback.
  nPopoverRef.value?.setShow(visible)
  handleUpdateShow(visible)
}

function handleClickOutside(e: MouseEvent) {
  const triggerEl = nPopoverRef.value?.binderInstRef?.targetRef
  // naive-ui triggers `clickoutside` event when trigger-element clicked, so we need to fix it
  if (triggerEl != null && triggerEl.contains(e.target as Node)) return
  emit('clickOutside', e)
}

watchEffect((onCleanup) => {
  // Currently, pressing the `Escape` key closes all modals and dropdowns.
  // TODO: Ideally, only the topmost modal or dropdown should be closed.
  function handleDocumentKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') setVisible(false)
  }
  window.addEventListener('keydown', handleDocumentKeydown)
  onCleanup(() => {
    window.removeEventListener('keydown', handleDocumentKeydown)
  })
})

provide(dropdownCtrlKey, { setVisible })
</script>

<style lang="scss" scoped></style>

<style lang="scss">
/*
  Now the style is broken with scoped <style>, the `data-v-xxx` is not correctly applied on `NPopover` element
  TODO: use scoped style
*/
.ui-dropdown-content {
  overflow: hidden;
  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-big);
}
</style>
