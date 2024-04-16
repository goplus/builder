<template>
  <NPopover
    class="ui-dropdown-content"
    trigger="hover"
    raw
    :to="attachTo"
    :show-arrow="false"
    :placement="placement"
  >
    <template #trigger>
      <slot name="trigger"></slot>
    </template>
    <slot></slot>
  </NPopover>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NPopover } from 'naive-ui'

export type Placement = 'bottom' | 'bottom-start' | 'bottom-end'

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
    placement: 'bottom'
  }
)
</script>

<style lang="scss" scoped></style>

<style lang="scss">
/*
  Now the style is broken with scoped <style>, the `data-v-xxx` is not correctly applied on `NPopover` element
  TODO: use scoped style
*/
.ui-dropdown-content {
  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-100);
  box-shadow: var(--ui-box-shadow-big);
}
</style>
