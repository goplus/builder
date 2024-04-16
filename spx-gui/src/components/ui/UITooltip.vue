<template>
  <NTooltip class="ui-tooltip" trigger="hover" :to="attachTo" :placement="placement">
    <template #trigger>
      <slot name="trigger"></slot>
    </template>
    <slot></slot>
  </NTooltip>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NTooltip } from 'naive-ui'

export type Placement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end'

const attachTo = ref<HTMLElement>()
onMounted(() => {
  // TODO:
  // 1. use Provide & inject to pass element
  // 2. use some PopupContainerProvider instead of ConfigProvider to provide element
  attachTo.value = document.getElementsByClassName('ui-config-provider')[0] as HTMLElement
})

withDefaults(
  defineProps<{
    placement?: Placement
  }>(),
  {
    placement: 'top'
  }
)
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
