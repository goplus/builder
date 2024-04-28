<template>
  <NPopover
    class="ui-dropdown-content"
    :placement="placement"
    :trigger="trigger"
    :show="visible"
    :x="pos?.x"
    :y="pos?.y"
    :to="attachTo"
    :show-arrow="false"
    :style="{ marginTop: offset.y + 'px', marginLeft: offset.x + 'px' }"
    raw
  >
    <template #trigger>
      <slot name="trigger"></slot>
    </template>
    <slot></slot>
  </NPopover>
</template>

<script setup lang="ts">
import { NPopover } from 'naive-ui'
import { usePopupContainer } from './utils'

export type Placement = 'bottom' | 'bottom-start' | 'bottom-end'
export type Trigger = 'click' | 'hover' | 'manual'
export type Pos = {
  x: number
  y: number
}

withDefaults(
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
    offset: () =>({ x: 0, y: 8 })
  }
)

const attachTo = usePopupContainer()
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
