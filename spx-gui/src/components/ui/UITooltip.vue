<template>
  <NTooltip
    class="ui-tooltip"
    trigger="hover"
    :to="attachTo"
    :placement="placement"
    :show="visible"
    @update:show="(v) => emit('update:visible', v)"
  >
    <template #trigger>
      <slot name="trigger"></slot>
    </template>
    <slot></slot>
  </NTooltip>
</template>

<script setup lang="ts">
import { NTooltip } from 'naive-ui'

import { usePopupContainer } from './utils'

export type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end' | 'right'

// Use defineOptions to add the __popover__ flag to the component instance.
// In the Naive UI source code (see: https://github.com/tusen-ai/naive-ui/blob/e5323d1dae0ca75b7100296df9695bf78cd81303/src/popover/src/Popover.tsx#L509),
// the framework also sets `__popover__ = true` internally to mark a component as a Popover-related component.
// This allows other logic (such as Tooltip, Dropdown, etc.) to check whether __popover__ exists on the instance
// in order to handle nesting and trigger behaviors correctly.
defineOptions({
  __popover__: true
})

withDefaults(
  defineProps<{
    placement?: Placement
    visible?: boolean
  }>(),
  {
    placement: 'top',
    visible: undefined
  }
)

const emit = defineEmits<{
  'update:visible': [boolean]
}>()

const attachTo = usePopupContainer()
</script>

<style lang="scss" scoped></style>

<style lang="scss">
/*
  Now the style is broken with scoped <style>, the `data-v-xxx` is not correctly applied on `NTooltip` element
  TODO: use scoped style
*/
.ui-tooltip {
  font-size: 12px; // TODO: some text-size related var?
  line-height: 1.5;
}
</style>
