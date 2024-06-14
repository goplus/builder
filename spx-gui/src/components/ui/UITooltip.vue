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

export type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'

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
