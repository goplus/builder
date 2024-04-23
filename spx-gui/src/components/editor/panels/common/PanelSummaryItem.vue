<!-- Summary item (sprite / sound / more) on panel -->

<template>
  <li class="summary-item">
    <slot></slot>
  </li>
</template>

<script lang="ts">
// Currently summary item size is fixed, so we define it as constant
export const size = { width: 56, height: 56 } // px
</script>

<script setup lang="ts">
// Empty `defineEmits` to avoid empty `<script setup>`, which causes build error:
// ```
// "default" is not exported by "src/components/editor/panels/common/PanelSummaryItem.vue?vue&type=script&lang.ts",
// imported by "src/components/editor/panels/common/PanelSummaryItem.vue".
// ```
defineEmits<{}>()
</script>

<style lang="scss" scoped>
.summary-item {
  display: flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: var(--ui-border-radius-1);
  background-color: var(--ui-color-grey-300);
}
</style>
